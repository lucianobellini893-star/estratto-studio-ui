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
 function status(value,error=false){const target=$('contracts-source-status');target.textContent=value;target.classList.toggle('err',error);}
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
   doc.old={};
   for(const inp of list.querySelectorAll('[data-source-old]'))doc.old[inp.dataset.sourceOld]=inp.value;
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
   area.addEventListener('input',()=>{doc.edited[i]=area.value;status('Изменения страницы '+(i+1)+' сохранены в текущем открытом окне.');});
   details.append(area);stage.append(details);
  }
  stage.append(n('p','hint','Все '+doc.edited.length+' страниц доступны для редактирования. Открой нужную страницу, чтобы изменить её текст.'));
 }
 function refresh(){
  active=currentType();
  const doc=current(),exists=!!doc;
  $('contracts-source-controls').hidden=!exists;
  const p=profile();
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
 function applyReplacement(){
  const doc=current();if(!doc){status('Сначала загрузи PDF.',true);return;}
  const values=profile(),rules=[];
  for(const input of $('contracts-source-rules').querySelectorAll('[data-source-old]')){
   const key=input.dataset.sourceOld,old=input.value.trim(),replacement=values[key];
   if(!old||!replacement)continue;
   if(old===replacement)continue;
   rules.push({key,old,newText:replacement});
  }
  if(!rules.length){status('Впиши старое значение слева и новое в основном профиле компании.',true);return;}
  // Longest first avoids replacing a parent brand substring before a complete entity.
  rules.sort((a,b)=>b.old.length-a.old.length);
  let total=0;
  doc.edited=doc.pages.map(original=>{
   let content=original;
   for(const rule of rules){
    if(rule.old.length<3)continue;
    const parts=content.split(rule.old);
    total+=parts.length-1;
    content=parts.join(rule.newText);
   }
   return content;
  });
  doc.old={};for(const inp of $('contracts-source-rules').querySelectorAll('[data-source-old]'))doc.old[inp.dataset.sourceOld]=inp.value;
  pagesPreview(doc);
  status('Замена завершена: '+total+' совпадений на '+doc.pages.length+' страницах. Проверь каждое упоминание и юридические роли сторон до отправки юристу.');
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
   docs[target]={filename:file.name,bytes,blob:new Blob([bytes],{type:'application/pdf'}),pages,edited:[...pages],old:{}};
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
   const changed=doc.edited.some((page,i)=>page!==doc.pages[i]);
   if(changed)status('Сохраняю оригинальный дизайн. В этот вариант войдут массовые замены реквизитов; свободные правки страниц из текстовых полей требуют отдельного экспорта.');
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
   if(changed)note+=' Ручные изменения полного текста не включены — для них есть отдельная кнопка экспорта.';
   note+=' Проверь все страницы перед передачей юристу.';
   status(note,missing.length>0);
  }catch(error){
   status('Не удалось сохранить исходную вёрстку: '+(error?.message||'ошибка PDF'),true);
  }finally{button.disabled=false;}
 }
 async function exportWorkingCopy(){
  const doc=current();if(!doc){status('Сначала загрузи PDF.',true);return;}
  const JsPDF=window.jspdf?.jsPDF;if(!JsPDF){status('Библиотека экспорта PDF недоступна.',true);return;}
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
  for(let sourcePage=0;sourcePage<doc.edited.length;sourcePage++){
   if(!first)pdf.addPage();first=false;
   let y=22;
   pdf.setFont('InterSB','normal');pdf.setFontSize(8);pdf.setTextColor(108,57,37);
   pdf.text('WORKING DRAFT — FOR LEGAL REVIEW ONLY',margin,13);
   pdf.setFont('InterR','normal');pdf.setFontSize(8);pdf.setTextColor(50,50,50);
   const lines=pdf.splitTextToSize(doc.edited[sourcePage]||'',width);
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
  status('Рабочий PDF создан. Его вёрстка отличается от оригинала. Исходный документ остался неизменным.');
 }
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