/* Client-side import/review of PDF documents the operator provides.
   The unchanged source is held only in memory and can be downloaded.
   A reconstructed working PDF is not a pixel-identical modified original.
   No electronic signatures, licence claims or acceptance logs are generated. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const input=$('contracts-source-file');
 if(!input)return;
 const TYPES={
  agreement:{name:'Client Agreement',url:'https://www.interactivebrokers.co.uk/Universal/servlet/Registration_v2.formSampleView?formdb=6207',label:'Официальный образец Client Agreement'},
  application:{name:'Account Opening Application',url:'https://www.interactivebrokers.com/en/accounts/forms-and-disclosures-client-agreements.php',label:'Каталог официальных форм; индивидуальная заявка доступна только владельцу счёта'},
  risk:{name:'General Risk Disclosure',url:'https://www.interactivebrokers.co.uk/Universal/servlet/Registration_v2.formSampleView?formdb=4785',label:'Официальный образец Risk Disclosure'},
  consent:{name:'Electronic Acceptance',url:'https://www.interactivebrokers.com/docs/web-api/account-management/client-registration/agreements-and-disclosures',label:'Документация; запись о согласии индивидуальна для клиента'}
 };
 const FIELDS=[
  ['companyName','Название компании'],
  ['companyAddress','Адрес компании'],
  ['companyRegistration','Регистрационный номер'],
  ['companyCountry','Страна регистрации'],
  ['authorization','Номер лицензии'],
  ['regulator','Регулятор'],
  ['companyEmail','Email'],
  ['companyWebsite','Сайт']
 ];
 const docs={};
 let active='agreement';
 let cycle=0;
 function status(value,error=false){for(const id of ['contracts-source-status','contracts-source-feedback']){const target=$(id);if(target){target.textContent=value;target.classList.toggle('err',error);}}}
 function n(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;}
 function currentType(){
  const activeButton=$('contracts-type-list')?.querySelector('[data-contract-type].active');
  return activeButton?.dataset.contractType||active;
 }
 function profile(){
  const result={};
  for(const [key] of FIELDS){
   result[key]=document.querySelector('[data-contract-field="'+key+'"]')?.value.trim()||'';
  }
  return result;
 }
 function detectCompanyNames(pages){
  const all=pages.join('\n').replace(/\s+/g,' ');
  return ['Interactive Brokers (U.K.) Limited','Interactive Brokers LLC','Interactive Brokers UK Limited','Interactive Brokers Group, Inc.','IBUK','IBLLC']
   .filter(name=>all.toLowerCase().includes(name.toLowerCase()));
 }
 function syncCompanyName(){
  const value=$('contracts-source-company-new')?.value.trim();
  if(!value)return;
  const field=document.querySelector('[data-contract-field="companyName"]');
  if(field&&field.value!==value){field.value=value;field.dispatchEvent(new Event('input',{bubbles:true}));}
  const label=document.querySelector('[data-source-to="companyName"]');if(label)label.textContent=value;
 }
 function fillCompanySelector(doc){
  const select=$('contracts-source-company-old');if(!select)return;
  const names=doc?.candidates||[],chosen=doc?.old?.companyName||'';
  select.replaceChildren();
  const first=document.createElement('option');first.value='';first.textContent='Выбери название из PDF…';select.append(first);
  for(const name of names){const option=document.createElement('option');option.value=name;option.textContent=name;select.append(option);}
  if(chosen&&!names.includes(chosen)){const option=document.createElement('option');option.value=chosen;option.textContent=chosen+' (введено вручную)';select.append(option);}
  select.value=chosen;
  const guide=$('contracts-source-company-guide');
  if(guide)guide.textContent=names.length?'Найдено в PDF: '+names.join(' · ')+'. IBUK и IBLLC — разные юридические лица, заменяй осознанно.':'Известных названий не найдено. Впиши старое имя вручную в поле «Исходный текст: Название компании».';
 }
 function download(blob,name){
  const link=document.createElement('a'),url=URL.createObjectURL(blob);
  link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
 }
 function current(){return docs[active];}
 function addSourceLinks(){
  const box=$('contracts-source-links');box.replaceChildren();
  for(const [id,source] of Object.entries(TYPES)){
   const a=n('a','contracts-source-link',source.name);
   a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';
   a.dataset.sourceType=id;a.title=source.label;
   box.append(a);
  }
 }
 function makeRule(key,title){
  const row=n('div','contracts-source-rule');
  const a=n('label','contracts-field','Исходный текст: '+title);
  const old=n('input');old.type='text';old.maxLength=250;old.placeholder='Как написано в оригинальном PDF';
  old.dataset.sourceOld=key;old.autocomplete='off';
  a.append(old);
  const b=n('div','contracts-source-target');
  b.append(n('div','contracts-label','ЗАМЕНЯЕТСЯ НА'));
  const to=n('strong');to.dataset.sourceTo=key;b.append(to);
  row.append(a,b);return row;
 }
 function mountRules(){
  const list=$('contracts-source-rules');list.replaceChildren();
  for(const [key,title] of FIELDS)list.append(makeRule(key,title));
  list.addEventListener('input',()=>{
   const doc=current();if(!doc)return;
   for(const inp of list.querySelectorAll('[data-source-old]'))doc.old[inp.dataset.sourceOld]=inp.value;
   if(document.activeElement?.dataset?.sourceOld==='companyName')fillCompanySelector(doc);
  });
 }
 function pagesPreview(doc){
  const stage=$('contracts-source-pages');stage.replaceChildren();
  const limit=doc.edited.length;
  for(let i=0;i<limit;i++){
   const details=n('details','contracts-source-page');
   if(i===0)details.open=true;
   details.append(n('summary','', 'Страница '+(i+1)));
   const area=n('textarea','contracts-source-textarea');
   area.value=doc.edited[i];
   area.spellcheck=false;area.rows=9;area.setAttribute('aria-label','Редактировать текст страницы '+(i+1));
   area.addEventListener('input',()=>{doc.edited[i]=area.value;doc.manuallyEdited=true;status('Изменения страницы '+(i+1)+' сохранены в текущем открытом окне. Для включения этих правок используй экспорт PDF с ручными правками текста.');});
   details.append(area);stage.append(details);
  }
  stage.append(n('p','hint','Все '+doc.edited.length+' страниц доступны для редактирования. Открой нужную страницу, чтобы изменить её текст.'));
 }
 function refresh(){
  active=currentType();
  const doc=current(),exists=!!doc;
  $('contracts-source-controls').hidden=!exists;
  const p=profile();
  const quick=$('contracts-source-company-new');if(quick&&document.activeElement!==quick)quick.value=p.companyName||'';
  fillCompanySelector(doc);
  for(const [key] of FIELDS){
   const dest=document.querySelector('[data-source-to="'+key+'"]');
   if(dest)dest.textContent=p[key]||'Не заполнено в профиле';
   const inp=document.querySelector('[data-source-old="'+key+'"]');
   if(inp)inp.value=doc?.old?.[key]||'';
  }
  document.querySelectorAll('[data-source-type]').forEach(a=>a.classList.toggle('active',a.dataset.sourceType===active));
  if(!doc){status('Для '+TYPES[active].name+' ещё не загружен оригинальный PDF.');$('contracts-source-pages').replaceChildren();return;}
  pagesPreview(doc);
  status('Исходник: '+doc.filename+' · '+doc.pages.length+' стр. · Рабочая версия сохраняется только до обновления вкладки.');
 }
 function safeFilename(str){return String(str||'document').replace(/[^a-z0-9_-]+/gi,'_').slice(0,75);}
 function replacementRules(){
  syncCompanyName();
  const values=profile();
  const engine=window.EstrattoPdfLayout;
  if(engine&&current())return engine.getRules(current(),values,FIELDS);
  return [];
 }
 function replacementPattern(text){
  const escaped=String(text).trim().split(/\s+/).map(piece=>piece.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
  return new RegExp(escaped.join('\\s+'),'gi');
 }
 function textWithReplacements(value,rules){
  let text=String(value),count=0;
  for(const rule of rules){
   const pattern=replacementPattern(rule.old);
   text=text.replace(pattern,()=>{count++;return rule.newText;});
  }
  return {text,count};
 }
 function applyReplacement(){
  const doc=current();if(!doc){status('Сначала загрузи PDF.',true);return;}
  const rules=replacementRules();
  if(!rules.length){status('Введи старые реквизиты слева и новые реквизиты в профиле компании.',true);return;}
  // Apply edits to the current working text, not the original. This preserves
  // paragraphs that the user previously revised by hand.
  let total=0;
  doc.edited=doc.edited.map(page=>{
   const r=textWithReplacements(page,rules);total+=r.count;return r.text;
  });
  doc.old={};
  for(const inp of $('contracts-source-rules').querySelectorAll('[data-source-old]'))doc.old[inp.dataset.sourceOld]=inp.value;
  pagesPreview(doc);
  if(!total){status('Совпадений в редактируемом тексте не найдено. Проверь старые названия: они могут отличаться по написанию.',true);return;}
  status('Заменено '+total+' упоминаний на '+doc.edited.length+' страницах. Изменения включены в PDF с ручными правками текста. PDF с исходным дизайном выполняет отдельную замену на самих страницах.');
 }
 async function parseFile(file){
  if(!file)return;
  if(file.size>25*1024*1024){status('Максимальный размер PDF — 25 МБ.',true);return;}
  if(!/\.pdf$/i.test(file.name)&&file.type!=='application/pdf'){status('Нужен файл PDF.',true);return;}
  if(!window.pdfjsLib){status('Библиотека чтения PDF недоступна.',true);return;}
  const id=++cycle;
  status('Читаю страницы '+file.name+'…');
  try{
   const bytes=new Uint8Array(await file.arrayBuffer());
   const pdf=await pdfjsLib.getDocument({data:new Uint8Array(bytes)}).promise;
   if(pdf.numPages>150)throw new Error('Слишком много страниц (максимум 150).');
   const pages=[];
   for(let i=1;i<=pdf.numPages;i++){
    if(id!==cycle)return;
    const page=await pdf.getPage(i),content=await page.getTextContent();
    const elements=content.items||[];
    let result='';
    for(const item of elements){
     if(typeof item.str!=='string')continue;
     result+=item.str;
     if(item.hasEOL)result+='\n';
     else if(item.str&&!/\s$/.test(item.str))result+=' ';
    }
    pages.push(result.trim());
    if(i%10===0||i===pdf.numPages)status('Извлечено страниц: '+i+' / '+pdf.numPages);
   }
   if(id!==cycle)return;
   const count=pages.reduce((sum,page)=>sum+page.trim().length,0);
   if(count<100)throw new Error('PDF не содержит извлекаемого текста. Возможно, он является сканом и требует OCR.');
   const target=currentType();
   docs[target]={filename:file.name,bytes,blob:new Blob([bytes],{type:'application/pdf'}),pages,edited:[...pages],old:{},manuallyEdited:false,candidates:detectCompanyNames(pages)};
   active=target;refresh();
  }catch(e){
   status('Не удалось прочитать PDF: '+(e?.message||'ошибка документа'),true);
  }
 }
 async function exportPreservingLayout(){
  const doc=current();if(!doc){status('Сначала загрузи PDF.',true);return;}
  const engine=window.EstrattoPdfLayout;
  if(!engine){status('Модуль сохранения дизайна PDF не загрузился.',true);return;}
  const rules=engine.getRules(doc,profile(),FIELDS);
  if(!rules.length){
   status('Для замены в исходной вёрстке сначала заполни старые реквизиты слева и свои данные в профиле.',true);
   return;
  }
  const button=$('contracts-source-export');
  button.disabled=true;
  try{
   // Never silently discard free-form text edits in the visually faithful export.
   if(doc.manuallyEdited){
    status('В документе есть ручные правки текста. PDF с исходной вёрсткой может заменить только указанные реквизиты. Для сохранения ВСЕХ текстовых правок нажми «Скачать PDF с ручными правками текста».',true);
    return;
   }
   const result=await engine.exportPdf(doc,rules,(index,total)=>{
    status('Сохраняю исходный дизайн: страница '+index+' из '+total+'…');
   });
   const matches=Object.values(result.coverage).reduce((n,c)=>n+c,0);
   if(!matches){
    status('Совпадений не найдено: PDF не был экспортирован. Проверь написание старых реквизитов (в PDF они могут быть разбиты на строки или отдельные фрагменты).',true);
    return;
   }
   result.pdf.save('layout_review_'+safeFilename(TYPES[active].name)+'.pdf');
   const missing=rules.filter(rule=>!result.coverage[rule.key]).map(rule=>rule.old);
   let note='PDF с исходным дизайном создан: '+result.pages+' стр.; замен найдено: '+matches+'.';
   if(missing.length)note+=' Не найдены: '+missing.join('; ')+'.';
   if(result.compressed)note+=' На '+result.compressed+' участках новое значение уменьшено для размещения в старой строке.';

   note+=' Проверь все страницы перед передачей юристу.';
   status(note,missing.length>0);
  }catch(error){
   status('Не удалось сохранить исходную вёрстку: '+(error?.message||'ошибка PDF'),true);
  }finally{button.disabled=false;}
 }
 async function exportWorkingCopy(){
  const doc=current();if(!doc){status('Сначала загрузи PDF.',true);return;}
  const JsPDF=window.jspdf?.jsPDF;if(!JsPDF){status('Библиотека экспорта PDF недоступна.',true);return;}
  // Apply company data automatically when downloading, even when the user
  // did not click the intermediate «Применить ко всем страницам» button.
  const rules=replacementRules();
  const working=doc.edited.map(page=>textWithReplacements(page,rules).text);
  const modified=working.some((text,i)=>text!==doc.pages[i]);
  if(!modified){status('Редактируемый PDF пока совпадает с исходником: введи старое название, новые реквизиты или измени текст на странице. Неизменённый файл не скачивается.',true);return;}
  const pdf=new JsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
  try{
   for(const [name,file] of [['InterR','Inter-Regular.ttf'],['InterSB','Inter-SemiBold.ttf']]){
    const response=await fetch('fonts/'+file);if(!response.ok)throw new Error(file);
    const bytes=new Uint8Array(await response.arrayBuffer());
    let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode.apply(null,bytes.subarray(i,i+8192));
    pdf.addFileToVFS(file,btoa(binary));pdf.addFont(file,name,'normal');
   }
  }catch(error){status('Не удалось загрузить шрифты: '+error.message,true);return;}
  let first=true;
  const width=167,margin=21;
  for(let sourcePage=0;sourcePage<working.length;sourcePage++){
   if(!first)pdf.addPage();first=false;
   let y=22;
   pdf.setFont('InterSB','normal');pdf.setFontSize(8);pdf.setTextColor(108,57,37);
   pdf.text('WORKING DRAFT — FOR LEGAL REVIEW ONLY',margin,13);
   pdf.setFont('InterR','normal');pdf.setFontSize(8);pdf.setTextColor(50,50,50);
   const lines=pdf.splitTextToSize(working[sourcePage]||'',width);
   for(const line of lines){
    if(y>272){
     pdf.addPage();y=22;
     pdf.setFont('InterSB','normal');pdf.setFontSize(8);pdf.setTextColor(108,57,37);
     pdf.text('WORKING DRAFT — FOR LEGAL REVIEW ONLY',margin,13);
     pdf.setFont('InterR','normal');pdf.setFontSize(8);pdf.setTextColor(50,50,50);
    }
    pdf.text(line,margin,y);y+=4.7;
   }
  }
  pdf.save('legal_review_'+safeFilename(TYPES[active].name)+'.pdf');
  doc.edited=working;
  pagesPreview(doc);
  status('Рабочий PDF с изменённым текстом создан. Реквизиты автоматически подставлены. Вёрстка отличается от оригинала; исходник сохранён без изменений.');
 }
 $('contracts-source-company-new').addEventListener('input',()=>{
  syncCompanyName();status('Новое название сохранено. Выбери старое название из PDF и нажми «Применить ко всем страницам».');
 });
 $('contracts-source-company-old').addEventListener('change',()=>{
  const doc=current();if(doc){doc.old.companyName=$('contracts-source-company-old').value;const field=document.querySelector('[data-source-old="companyName"]');if(field)field.value=doc.old.companyName;}
  status(doc?.old.companyName?'Старое название выбрано: '+doc.old.companyName+'. Нажми «Применить ко всем страницам».':'Выбери старое название из PDF.');
 });
 input.addEventListener('change',event=>{const f=event.target.files?.[0];event.target.value='';parseFile(f);});
 $('contracts-source-apply').addEventListener('click',applyReplacement);
 $('contracts-source-export').addEventListener('click',exportPreservingLayout);
 $('contracts-source-text-export').addEventListener('click',exportWorkingCopy);
 $('contracts-source-original').addEventListener('click',()=>{
  const doc=current();if(doc)download(doc.blob,doc.filename);
 });
 $('contracts-source-remove').addEventListener('click',()=>{
  const doc=current();if(!doc)return;
  if(!confirm('Убрать загруженный PDF и рабочие изменения из этой вкладки?'))return;
  delete docs[active];refresh();
 });
 document.addEventListener('estratto:navigate',event=>{if(event.detail==='contracts')refresh();});
 $('contracts-type-list')?.addEventListener('click',event=>{
  if(event.target.closest('[data-contract-type]'))requestAnimationFrame(refresh);
 });
 $('contracts-fields')?.addEventListener('input',()=>{for(const [key] of FIELDS){const dest=document.querySelector('[data-source-to="'+key+'"]');if(dest)dest.textContent=profile()[key]||'Не заполнено в профиле';}});
 addSourceLinks();mountRules();refresh();
})();