/* Offline suggestions, not a price feed. Custom assets remain supported. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.EstrattoAssets=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const make=rows=>rows.map(([symbol,name,ru,aliases=''])=>({symbol,name,ru,aliases:aliases.split('|').filter(Boolean)}));
  const cash=make([
    ['EUR','Euro','Евро'],['USD','US Dollar','Доллар США','Dollar|United States Dollar|доллар'],
    ['GBP','British Pound','Британский фунт','Pound Sterling|фунт'],['CHF','Swiss Franc','Швейцарский франк','франк'],
    ['JPY','Japanese Yen','Японская иена','иена'],['CAD','Canadian Dollar','Канадский доллар'],
    ['AUD','Australian Dollar','Австралийский доллар'],['NZD','New Zealand Dollar','Новозеландский доллар'],
    ['CNY','Chinese Yuan','Китайский юань','RMB|Renminbi|юань'],['HKD','Hong Kong Dollar','Гонконгский доллар'],
    ['SGD','Singapore Dollar','Сингапурский доллар'],['SEK','Swedish Krona','Шведская крона'],
    ['NOK','Norwegian Krone','Норвежская крона'],['DKK','Danish Krone','Датская крона'],
    ['PLN','Polish Zloty','Польский злотый','злотый'],['CZK','Czech Koruna','Чешская крона'],
    ['HUF','Hungarian Forint','Венгерский форинт'],['RON','Romanian Leu','Румынский лей'],
    ['TRY','Turkish Lira','Турецкая лира'],['UAH','Ukrainian Hryvnia','Украинская гривна','гривна'],
    ['KZT','Kazakhstani Tenge','Казахстанский тенге'],['AED','UAE Dirham','Дирхам ОАЭ','Dirham'],
    ['BRL','Brazilian Real','Бразильский реал'],['MXN','Mexican Peso','Мексиканское песо'],
    ['ZAR','South African Rand','Южноафриканский рэнд'],['RUB','Russian Ruble','Российский рубль','Rouble|рубль']
  ]);
  const crypto=make([
    ['BTC','Bitcoin','Биткоин','биткойн'],['ETH','Ethereum','Эфириум','эфир|этериум'],
    ['USDT','Tether','Тезер','Tether USD|тетер'],['USDC','USD Coin','Долларовая монета','Circle'],
    ['SOL','Solana','Солана'],['BNB','BNB','БНБ','Binance Coin|бинанс'],['XRP','XRP','Рипл','Ripple'],
    ['ADA','Cardano','Кардано'],['DOGE','Dogecoin','Догикоин'],['TRX','TRON','Трон'],
    ['TON','Toncoin','Тонкоин','The Open Network'],['AVAX','Avalanche','Аваланч'],
    ['DOT','Polkadot','Полкадот'],['LINK','Chainlink','Чейнлинк'],['LTC','Litecoin','Лайткоин'],
    ['BCH','Bitcoin Cash','Биткоин Кэш'],['XLM','Stellar','Стеллар'],['ATOM','Cosmos','Космос'],
    ['UNI','Uniswap','Юнисвап'],['AAVE','Aave','Ааве'],['DAI','Dai','Даи'],['SHIB','Shiba Inu','Шиба Ину'],
    ['ETC','Ethereum Classic','Эфириум Классик'],['NEAR','NEAR Protocol','Нир'],['APT','Aptos','Аптос'],
    ['ARB','Arbitrum','Арбитрум'],['OP','Optimism','Оптимизм'],['SUI','Sui','Суи'],
    ['POL','Polygon','Полигон','MATIC'],['PEPE','Pepe','Пепе'],['XMR','Monero','Монеро']
  ]);
  const wallets=make([
    ['Spot','Spot','Спотовый кошелёк','спот'],['Margin','Margin','Маржинальный кошелёк','маржа'],
    ['Futures','Futures','Фьючерсный кошелёк','фьючерсы'],['Funding','Funding','Кошелёк пополнений'],
    ['Earn','Earn','Накопительный портфель','стейкинг'],['Trading','Trading','Торговый счёт'],
    ['Main','Main','Основной кошелёк']
  ]);
  const normalize=value=>String(value||'').trim().toLowerCase().replace(/\s+/g,' ');
  function items(group){return group==='cash'||group==='currency'?cash:group==='crypto'?crypto:group==='wallets'?wallets:[...cash,...crypto];}
  function findByName(group,value){
    const query=normalize(value);
    return query?items(group).find(item=>[item.name,item.ru,...item.aliases].some(name=>normalize(name)===query)):undefined;
  }
  function findBySymbol(group,value){return items(group).find(item=>normalize(item.symbol)===normalize(value));}
  function search(group,value){
    const query=normalize(value),tokens=query.split(' ').filter(Boolean);
    return items(group).filter(item=>tokens.every(token=>normalize([item.name,item.symbol,item.ru,...item.aliases].join(' ')).includes(token)))
      .map((item,index)=>({item,index,rank:normalize(item.symbol)===query?0:normalize(item.name)===query?1:normalize(item.symbol).startsWith(query)?2:3}))
      .sort((a,b)=>a.rank-b.rank||a.index-b.index).map(result=>result.item);
  }
  return {cash,crypto,items,search,findByName,findBySymbol};
});
