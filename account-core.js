/* Exact decimal arithmetic and validation for manually entered account statements. */
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./account-assets.js') : root.EstrattoAssets);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EstrattoAccount = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (catalog) {
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
    const fraction=String(absolute % 10000n).padStart(4,'0').replace(/0+$/,'').padEnd(2,'0');
    return (negative ? '−' : signed && units > 0n ? '+' : '') + integer + ',' + fraction;
  }
  function cashRow(row,currency){
    if(Object.prototype.hasOwnProperty.call(row,'amount'))return {...row};
    const same=String(row.symbol||'').trim().toUpperCase()===String(currency||'').trim().toUpperCase();
    let amount=row.quantity||'';
    if(same){
      try{const rate=decimal(row.price);if(rate.units<0n)throw new Error('rate');const value=productMoney(decimal(row.quantity),rate);const sign=value<0n?'-':'';const abs=value<0n?-value:value;amount=sign+String(abs/10000n)+'.'+String(abs%10000n).padStart(4,'0');}catch(_){amount='';}
    }
    return {...row,amount,price:same?'1':row.price};
  }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y,m,d] = value.split('-').map(Number), date = new Date(Date.UTC(y,m-1,d));
    return y >= 1900 && date.getUTCFullYear() === y && date.getUTCMonth() === m-1 && date.getUTCDate() === d;
  }
  function sortTransactions(rows) {
    return rows.map((row,index) => {
      const date=validDate(row.date||'')?row.date:'';
      const match=String(row.sourceCreated||'').match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d+))?/);
      const hasTime=match&&match[1]===date&&Number(match[2])<24&&Number(match[3])<60&&Number(match[4]||0)<60;
      const time=hasTime?`${match[2]}:${match[3]}:${match[4]||'00'}.${(match[5]||'').padEnd(9,'0').slice(0,9)}`:'00:00:00.000000000';
      return {row,index,key:date?date+'T'+time:''};
    }).sort((a,b)=>a.key===b.key?a.index-b.index:a.key<b.key?1:-1).map(item=>item.row);
  }
  const types = {
    deposit: 'Versamento', withdrawal: 'Prelievo', transfer: 'Trasferimento',
    fee: 'Commissione', result: 'Risultato di trading', interest: 'Interessi', adjustment: 'Rettifica', other: 'Altro'
  };
  const statuses = { approved:'Approvato', pending:'In attesa di approvazione', failed:'Non riuscito', rejected:'Rifiutato', cancelled:'Annullato' };
  function selectedTransactions(state){
    const scope=state.transactionsScope||'all';
    return (state.transactions||[]).map((row,index)=>({row,index})).filter(({row})=>scope!=='none'&&(scope==='deposits'?row.type==='deposit':scope==='withdrawals'?row.type==='withdrawal':true));
  }
  function validate(state) {
    const issues = [], assets = { cash: [], crypto: [] }, transactions = [];
    const add = (path, message) => issues.push({ path, message });
    const required = (value, label, max, path) => {
      const text = String(value || '').trim();
      if (!text) add(path, `Заполните поле «${label}».`);
      else if (text.length > max) add(path, `${label}: не более ${max} символов.`);
      return text;
    };
    if(!['all','deposits','withdrawals','none'].includes(state.transactionsScope||'all'))add('transactionsScope','Выберите состав выписки.');
    const clientName = required(state.clientName, 'Имя клиента', 80, 'clientName');
    const clientId = '';
    const accountId = String(state.accountId||''); // Retain legacy account numbers without relabelling them as public IDs.
    const publicId = required(state.publicId, 'Публичный ID клиента', 49, 'publicId');
    if(publicId.replace(/\s+/g,'').length>40)add('publicId','Публичный ID: не более 40 символов без пробелов.');
    if (!validDate(state.date || '')) add('date', 'Укажите корректную дату выписки.');
    const currency = String(state.currency || '').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) add('currency', 'Укажите трёхбуквенный код валюты, например USD или EUR.');
    for (const group of ['cash', 'crypto']) {
      (state[group] || []).forEach((row, index) => {
        const start = issues.length, path = key => `${group}.${index}.${key}`;
        const asset = required(row.asset, 'Название актива', 80, path('asset'));
        const symbol = required(row.symbol, 'Символ', 16, path('symbol')).toUpperCase();
        const wallet = required(row.wallet, 'Кошелёк / Портфель', 40, path('wallet'));
        const known = catalog.findByName(group,asset);
        if (known && symbol && symbol !== known.symbol) add(path('symbol'), `Для ${known.name} используйте символ ${known.symbol}. Выберите актив из списка.`);
        if (!known && symbol && catalog.findBySymbol(group==='cash'?'crypto':'cash',symbol)) add(path('symbol'), group==='cash'?'Криптовалюту добавьте в раздел «Криптоактивы».':'Денежную валюту добавьте в раздел «Денежные средства».');
        const simpleCash=group==='cash'&&Object.prototype.hasOwnProperty.call(row,'amount');
        const sameCurrency=symbol===currency;
        let quantity, price;
        try { quantity = decimal(simpleCash?row.amount:row.quantity, simpleCash?'Остаток':'Количество'); } catch (e) { add(path(simpleCash?'amount':'quantity'), e.message); }
        try {
          price = decimal(simpleCash&&sameCurrency?'1':row.price, simpleCash?'Курс':'Цена');
          if (price.units < 0n) add(path('price'), 'Цена не может быть отрицательной.');
        } catch (e) { add(path('price'), e.message); }
        if (issues.length === start) assets[group].push({ asset, symbol, wallet, quantity:quantity.text, amount:quantity.text, price:price.text, value:productMoney(quantity,price) });
      });
    }
    if (!(state.cash || []).length && !(state.crypto || []).length && !selectedTransactions(state).length) {
      add('assets', 'Добавьте остаток счёта или операции выбранного типа. Для нулевого остатка укажите 0.');
    }
    const references = new Map();
    selectedTransactions(state).forEach(({row,index}) => {
      const start = issues.length, path = key => `transactions.${index}.${key}`;
      if(row.sourceClient && clientName && String(row.sourceClient).trim().toLowerCase().replace(/\s+/g,' ')!==clientName.toLowerCase().replace(/\s+/g,' ') && !issues.some(issue=>issue.path==='clientName'))add('clientName', `Депозит ${row.sourceReference||row.reference||index+1} принадлежит клиенту ${row.sourceClient}. Проверьте имя клиента и состав операций.`);
      if (!validDate(row.date || '')) add(path('date'), 'Укажите корректную дату операции.');
      else if (validDate(state.date || '') && row.date > state.date) add(path('date'), 'Дата операции позже даты выписки.');
      if (!types[row.type]) add(path('type'), 'Выберите тип операции.');
      const status=row.status||'approved';
      if(!statuses[status])add(path('status'),'Выберите статус операции.');
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
      if (issues.length === start) transactions.push({ date:row.date, type:row.type, description, amount, currency:unit, reference, status, sourceCreated:row.sourceCreated||'' });
    });
    const total = group => assets[group].reduce((sum,row) => sum+row.value,0n);
    return { errors:issues.map(issue => issue.message), issues, clientName, clientId, accountId, publicId, date:state.date, currency, transactionsScope:state.transactionsScope||'all', ...assets, transactions:sortTransactions(transactions),
      cashTotal:total('cash'), cryptoTotal:total('crypto'), total:(state.cash||[]).length+(state.crypto||[]).length?total('cash')+total('crypto'):null };
  }
  // Preview incomplete forms without treating unknown numbers as zero.
  // Missing or invalid numbers remain unknown, rather than becoming zero.
  function preview(state) {
    const model = validate(state);
    if (!model.errors.length) return { ...model, draft: false };
    const text = (value, max = 80) => String(value || '').trim().slice(0, max) || '—';
    const asset = (row,group) => {
      const simpleCash=group==='cash'&&Object.prototype.hasOwnProperty.call(row,'amount');
      let quantity, price, value = null;
      try { quantity = decimal(simpleCash?row.amount:row.quantity); } catch (_) {}
      try { price = decimal(simpleCash&&String(row.symbol||'').trim().toUpperCase()===model.currency?'1':row.price); if (price.units < 0n) price = undefined; } catch (_) {}
      if (quantity && price) value = productMoney(quantity, price);
      return { asset:text(row.asset), symbol:text(row.symbol,16), wallet:text(row.wallet,40),
        quantity:quantity ? quantity.text : '—', amount:quantity ? quantity.text : '—', price:price ? price.text : '—', value };
    };
    const cash = (state.cash || []).map(row=>asset(row,'cash')), crypto = (state.crypto || []).map(row=>asset(row,'crypto'));
    const sum = rows => rows.some(row => row.value === null) ? null : rows.reduce((total,row) => total + row.value,0n);
    const cashTotal = cash.length || crypto.length ? sum(cash) : null, cryptoTotal = cash.length || crypto.length ? sum(crypto) : null;
    const total = !cash.length && !crypto.length || cashTotal === null || cryptoTotal === null ? null : cashTotal + cryptoTotal;
    const transactions = selectedTransactions(state).map(({row}) => {
      let amount = null;
      try { amount = toMoney(decimal(row.amount)); } catch (_) {}
      return { date:validDate(row.date || '') ? row.date : '', type:row.type, description:text(row.description,300),
        amount, currency:text(row.currency,10).toUpperCase(), reference:text(row.reference,80), status:row.status||'approved',sourceCreated:row.sourceCreated||'' };
    });
    return { ...model, cash, crypto, transactions:sortTransactions(transactions), cashTotal, cryptoTotal, total, draft:true };
  }
  return { selectedTransactions, cashRow, decimal, toMoney, productMoney, money, validDate, validate, preview, sortTransactions, types, statuses };
});
