/* Identity inventory for PDF files provided by the operator.
 * Only company-owned facts should be replaced automatically. Independent
 * regulators, custodians and redress schemes require lawyer review. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EstrattoSourceIdentities=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const KNOWN=[
  ['Interactive Brokers (U.K.) Limited','Сторона договора — британская компания','companyName','company'],
  ['Interactive Brokers LLC','Отдельная американская сторона договора','', 'counterparty'],
  ['Interactive Brokers Group, Inc.','Группа компаний','', 'counterparty'],
  ['IBUK','Сокращение британской компании','companyAbbreviation','alias'],
  ['IBLLC','Сокращение американской компании','', 'counterparty'],
  ['IBKR Group','Название группы компаний','', 'counterparty'],
  ['IBKR System','Название торговой системы','', 'brand'],
  ['IBUK Website','Сайт британской компании (упоминание)','', 'brand'],
  ['IBKR Desktop','Название платформы','', 'brand'],
  ['IBKR Mobile','Название платформы','', 'brand'],
  ['IBKR GlobalTrader','Название платформы','', 'brand'],
  ['IBKR Trader Workstation','Название платформы','', 'brand'],
  ['Client Portal','Название клиентского кабинета','', 'brand'],
  ['Financial Conduct Authority','Независимый британский регулятор; юридическая проверка','', 'external'],
  ['Financial Ombudsman Service','Независимый британский финансовый омбудсмен','', 'external'],
  ['Securities Investor Protection Corporation','Американская система защиты инвесторов (не переносить автоматически)','', 'external'],
  ['U.S. Securities Exchange Commission','Американский регулятор','', 'external'],
  ['U.S. Commodity Futures Trading Commission','Американский регулятор','', 'external'],
  ['Global Financial Information Service','Отдельная компания / сервис','', 'counterparty'],
  ['GFIS','Связанное лицо / поставщик информационных услуг','', 'counterparty'],
  ['IBKR','Бренд IBKR','', 'brand'],
  ['Interactive Brokers','Краткое название / бренд','', 'brand'],
  ['12th Floor, 20 Fenchurch Street, London, EC3M 3BY','Юридический адрес британской компании','companyAddress','address'],
  ['Floor 12, 20 Fenchurch Street, London EC3M 3BY','Почтовый адрес компании','companyAddress','address'],
  ['One Pickwick Plaza, Greenwich, CT 06830','Адрес американской компании','', 'counterparty'],
  ['208159','Регистрационный номер FCA (принадлежит IBUK)','authorization','license'],
  ['ibukcomplaints@interactivebrokers.co.uk','Почта для жалоб IBUK','complaintsEmail','email'],
  ['dpo@ibkr.com','Контакт по защите данных','', 'email'],
  ['estateprocessing@interactivebrokers.com','Контакт по наследственным вопросам','', 'email'],
  ['www.ibkr.co.uk/support','Адрес службы поддержки IBUK','companySupportUrl','website'],
  ['www.ibkr.co.uk','Публичный сайт IBUK','companyWebsite','website']
 ];
 const normalize=s=>String(s||'').normalize('NFKC').replace(/[\u00a0\u2007\u202f]/g,' ').replace(/\s+/g,' ').trim();
 function occurrences(haystack,needle){
  const s=normalize(haystack).toLowerCase(),n=normalize(needle).toLowerCase();
  if(!n)return 0;
  let at=0,count=0,idx;
  while((idx=s.indexOf(n,at))!==-1){
   const l=idx>0?s[idx-1]:'',r=s[idx+n.length]||'';
   const wordStart=/^[a-z0-9]/i.test(n[0]),wordEnd=/[a-z0-9]$/i.test(n);
   if((!wordStart||!/[a-z0-9]/i.test(l))&&(!wordEnd||!/[a-z0-9]/i.test(r)))count++;
   at=idx+n.length;
  }
  return count;
 }
 function unique(values){return [...new Set(values.map(s=>normalize(s)).filter(Boolean))];}
 function scan(pages){
  const text=pages.join(' ');
  const results=[];
  for(const [original,description,field,kind] of KNOWN){
   const count=occurrences(text,original);
   if(count)results.push({original,description,field,kind,count});
  }
  const emails=unique(text.match(/[\w.+%-]+@[\w.-]+\.[A-Z]{2,}/gi)||[]);
  const urls=unique(text.match(/(?:https?:\/\/|www\.)[^\s<>"()\[\]{}]+/gi)||[])
   .map(s=>s.replace(/[.,;]+$/,'')).filter(s=>s.length>8);
  for(const [kind,values] of [['email',emails],['website',urls]]){
   for(const original of values){
    if(results.some(x=>x.original.toLowerCase()===original.toLowerCase()))continue;
    const count=occurrences(text,original);
    if(!count)continue;
    const external=/(?:ombudsman|sipc\.org|fscs\.org|finra\.org|jamsadr|adr\.org|icdr\.org|lcia\.org)/i.test(original);
    results.push({original,description:external?'Сторонняя организация: не заменять без юридической проверки':kind==='email'?'Email в тексте документа':'Ссылка из документа',field:'',kind:external?'external':kind,count});
   }
  }
  const weights={company:0,alias:1,counterparty:2,address:3,license:4,email:5,website:6,brand:7,external:8};
  results.sort((a,b)=>(weights[a.kind]??9)-(weights[b.kind]??9)||b.count-a.count);
  return results;
 }
 return {scan,occurrences,normalize};
});