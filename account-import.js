/* Separate CRM sources become one chronological transaction history. */
(() => {
  'use strict';
  const parser=window.EstrattoDeposits,form=window.EstrattoAccountForm,core=window.EstrattoAccount;
  const $=id=>document.getElementById(id);
  const sources=[{id:'ac-deposit-source',type:'deposit',label:'Депозиты'},{id:'ac-withdrawal-source',type:'withdrawal',label:'Выводы'}];
  let parsed=null,timer,automatic=false,appliedKey='';
  const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
  const hasSource=()=>sources.some(source=>$(source.id).value.trim());
  function fail(message,target='ac-deposit-source'){
    $('ac-deposit-error').textContent=message;$('ac-deposit-error').hidden=false;
    $(target).setAttribute('aria-invalid','true');
    if(automatic)form.setImportIssue(message,target);
  }
  function mode(importing){
    automatic=importing;
    $('ac-mode-manual').setAttribute('aria-pressed',String(!importing));$('ac-mode-deposits').setAttribute('aria-pressed',String(importing));
    $('ac-deposit-import').hidden=!importing;$('ac-manual-operations').hidden=importing;
    $('ac-mode-hint').textContent=importing?'Вставьте депозиты и выводы в отдельные поля — история объединится и отсортируется автоматически.':'Добавляйте операции вручную или вставьте историю в автоматическом режиме.';
    if(importing){
      form.setImportIssue(hasSource()?'Проверяю вставленные истории. Дождитесь результата.':'Вставьте историю депозитов и/или выводов.');
      if(hasSource())parse();
      $('ac-deposit-source').scrollIntoView({block:'center',behavior:'instant'});$('ac-deposit-source').focus({preventScroll:true});
    } else form.setImportIssue('');
  }
  function availability(){
    const current=form.get().clientName;
    const conflict=parsed?.transactions.length&&current.trim()&&parser.normalize(current)!==parser.normalize(parsed.clientName);
    $('ac-deposit-conflict').hidden=!conflict;
    if(conflict){
      const message=`В отчёте: ${parsed.clientName}. В выписке: ${current}. Подтвердите клиента кнопкой ниже — данные применятся автоматически.`;
      $('ac-deposit-conflict-text').textContent=message;if(automatic)form.setImportIssue(message);
    }
    return Boolean(conflict);
  }
  function renderTable(rows){
    const table=$('ac-deposit-preview');table.replaceChildren();
    const head=node('thead'),header=node('tr');
    for(const title of ['Дата и время','Операция','ID','Способ','Валюта','Сумма','Статус'])header.append(node('th',title));head.append(header);table.append(head);
    const body=node('tbody');
    for(const row of core.sortTransactions(rows)){
      const date=row.date.split('-').reverse().join('/');
      const time=row.sourceCreated?.startsWith(row.date)?row.sourceCreated.slice(11,19):'';
      const tr=node('tr');
      for(const value of [date+(time?' '+time:''),core.types[row.type],row.reference||'—',row.description||'—',row.currency,core.money(core.toMoney(core.decimal(row.amount)),true),core.statuses[row.status||'approved']])tr.append(node('td',value));
      body.append(tr);
    }
    table.append(body);
  }
  function apply(){
    if(!parsed||availability())return;
    try{
      if(!parsed.transactions.length)throw new Error('В историях не найдено операций.');
      const key=JSON.stringify(sources.map(source=>$(source.id).value))+'|'+$('ac-deposit-replace').checked;
      if(key===appliedKey){form.setImportIssue('');renderTable(form.get().transactions);$('ac-deposit-success').textContent='Общая история актуальна. Операций в выписке: '+form.get().transactions.length+'.';$('ac-deposit-success').hidden=false;return;}
      const result=form.importOperations(parsed.transactions,$('ac-deposit-replace').checked);
      appliedKey=key;form.setImportIssue('');sources.forEach(source=>$(source.id).removeAttribute('aria-invalid'));
      renderTable(result.transactions);
      $('ac-deposit-success').textContent=`История объединена и отсортирована: ${result.transactions.length} операций. Добавлено: ${result.added}; обновлено статусов: ${result.updated}; уже были в истории: ${result.skipped}.`;
      $('ac-deposit-success').hidden=false;$('ac-deposit-error').hidden=true;availability();
    }catch(e){fail(e.message);}
  }
  function parse(){
    clearTimeout(timer);parsed=null;$('ac-deposit-success').hidden=true;$('ac-deposit-result').hidden=true;$('ac-deposit-error').hidden=true;
    const reports=[];
    for(const source of sources){
      $(source.id).removeAttribute('aria-invalid');
      $(source.id+'-status').textContent='Пока не вставлено.';
      if(!$(source.id).value.trim())continue;
      try{
        const report=parser.parse($(source.id).value,{type:source.type});reports.push(report);
        $(source.id+'-status').textContent=`Распознано: ${report.transactions.length}. Клиент: ${report.clientName}.`;
      }catch(e){const message=source.label+': '+e.message;$(source.id+'-status').textContent=message;fail(message,source.id);return;}
    }
    if(!reports.length){appliedKey='';if(automatic)form.setImportIssue('Вставьте историю депозитов и/или выводов.');return;}
    const clients=new Set(reports.filter(report=>report.transactions.length).map(report=>parser.normalize(report.clientName)));
    if(clients.size>1){fail('Депозиты и выводы принадлежат разным клиентам. Для одной выписки вставьте обе истории одного клиента.','ac-withdrawal-source');return;}
    const counts={approved:0,pending:0,failed:0,rejected:0,cancelled:0};
    reports.forEach(report=>Object.keys(counts).forEach(key=>counts[key]+=report.statusCounts[key]));
    parsed={clientName:reports.find(report=>report.clientName)?.clientName||'',transactions:core.sortTransactions(reports.flatMap(report=>report.transactions))};
    $('ac-deposit-client').textContent=parsed.clientName||'Нет операций';
    const deposits=parsed.transactions.filter(row=>row.type==='deposit').length,withdrawals=parsed.transactions.filter(row=>row.type==='withdrawal').length;
    $('ac-deposit-count').textContent=`Из вставок: ${deposits} пополнений, ${withdrawals} выводов · Подтверждено: ${counts.approved} · Ожидают: ${counts.pending} · Не выполнено / отменено: ${counts.failed+counts.rejected+counts.cancelled}`;
    $('ac-deposit-totals').textContent=reports.map(report=>(report.type==='withdrawal'?'Подтверждённые выводы: ':'Подтверждённые пополнения: ')+(report.totals.map(total=>core.money(total.amount)+' '+total.currency).join(' · ')||'нет')).join(' / ');
    renderTable(parsed.transactions);$('ac-deposit-result').hidden=false;
    if(automatic)apply();else availability();
  }
  $('ac-mode-manual').addEventListener('click',()=>mode(false));$('ac-mode-deposits').addEventListener('click',()=>mode(true));
  $('ac-import-deposits-link').addEventListener('click',()=>mode(true));
  $('ac-edit-imported').addEventListener('click',()=>{mode(false);$('ac-manual-operations').scrollIntoView({block:'start',behavior:'instant'});});
  sources.forEach(source=>$(source.id).addEventListener('input',()=>{
    clearTimeout(timer);parsed=null;appliedKey='';$('ac-deposit-success').hidden=true;$('ac-deposit-result').hidden=true;
    if(automatic)form.setImportIssue('Проверяю вставленные истории. Дождитесь результата.',source.id);
    timer=setTimeout(parse,250);
  }));
  $('ac-client-name').addEventListener('input',()=>{if(parsed&&automatic)apply();else availability();});
  $('ac-deposit-replace').addEventListener('change',()=>{appliedKey='';if(parsed&&automatic)apply();});
  $('ac-deposit-use-client').addEventListener('click',()=>{if(parsed){form.setClient(parsed.clientName);apply();}});
})();
