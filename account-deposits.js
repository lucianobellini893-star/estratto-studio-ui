/* Parse the copied CRM deposit history; never infer portfolios from deposits. */
(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./account-core.js'):root.EstrattoAccount,typeof module==='object'&&module.exports?require('./account-assets.js'):root.EstrattoAssets);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.EstrattoDeposits=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(core,catalog){
  'use strict';
  const normalize=value=>String(value||'').trim().toLowerCase().replace(/[\s_-]+/g,' ');
  const approved=new Set(['approved','completed','complete','success','successful','paid','processed','confirmed','executed']);
  const inactive=new Set(['pending','pending approve','pending approval','awaiting approval','new','created','in progress','processing','awaiting','waiting','rejected','declined','canceled','cancelled','failed','expired']);
  const knownStatus=value=>approved.has(normalize(value))||inactive.has(normalize(value));
  const currency=value=>{
    const text=String(value||'').trim(),item=catalog.findByName('all',text)||catalog.findBySymbol('all',text);
    return item?item.symbol:/^[A-Z]{3,10}$/.test(text)?text:null;
  };
  const header=value=>String(value).trim().toLowerCase().replace(/[^a-z0-9]/g,'');
  const statusCode=value=>approved.has(normalize(value))?'approved':['rejected','declined'].includes(normalize(value))?'rejected':['cancelled','canceled','expired'].includes(normalize(value))?'cancelled':normalize(value)==='failed'?'failed':'pending';
  const methodNames={ 'bank account':'Bonifico bancario','bank transfer':'Bonifico bancario','wire transfer':'Bonifico bancario','bank card':'Carta bancaria','credit card':'Carta di credito','debit card':'Carta di debito','crypto':'Trasferimento di criptoattività','cryptocurrency':'Trasferimento di criptoattività','cash':'Contanti','manual':'Operazione manuale' };
  function parse(text,options={}){
    const type=options.type||'deposit';
    if(!['deposit','withdrawal'].includes(type))throw new Error('Выберите пополнения или выводы.');
    if(String(text).length>1000000)throw new Error('Вставьте отчёт размером до 1 МБ.');
    const lines=String(text||'').replace(/&(?:nbsp|#160|#x0*a0|#32|#x0*20);/gi,' ').replace(/[\uFEFF\u200B\u200C\u200D]/g,'').replace(/\r/g,'').split('\n').map(line=>line.trim()).filter(Boolean);
    if(!lines.length)throw new Error('Вставьте историю депозитов вместе с заголовками.');
    const records=[];
    const tabHeader=lines.findIndex(line=>line.includes('\t')&&line.split('\t').map(header).includes('destcurrency')&&line.split('\t').map(header).includes('created'));
    const tableColumns=tabHeader>=0?lines[tabHeader].split('\t').map(header):[];
    const structured=tabHeader>=0&&lines.slice(tabHeader+1).every(line=>{
      const cells=line.split('\t');
      if(cells.length===tableColumns.length+1&&/^(sd|edit|view)$/i.test(cells[1]))cells.splice(1,1);
      return /^\d+$/.test(cells[tableColumns.indexOf('id')]||'')&&/^\d{4}-\d{2}-\d{2}[ T]/.test(cells[tableColumns.indexOf('created')]||'');
    });
    if(structured){
      const columns=lines[tabHeader].split('\t').map(header),idx=key=>columns.indexOf(key);
      for(const key of ['id','destcurrency','destamount','orderstatus','tradingusers','created'])if(idx(key)<0)throw new Error('Не найдена колонка '+key+'.');
      for(const line of lines.slice(tabHeader+1)){
        const cells=line.split('\t');
        if(cells.length===columns.length+1&&/^(sd|edit|view)$/i.test(cells[1]))cells.splice(1,1);
        const get=key=>idx(key)<0?'':String(cells[idx(key)]||'').trim();
        records.push({id:get('id'),unit:get('destcurrency'),amount:get('destamount'),method:get('ordermethod'),status:get('orderstatus'),client:get('tradingusers'),created:get('created')});
      }
    } else {
      const flat=lines.flatMap(line=>line.split('\t')).map(line=>line.trim()).filter(Boolean);
      lines.splice(0,lines.length,...flat);
      const starts=[];
      const action=value=>/^(sd|edit|view)$/i.test(value||'');
      const currencyIndex=start=>action(lines[start+1])?start+2:start+1;
      for(let i=0;i<lines.length-2;i++)if(/^\d+$/.test(lines[i])){
        if(starts.length&&i===currencyIndex(starts[starts.length-1])+1)continue;
        const next=lines[i+1];
        let followedByAmount=false;try{core.decimal(lines[i+2]);followedByAmount=true;}catch(_){}
        const known=catalog.findByName('all',next)||catalog.findBySymbol('all',next);
        const method=/bank|card|wire|transfer|payment|wallet|manual|cash/i.test(next);
        if(action(next)||known||(!method&&followedByAmount))starts.push(i);
      }
      if(!starts.length)throw new Error('Не найдены строки депозитов. Нужны ID, валюта, сумма, статус, клиент и Created.');
      starts.forEach((start,index)=>{
        const end=starts[index+1]??lines.length,unitAt=currencyIndex(start);
        const createdAt=lines.findIndex((line,i)=>i>unitAt+1&&i<end&&/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(line));
        if(createdAt<0)throw new Error(`ID ${lines[start]}: не найдена дата Created.`);
        const statusAt=lines.findIndex((line,i)=>i>unitAt+1&&i<createdAt&&knownStatus(line));
        if(statusAt<0)throw new Error(`ID ${lines[start]}: не найден известный статус Order status. Запись не импортирована.`);
        const clientLines=lines.slice(statusAt+1,createdAt);
        records.push({id:lines[start],unit:lines[unitAt],amount:lines[unitAt+1],method:lines.slice(unitAt+2,statusAt).find(value=>methodNames[normalize(value)])||'',status:lines[statusAt],client:clientLines.length>1?clientLines.slice(0,-1).join(' '):clientLines[0]||'',created:lines[createdAt]});
      });
    }
    const transactions=[],skipped=[],seen=new Map(),clients=new Map(),totals=new Map(),statusCounts={approved:0,pending:0,failed:0,rejected:0,cancelled:0};
    for(const row of records){
      if(!/^\d+$/.test(row.id))throw new Error('В одной из записей отсутствует корректный ID.');
      if(!knownStatus(row.status))throw new Error(`ID ${row.id}: неизвестный статус «${row.status}».`);
      const status=statusCode(row.status);
      const unit=currency(row.unit);if(!unit)throw new Error(`ID ${row.id}: неизвестная валюта «${row.unit}».`);
      const parsed=core.decimal(row.amount,'ID '+row.id+', сумма');
      if(!core.toMoney(parsed)||(type==='deposit'&&parsed.units<0n))throw new Error(`ID ${row.id}: сумма ${type==='deposit'?'депозита должна быть положительной':'вывода не может быть нулевой'}.`);
      const magnitude={...parsed,units:parsed.units<0n?-parsed.units:parsed.units};
      const unsigned=parsed.text.replace(/^-/,'');
      const amount=type==='withdrawal'?'-'+unsigned:unsigned;
      const stamp=row.created.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/);
      if(!stamp||!core.validDate(stamp[1])||Number(stamp[2])>23||Number(stamp[3])>59||Number(stamp[4]||0)>59)throw new Error(`ID ${row.id}: некорректная дата Created.`);
      const client=String(row.client||'').trim();if(!client||client.length>80)throw new Error(`ID ${row.id}: проверьте имя Trading users.`);
      const amountKey=amount.replace(/(\.\d*?)0+$/,'$1').replace(/\.$/,'');
      const signature=[stamp[1],unit,amountKey,normalize(client),status,type].join('|');
      if(seen.has(row.id)){
        if(seen.get(row.id)!==signature)throw new Error(`ID ${row.id} повторяется с разными данными. Проверьте отчёт.`);
        skipped.push({id:row.id,reason:'duplicate'});continue;
      }
      seen.set(row.id,signature);clients.set(normalize(client),client);
      transactions.push({date:stamp[1],type,amount,currency:unit,description:methodNames[normalize(row.method)]||'',reference:row.id,status,sourceReference:row.id,source:type==='deposit'?'crm-deposit':'crm-withdrawal',sourceClient:client,sourceCreated:row.created});
      statusCounts[status]++;
      if(status==='approved')totals.set(unit,(totals.get(unit)||0n)+core.toMoney(magnitude));
    }
    if(clients.size>1)throw new Error('В отчёте несколько клиентов. Скопируйте историю одного клиента.');
    return {clientName:[...clients.values()][0]||'',transactions,skipped,totals:[...totals].map(([currency,amount])=>({currency,amount})),recognized:records.length,statusCounts,type};
  }
  function merge(existing,incoming){
    const seen=new Map(existing.map(row=>[String(row.sourceReference||row.reference||'').trim(),row]).filter(([id])=>id));
    const added=[],skipped=[],updates=new Map();
    for(const row of incoming){
      const id=String(row.sourceReference||row.reference);
      if(seen.has(id)){
        const previous=seen.get(id);
        if(String(previous.source||'').startsWith('crm-')&&previous.sourceClient&&normalize(previous.sourceClient)!==normalize(row.sourceClient))throw new Error(`ID ${id} уже есть у другого клиента.`);
        if(String(previous.source||'').startsWith('crm-')){
          const a=core.decimal(previous.amount),b=core.decimal(row.amount);
          if(previous.type!==row.type||previous.date!==row.date||String(previous.currency).toUpperCase()!==row.currency||a.units*10n**BigInt(b.scale)!==b.units*10n**BigInt(a.scale))throw new Error(`ID ${id} уже импортирован с другой датой, валютой или суммой. Проверьте запись перед заменой истории.`);
        }
        if(String(previous.source||'').startsWith('crm-')&&(previous.status||'approved')!==row.status){updates.set(previous,{...previous,status:row.status});continue;}
        skipped.push(id);continue;
      }
      added.push(row);seen.set(id,row);
    }
    if(existing.length+added.length>1000)throw new Error('В одной выписке поддерживается до 1000 операций.');
    return {transactions:[...existing.map(row=>updates.get(row)||row),...added],added:added.length,updated:updates.size,skipped:skipped.length};
  }
  return {parse,merge,normalize};
});
