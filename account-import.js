/* A valid paste fills the history immediately. Manual fields stay in manual mode. */
(() => {
  'use strict';
  const parser=window.EstrattoDeposits,form=window.EstrattoAccountForm,core=window.EstrattoAccount;
  const $=id=>document.getElementById(id);
  let parsed=null,timer,automatic=false,appliedKey='';
  const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
  function fail(message){
    $('ac-deposit-error').textContent=message;$('ac-deposit-error').hidden=false;
    $('ac-deposit-source').setAttribute('aria-invalid','true');
    if(automatic)form.setImportIssue(message);
  }
  function mode(importing){
    automatic=importing;
    $('ac-mode-manual').setAttribute('aria-pressed',String(!importing));$('ac-mode-deposits').setAttribute('aria-pressed',String(importing));
    $('ac-deposit-import').hidden=!importing;$('ac-manual-operations').hidden=importing;
    $('ac-mode-hint').textContent=importing?'Вставьте историю — имя клиента и операции заполнятся автоматически. Номер счёта и остатки укажите ниже.':'Добавляйте операции вручную или вставьте историю в автоматическом режиме.';
    if(importing){
      form.setImportIssue($('ac-deposit-source').value.trim()?'Проверяю вставленную историю. Дождитесь результата.':'Вставьте историю операций для автоматического заполнения.');
      if($('ac-deposit-source').value.trim())parse();
      $('ac-deposit-source').scrollIntoView({block:'center',behavior:'instant'});$('ac-deposit-source').focus({preventScroll:true});
    } else form.setImportIssue('');
  }
  function availability(){
    const current=form.get().clientName;
    const conflict=parsed?.transactions.length&&current.trim()&&parser.normalize(current)!==parser.normalize(parsed.clientName);
    $('ac-deposit-conflict').hidden=!conflict;
    if(conflict){
      const message=`В отчёте: ${parsed.clientName}. В выписке: ${current}. Подтвердите клиента кнопкой ниже — данные применятся автоматически.`;
      $('ac-deposit-conflict-text').textContent=message;
      if(automatic)form.setImportIssue(message);
    }
    return Boolean(conflict);
  }
  function apply(){
    if(!parsed||availability())return;
    try{
      if(!parsed.transactions.length)throw new Error('В истории не найдено операций.');
      const key=$('ac-deposit-kind').value+'|'+$('ac-deposit-source').value+'|'+$('ac-deposit-replace').checked;
      // Returning from manual editing must not overwrite the same paste again.
      if(key===appliedKey){form.setImportIssue('');$('ac-deposit-success').textContent='История уже заполнена. Операций в выписке: '+form.get().transactions.length+'.';$('ac-deposit-success').hidden=false;return;}
      const result=form.importOperations(parsed.transactions,$('ac-deposit-replace').checked);
      appliedKey=key;form.setImportIssue('');$('ac-deposit-source').removeAttribute('aria-invalid');
      $('ac-deposit-success').textContent=`Заполнено автоматически. Добавлено: ${result.added}; обновлено статусов: ${result.updated}; уже были в истории: ${result.skipped}. Всего в выписке: ${result.transactions.length}.`;
      $('ac-deposit-success').hidden=false;$('ac-deposit-error').hidden=true;availability();
    }catch(e){fail(e.message);}
  }
  function parse(){
    clearTimeout(timer);parsed=null;$('ac-deposit-success').hidden=true;$('ac-deposit-result').hidden=true;$('ac-deposit-error').hidden=true;
    $('ac-deposit-source').removeAttribute('aria-invalid');
    if(!$('ac-deposit-source').value.trim()){
      appliedKey='';if(automatic)form.setImportIssue('Вставьте историю операций для автоматического заполнения.');return;
    }
    try{
      parsed=parser.parse($('ac-deposit-source').value,{type:$('ac-deposit-kind').value});
      $('ac-deposit-client').textContent=parsed.clientName||'Нет операций';
      const counts=parsed.statusCounts,duplicates=parsed.skipped.filter(row=>row.reason==='duplicate').length;
      $('ac-deposit-count').textContent=`Распознано: ${parsed.transactions.length} · Подтверждено: ${counts.approved} · Ожидают: ${counts.pending} · Не выполнено / отменено: ${counts.failed+counts.rejected+counts.cancelled} · Повторы: ${duplicates}`;
      $('ac-deposit-totals').textContent='Подтверждённые '+(parsed.type==='withdrawal'?'выводы: ':'пополнения: ')+(parsed.totals.map(total=>core.money(total.amount)+' '+total.currency).join(' · ')||'нет');
      const table=$('ac-deposit-preview');table.replaceChildren();
      const head=node('thead'),header=node('tr');for(const title of ['ID','Дата','Способ','Валюта','Сумма','Статус'])header.append(node('th',title));head.append(header);table.append(head);
      const body=node('tbody');
      for(const row of parsed.transactions){const tr=node('tr');for(const value of [row.reference,row.date.split('-').reverse().join('/'),row.description||'—',row.currency,core.money(core.toMoney(core.decimal(row.amount)),true),core.statuses[row.status]])tr.append(node('td',value));body.append(tr);}table.append(body);
      $('ac-deposit-result').hidden=false;
      if(automatic)apply();else availability();
    }catch(e){fail(e.message);}
  }
  $('ac-deposit-kind').addEventListener('change',parse);
  $('ac-mode-manual').addEventListener('click',()=>mode(false));
  $('ac-mode-deposits').addEventListener('click',()=>mode(true));
  $('ac-import-deposits-link').addEventListener('click',()=>mode(true));
  $('ac-edit-imported').addEventListener('click',()=>{mode(false);$('ac-manual-operations').scrollIntoView({block:'start',behavior:'instant'});});
  $('ac-deposit-source').addEventListener('input',()=>{
    clearTimeout(timer);parsed=null;appliedKey='';$('ac-deposit-success').hidden=true;$('ac-deposit-result').hidden=true;
    if(automatic)form.setImportIssue('Проверяю вставленную историю. Дождитесь результата.');
    timer=setTimeout(parse,250);
  });
  $('ac-client-name').addEventListener('input',()=>{if(parsed&&automatic)apply();else availability();});
  $('ac-deposit-replace').addEventListener('change',()=>{appliedKey='';if(parsed&&automatic)apply();});
  $('ac-deposit-use-client').addEventListener('click',()=>{if(parsed){form.setClient(parsed.clientName);apply();}});
})();
