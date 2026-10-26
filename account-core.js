/* Exact decimal arithmetic and validation for manually entered account statements. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EstrattoAccount = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const pow = n => 10n ** BigInt(n);
  function decimal(value, label = 'Число') {
    let text = String(value ?? '').trim().replace(/[\s\u00a0]/g, '').replace(/−/g, '-');
    if (text.includes(',') && text.includes('.')) {
      const english = text.lastIndexOf('.') > text.lastIndexOf(',');
      const grouped = english ? /^[+-]?\d{1,3}(?:,\d{3})+\.\d+$/ : /^[+-]?\d{1,3}(?:\.\d{3})+,\d+$/;
      if (!grouped.test(text)) throw new Error(`${label}: проверьте разделители тысяч и десятичную часть.`);
      text = english ? text.replace(/,/g, '') : text.replace(/\./g, '').replace(',', '.');
    } else text = text.replace(',', '.');
    if (!/^[+-]?\d+(?:\.\d{1,10})?$/.test(text)) throw new Error(`${label}: введите число, до 10 знаков после запятой.`);
    const negative = text.startsWith('-');
    const [integer, fraction = ''] = text.replace(/^[+-]/, '').split('.');
    if (integer.length > 14) throw new Error(`${label}: слишком большое число.`);
    const units = BigInt(integer + fraction) * (negative ? -1n : 1n);
    return { units, scale: fraction.length, text: (negative ? '-' : '') + String(BigInt(integer)) + (fraction ? '.' + fraction : '') };
  }
  function rounded(units, divisor) {
    const sign = units < 0n ? -1n : 1n, magnitude = units < 0n ? -units : units;
    return sign * ((magnitude + divisor / 2n) / divisor);
  }
  function toMoney(value) {
    return value.scale <= 4 ? value.units * pow(4 - value.scale) : rounded(value.units, pow(value.scale - 4));
  }
  function productMoney(quantity, price) {
    const units = quantity.units * price.units, scale = quantity.scale + price.scale;
    return scale <= 4 ? units * pow(4 - scale) : rounded(units, pow(scale - 4));
  }
  function money(units, signed = false) {
    const negative = units < 0n, absolute = negative ? -units : units;
    const integer = String(absolute / 10000n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (negative ? '−' : signed && units > 0n ? '+' : '') + integer + ',' + String(absolute % 10000n).padStart(4, '0');
  }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y,m,d] = value.split('-').map(Number), date = new Date(Date.UTC(y,m-1,d));
    return y >= 1900 && date.getUTCFullYear() === y && date.getUTCMonth() === m-1 && date.getUTCDate() === d;
  }
  const types = {
    deposit: 'Versamento', withdrawal: 'Prelievo', transfer: 'Trasferimento',
    fee: 'Commissione', result: 'Risultato di trading', interest: 'Interessi', adjustment: 'Rettifica', other: 'Altro'
  };
  function validate(state) {
    const issues = [], assets = { cash: [], crypto: [] }, transactions = [];
    const add = (path, message) => issues.push({ path, message });
    const required = (value, label, max, path) => {
      const text = String(value || '').trim();
      if (!text) add(path, `Заполните поле «${label}».`);
      else if (text.length > max) add(path, `${label}: не более ${max} символов.`);
      return text;
    };
    const clientName = required(state.clientName, 'Имя клиента', 80, 'clientName');
    const clientId = '';
    const accountId = required(state.accountId, 'Номер торгового счёта', 40, 'accountId');
    if (!validDate(state.date || '')) add('date', 'Укажите корректную дату выписки.');
    const currency = String(state.currency || '').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) add('currency', 'Укажите трёхбуквенный код валюты, например USD или EUR.');
    for (const group of ['cash', 'crypto']) {
      (state[group] || []).forEach((row, index) => {
        const start = issues.length, path = key => `${group}.${index}.${key}`;
        const asset = required(row.asset, 'Название актива', 80, path('asset'));
        const symbol = required(row.symbol, 'Символ', 16, path('symbol')).toUpperCase();
        const wallet = required(row.wallet, 'Кошелёк / Портфель', 40, path('wallet'));
        let quantity, price;
        try { quantity = decimal(row.quantity, 'Количество'); } catch (e) { add(path('quantity'), e.message); }
        try {
          price = decimal(row.price, 'Цена');
          if (price.units < 0n) add(path('price'), 'Цена не может быть отрицательной.');
        } catch (e) { add(path('price'), e.message); }
        if (issues.length === start) assets[group].push({ asset, symbol, wallet, quantity:quantity.text, price:price.text, value:productMoney(quantity,price) });
      });
    }
    if (!(state.cash || []).length && !(state.crypto || []).length) {
      add('assets', 'Добавьте денежный остаток или криптоактив. Для нулевого счёта укажите количество 0.');
    }
    const references = new Map();
    (state.transactions || []).forEach((row, index) => {
      const start = issues.length, path = key => `transactions.${index}.${key}`;
      if (!validDate(row.date || '')) add(path('date'), 'Укажите корректную дату операции.');
      else if (validDate(state.date || '') && row.date > state.date) add(path('date'), 'Дата операции позже даты выписки.');
      if (!types[row.type]) add(path('type'), 'Выберите тип операции.');
      let amount;
      try {
        amount = toMoney(decimal(row.amount, 'Сумма'));
        if (!amount) add(path('amount'), 'Сумма после округления до 4 знаков не может быть нулевой.');
        else if (row.type === 'deposit' && amount < 0n) add(path('amount'), 'Пополнение должно иметь положительную сумму.');
        else if (['withdrawal','fee'].includes(row.type) && amount > 0n) add(path('amount'), 'Для вывода или комиссии укажите сумму со знаком минус.');
      } catch (e) { add(path('amount'), e.message); }
      const unit = String(row.currency || '').trim().toUpperCase();
      if (!/^[A-Z]{3,10}$/.test(unit)) add(path('currency'), 'Укажите валюту операции, например USD, EUR или USDT.');
      const description = String(row.description || '').trim(), reference = String(row.reference || '').trim();
      if (description.length > 300) add(path('description'), 'Описание: не более 300 символов.');
      if (reference.length > 80) add(path('reference'), 'ID: не более 80 символов.');
      if (reference && references.has(reference)) {
        const message = `ID «${reference}» уже используется в другой операции.`;
        add(path('reference'), message);
        const first = `transactions.${references.get(reference)}.reference`;
        if (!issues.some(issue => issue.path === first)) add(first, message);
      } else if (reference) references.set(reference,index);
      if (issues.length === start) transactions.push({ date:row.date, type:row.type, description, amount, currency:unit, reference });
    });
    const total = group => assets[group].reduce((sum,row) => sum+row.value,0n);
    return { errors:issues.map(issue => issue.message), issues, clientName, clientId, accountId, date:state.date, currency, ...assets, transactions,
      cashTotal:total('cash'), cryptoTotal:total('crypto'), total:total('cash')+total('crypto') };
  }
  // Preview incomplete forms without treating unknown numbers as zero.
  // Missing or invalid numbers remain unknown, rather than becoming zero.
  function preview(state) {
    const model = validate(state);
    if (!model.errors.length) return { ...model, draft: false };
    const text = (value, max = 80) => String(value || '').trim().slice(0, max) || '—';
    const asset = row => {
      let quantity, price, value = null;
      try { quantity = decimal(row.quantity); } catch (_) {}
      try { price = decimal(row.price); if (price.units < 0n) price = undefined; } catch (_) {}
      if (quantity && price) value = productMoney(quantity, price);
      return { asset:text(row.asset), symbol:text(row.symbol,16), wallet:text(row.wallet,40),
        quantity:quantity ? quantity.text : '—', price:price ? price.text : '—', value };
    };
    const cash = (state.cash || []).map(asset), crypto = (state.crypto || []).map(asset);
    const sum = rows => rows.some(row => row.value === null) ? null : rows.reduce((total,row) => total + row.value,0n);
    const cashTotal = cash.length || crypto.length ? sum(cash) : null, cryptoTotal = cash.length || crypto.length ? sum(crypto) : null;
    const total = !cash.length && !crypto.length || cashTotal === null || cryptoTotal === null ? null : cashTotal + cryptoTotal;
    const transactions = (state.transactions || []).map(row => {
      let amount = null;
      try { amount = toMoney(decimal(row.amount)); } catch (_) {}
      return { date:validDate(row.date || '') ? row.date : '', type:row.type, description:text(row.description,300),
        amount, currency:text(row.currency,10).toUpperCase(), reference:text(row.reference,80) };
    });
    return { ...model, cash, crypto, transactions, cashTotal, cryptoTotal, total, draft:true };
  }
  return { decimal, toMoney, productMoney, money, validDate, validate, preview, types };
});
