/* Copy/paste deposits are previewed before being added to the editable history. */
(() => {
  'use strict';
  const parser=window.EstrattoDeposits,form=window.EstrattoAccountForm,core=window.EstrattoAccount;
  const $=id=>document.getElementById(id);
  let parsed=null,timer;
  const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
  function mode(importing){
    $('ac-mode-manual').setAttribute('aria-pressed',String(!importing));$('ac-mode-deposits').setAttribute('aria-pressed',String(importing));
    $('ac-deposit-import').hidden=!importing;
    if(importing){$('ac-deposit-source').scrollIntoView({block:'center',behavior:'instant'});$('ac-deposit-source').focus({preventScroll:true});}
  }
  function availability(){
    const current=form.get().clientName;
    const conflict=parsed?.transactions.length&&current.trim()&&parser.normalize(current)!==parser.normalize(parsed.clientName);
    $('ac-deposit-conflict').hidden=!conflict;
    if(conflict)$('ac-deposit-conflict-text').textContent=`В отчёте: ${parsed.clientName}. В выписке: ${current}. Проверьте клиента перед импортом.`;
    $('ac-deposit-apply').disabled=!parsed?.transactions.length||Boolean(conflict);
  }
  function parse(){
    clearTimeout(timer);parsed=null;$('ac-deposit-success').hidden=true;$('ac-deposit-result').hidden=true;$('ac-deposit-error').hidden=true;
    if(!$('ac-deposit-source').value.trim())return;
    try{
      parsed=parser.parse($('ac-deposit-source').value,{type:$('ac-deposit-kind').value});
      $('ac-deposit-client').textContent=parsed.clientName||'Нет операций';
      const counts=parsed.statusCounts,duplicates=parsed.skipped.filter(row=>row.reason==='duplicate').length;
      $('ac-deposit-count').textContent=`Операций: ${parsed.transactions.length} · Подтверждено: ${counts.approved} · Ожидают: ${counts.pending} · Не выполнено / отменено: ${counts.failed+counts.rejected+counts.cancelled} · Повторы: ${duplicates}`;
      $('ac-deposit-totals').textContent='Подтверждённые '+(parsed.type==='withdrawal'?'выводы: ':'пополнения: ')+(parsed.totals.map(total=>core.money(total.amount)+' '+total.currency).join(' · ')||'нет');
      const table=$('ac-deposit-preview');table.replaceChildren();
      const head=node('thead'),header=node('tr');for(const title of ['ID','Дата','Способ','Валюта','Сумма','Статус'])header.append(node('th',title));head.append(header);table.append(head);
      const body=node('tbody');
      for(const row of parsed.transactions){const tr=node('tr');for(const value of [row.reference,row.date.split('-').reverse().join('/'),row.description||'—',row.currency,core.money(core.toMoney(core.decimal(row.amount)),true),core.statuses[row.status]])tr.append(node('td',value));body.append(tr);}table.append(body);
      $('ac-deposit-result').hidden=false;availability();
    }catch(e){$('ac-deposit-error').textContent=e.message;$('ac-deposit-error').hidden=false;}
  }
  $('ac-deposit-kind').addEventListener('change',parse);
  $('ac-mode-manual').addEventListener('click',()=>mode(false));
  $('ac-mode-deposits').addEventListener('click',()=>mode(true));
  $('ac-import-deposits-link').addEventListener('click',()=>mode(true));
  $('ac-deposit-source').addEventListener('input',()=>{clearTimeout(timer);parsed=null;$('ac-deposit-apply').disabled=true;timer=setTimeout(parse,250);});
  $('ac-client-name').addEventListener('input',availability);
  $('ac-deposit-use-client').addEventListener('click',()=>{if(parsed){form.setClient(parsed.clientName);availability();}});
  $('ac-deposit-apply').addEventListener('click',()=>{
    if(!parsed)return;
    try{
      const result=form.importOperations(parsed.transactions,$('ac-deposit-replace').checked);
      $('ac-deposit-success').textContent=`Добавлено операций: ${result.added}. Обновлено статусов: ${result.updated}. Повторные ID пропущены: ${result.skipped}. Операции доступны для ручного редактирования ниже.`;
      $('ac-deposit-success').hidden=false;$('ac-deposit-error').hidden=true;availability();
    }catch(e){$('ac-deposit-error').textContent=e.message;$('ac-deposit-error').hidden=false;}
  });
})();
