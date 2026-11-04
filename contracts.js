/* Interactive legal draft workspace. Never creates signatures or acceptance evidence. */
(() => {
 'use strict';
 const core=window.EstrattoContractsCore, shared=window.EstrattoDocument, $=id=>document.getElementById(id);
 if(!core||!$('contracts-type-list'))return;
 const KEY='estratto-contracts-drafts.v1';
 const defaults={
   companyName:'',companyAddress:'',companyCountry:'',companyRegistration:'',
   companyEmail:'',companyWebsite:'',regulator:'',authorization:'',protectionScheme:'',
   governingLaw:'',jurisdiction:'',complaintsEmail:'',services:'',products:'',
   feeSchedule:'',signatureMethod:'',clientName:'',clientId:'',accountId:'',clientCountry:'',
   issueDate:new Date().toISOString().slice(0,10),accentPrimary:'#085F94',accentSecondary:'#CD1935',versionLabel:'1.0'
 };
 let stored={};try{stored=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(_){}
 let profile={...defaults,...stored.profile},overrides=stored.overrides&&typeof stored.overrides==='object'?stored.overrides:{};
 let selected=core.types.some(type=>type.id===stored.selected)?stored.selected:'agreement';
 let logoData=typeof stored.logoData==='string'&&stored.logoData.startsWith('data:image/png;base64,')?stored.logoData:'',logoVersion=0,updating=false;
 function save(){try{localStorage.setItem(KEY,JSON.stringify({profile,overrides,selected,logoData:logoData||''}));}catch(_){status('Не удалось сохранить настройки локально.',true)}}
 function status(text,error=false){const el=$('contracts-status');el.textContent=text||'';el.classList.toggle('err',error);}
 function el(tag,cls,value){
   const element=document.createElement(tag);
   if(cls)element.className=cls;
   if(value!==undefined)element.textContent=String(value);
   return element;
 }
 function ensureLogo(){
   const state=shared?.getState?.()||{};
   const name=(state.coName||'').trim();
   if(!profile.companyName&&name)profile.companyName=name;
   if(!profile.companyAddress&&state.coAddr)profile.companyAddress=state.coAddr;
   if(!profile.companyWebsite&&state.coSite)profile.companyWebsite=state.coSite;
   if(!profile.clientName&&state.clientName)profile.clientName=state.clientName;
   if(!profile.clientId&&state.clientId)profile.clientId=state.clientId;
   if(!logoData&&state.logoSvg&&shared?.sanitizeSvg&&shared?.rasterizeSvg){
     const version=++logoVersion;
     shared.rasterizeSvg(shared.sanitizeSvg(state.logoSvg)).then(image=>{
       if(version!==logoVersion)return;
       logoData=image.dataUrl; render();
     }).catch(()=>{});
   }
 }
 function fields(){
   const container=$('contracts-fields');container.replaceChildren();
   const main=[
     ['companyName','Название компании'],['companyAddress','Юридический адрес','textarea'],
     ['companyCountry','Страна регистрации'],['companyRegistration','Регистрационный номер'],
     ['companyEmail','Email компании'],['companyWebsite','Сайт'],
     ['clientName','Имя клиента'],['clientId','ID клиента']
   ];
   const optional=[
     ['accountId','Номер счёта'],['clientCountry','Страна проживания'],
     ['governingLaw','Применимое право'],['jurisdiction','Компетентный суд / орган'],
     ['regulator','Регулятор — только подтверждённый'],['authorization','Номер лицензии — только если есть'],
     ['complaintsEmail','Email для жалоб'],['protectionScheme','Схема защиты инвесторов — если действует'],
     ['services','Предоставляемые услуги','textarea'],['products','Доступные продукты','textarea'],
     ['feeSchedule','Тарифы и комиссии'],['signatureMethod','Метод подтверждения согласия'],
     ['issueDate','Дата документа','date']
   ];
   function makeFields(rows,parent){
     const grid=el('div','contracts-field-grid');parent.append(grid);
     for(const [name,title,type] of rows){
       const wrapper=el('label','contracts-field'+(type==='textarea'?' wide':''));
       wrapper.append(document.createTextNode(title));
       const input=el(type==='textarea'?'textarea':'input');
       if(type==='textarea')input.rows=2;else input.type=type==='date'?'date':'text';
       input.value=profile[name]||'';input.dataset.contractField=name;input.autocomplete='off';
       input.addEventListener('input',()=>{profile[name]=input.value;save();render();});
       wrapper.append(input);grid.append(wrapper);
     }
   }
   container.append(el('div','contracts-label','ОСНОВНЫЕ ДАННЫЕ ДЛЯ ДОГОВОРА'));
   makeFields(main,container);
   const advanced=el('details','contracts-extra-settings');
   const summary=el('summary','', 'Дополнительные юридические сведения и настройки');
   advanced.append(summary);
   advanced.append(el('p','hint','Заполняйте только подтверждённые данные. Регулятор, лицензия, применимое право и состав услуг должны соответствовать действительности.'));
   makeFields(optional,advanced);
   container.append(advanced);
 }
 function syncFromTrade(force=false){
   const state=shared?.getState?.()||{};
   const mapping={companyName:state.coName||'',companyAddress:state.coAddr||'',companyWebsite:state.coSite||'',clientName:state.clientName||'',clientId:state.clientId||''};
   let changed=false;
   for(const [key,value] of Object.entries(mapping)){
     if(value&&(!profile[key]||force)){profile[key]=value;changed=true;}
   }
   if(changed){save();fields();render();status('Данные компании и клиента взяты из редактора выписки. Проверьте их.');}
   else status('Новых данных для переноса нет. Реквизиты можно заполнить вручную.');
 }
 function hexToRgb(hex){const m=String(hex||'').match(/^#([0-9a-f]{6})$/i);if(!m)return [8,95,148];return [0,2,4].map(i=>parseInt(m[1].slice(i,i+2),16));}
 function getBrand(){return {primary:/^#[0-9a-f]{6}$/i.test(profile.accentPrimary)?profile.accentPrimary:'#085F94',secondary:/^#[0-9a-f]{6}$/i.test(profile.accentSecondary)?profile.accentSecondary:'#CD1935'};}
 function connectDesignControls(){
   for(const [id,key] of [['contracts-color-primary','accentPrimary'],['contracts-color-secondary','accentSecondary'],['contracts-version-label','versionLabel']]){
     const control=$(id);control.value=profile[key]||defaults[key];
     control.addEventListener('input',()=>{profile[key]=control.value;save();render();});
   }
   $('contracts-colors-reset').addEventListener('click',()=>{
     profile.accentPrimary=defaults.accentPrimary;profile.accentSecondary=defaults.accentSecondary;
     $('contracts-color-primary').value=profile.accentPrimary;
     $('contracts-color-secondary').value=profile.accentSecondary;save();render();
   });
 }
 function sectionsFor(type){
   const document=core.build(type,profile);
   const edits=overrides[type]||{};
   document.sections=document.sections.map((section,i)=>({
     ...section,paragraphs:section.paragraphs.map((paragraph,j)=>Object.prototype.hasOwnProperty.call(edits,i+':'+j)?edits[i+':'+j]:paragraph)
   }));
   return document;
 }
 function render(){
   if(updating)return;
   const doc=sectionsFor(selected);
   $('contracts-selected-title').textContent=doc.title;
   $('contracts-selected-version').textContent='DRAFT • '+(profile.versionLabel||doc.version);
   document.querySelectorAll('[data-contract-type]').forEach(button=>button.classList.toggle('active',button.dataset.contractType===selected));
   const missing=$('contracts-missing');
   if(doc.missing.length){
     missing.textContent='Для подготовки документа не заполнены: '+doc.missing.join(', ')+'.';
     missing.hidden=false;
   }else missing.hidden=true;
   const page=$('contracts-document');page.replaceChildren();
   const colors=getBrand();page.style.setProperty('--contract-primary',colors.primary);page.style.setProperty('--contract-secondary',colors.secondary);
   const top=el('div');
   if(logoData){
     const logo=el('img','contracts-preview-logo');
     logo.alt='Логотип компании';logo.src=logoData;top.append(logo);
   }else top.append(el('div','contracts-label',profile.companyName||'COMPANY'));
   top.append(el('div','contracts-topline'));
   const company=el('p','contracts-meta',(profile.companyName||'[COMPANY]')+' · '+(profile.companyAddress||'[ADDRESS]'));
   top.append(company);page.append(top);
   page.append(el('h1','',selected==='agreement'?(profile.companyName||'Società')+' — Client Agreement':doc.title));
   page.append(el('p','contracts-meta',doc.englishTitle+' · Versione '+(profile.versionLabel||doc.version)+' · Data '+(profile.issueDate||'[DA COMPLETARE]')));
   const parties=el('div','contracts-parties');
   parties.append(el('strong','',profile.companyName||'[Ragione sociale da compilare]'));
   parties.append(el('div','', 'Cliente: '+(profile.clientName||'[Nome da compilare]')+' · ID: '+(profile.clientId||'[ID da compilare]')));
   parties.append(el('div','', 'N. conto: '+(profile.accountId||'[non assegnato]')));
   page.append(parties);
   const warning=el('div','contracts-draft-note','BOZZA NON FIRMATA — Questo documento non è un contratto Interactive Brokers e non prova alcuna accettazione. Richiede revisione legale e verifica delle autorizzazioni prima dell’uso con clienti.');
   page.append(warning);
   const about=el('h2','contracts-intro-title',selected==='agreement'?'About these Terms':'Documento e condizioni');
   page.append(about);
   page.append(el('p','',selected==='agreement'?'Il presente testo illustra diritti, obblighi e condizioni che dovranno essere verificati e approvati prima di qualsiasi utilizzo contrattuale.':'Il documento è predisposto in base ai dati inseriti, soggetti a verifica prima dell’utilizzo.'));
   if(selected==='agreement'){
     const intro=el('div','contracts-important');
     intro.append(el('h2','', 'ⓘ Important documents'));
     intro.append(el('p','', 'Il rapporto contrattuale può richiedere anche i seguenti documenti, da consegnare nelle rispettive versioni approvate:'));
     const list=el('ul');
     ['Client Agreement (presente documento)','Account Opening Application','General Risk Disclosure','Express Consent / Electronic Acceptance','Prospetto dei costi e delle commissioni','Privacy Policy e documentazione applicabile'].forEach(label=>list.append(el('li','',label)));
     intro.append(list);page.append(intro);
     page.append(el('h2','contracts-section-blue','Our legal relationship'));
   }
   for(const section of doc.sections){
     page.append(el('h2','contracts-section-heading',section.title));
     for(const paragraph of section.paragraphs)page.append(el('p','',paragraph));
   }
   page.append(el('div','contracts-footer','BOZZA • Nessuna firma registrata • '+(profile.versionLabel||doc.version)+' • '+(profile.issueDate||'data da definire')));
   renderEditor(doc);
 }
 function renderEditor(doc){
   const holder=$('contracts-clauses');holder.replaceChildren();
   const advanced=el('details','contracts-advanced-text');
   advanced.append(el('summary','','Редактировать юридический текст (дополнительно)'));
   holder.append(advanced);
   const label=el('div','contracts-label','MODIFICA DEL TESTO DELLA BOZZA');advanced.append(label);
   const help=el('p','contracts-lock','I paragrafi sono modificabili. Le modifiche restano in questo browser e valgono solo per il tipo di documento selezionato. Non inserire attestazioni false di firma, licenza o accettazione.');
   advanced.append(help);
   doc.sections.forEach((section,i)=>{
     const details=el('details','contracts-clause');
     if(i===0)details.open=true;
     const summary=el('summary','',section.title);summary.style.cssText='cursor:pointer;font-size:12px;font-weight:600;padding:8px 0';details.append(summary);
     section.paragraphs.forEach((paragraph,j)=>{
       const label=el('label','contracts-field');
       label.append(document.createTextNode('Paragrafo '+(j+1)));
       const area=el('textarea');area.rows=3;area.value=paragraph;area.maxLength=6000;
       area.addEventListener('input',()=>{
         overrides[selected]=overrides[selected]||{};
         overrides[selected][i+':'+j]=area.value;
         save();
         // Editing doesn't re-create focused textarea or move cursor.
         renderDocumentOnly();
       });
       label.append(area);details.append(label);
     });
     advanced.append(details);
   });
 }
 function renderDocumentOnly(){
   const y=window.scrollY;
   updating=true;
   const doc=sectionsFor(selected),page=$('contracts-document');page.replaceChildren();
   const colors=getBrand();page.style.setProperty('--contract-primary',colors.primary);page.style.setProperty('--contract-secondary',colors.secondary);
   if(logoData){const img=el('img','contracts-preview-logo');img.alt='Логотип компании';img.src=logoData;page.append(img);}
   page.append(el('div','contracts-topline'));
   page.append(el('p','contracts-meta',profile.companyName||'[COMPANY]'));
   page.append(el('h1','',selected==='agreement'?(profile.companyName||'Società')+' — Client Agreement':doc.title));
   page.append(el('p','contracts-meta',doc.englishTitle+' · '+(profile.versionLabel||doc.version)+' · '+(profile.issueDate||'[DATE]')));
   page.append(el('div','contracts-draft-note','BOZZA NON FIRMATA — Revisione legale necessaria. Nessuna accettazione verificata.'));
   if(selected==='agreement'){page.append(el('h2','contracts-intro-title','About these Terms'));page.append(el('p','','This is an independent contractual draft prepared for the named company.'));page.append(el('h2','contracts-section-blue','Important documents'));page.append(el('p','','Account Opening Application · Risk Disclosure · Express Consent · Policies'));}
   for(const section of doc.sections){page.append(el('h2','contracts-section-heading',section.title));for(const paragraph of section.paragraphs)page.append(el('p','',paragraph));}
   page.append(el('div','contracts-footer','Documento non firmato · '+(profile.versionLabel||doc.version)));
   updating=false;
 }
 async function exportPdf(){
   const doc=sectionsFor(selected);
   if(doc.missing.length){
     status('Для формирования PDF заполните: '+doc.missing.join(', '),true);
     return;
   }
   const JsPDF=window.jspdf?.jsPDF;
   if(!JsPDF){status('Библиотека PDF недоступна.',true);return;}
   const pdf=new JsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
   try{
     for(const [family,file] of [['InterR','Inter-Regular.ttf'],['InterSB','Inter-SemiBold.ttf']]){
       const response=await fetch('fonts/'+file);
       if(!response.ok)throw new Error('Не удалось загрузить шрифт '+file);
       const bytes=new Uint8Array(await response.arrayBuffer());
       let binary='';
       for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));
       pdf.addFileToVFS(file,btoa(binary));
       pdf.addFont(file,family,'normal');
     }
   }catch(e){status('Не удалось встроить шрифты: '+e.message,true);return;}
   const brand=getBrand(),blue=hexToRgb(brand.primary),red=hexToRgb(brand.secondary),black=[20,20,20],gray=[101,101,101];
   const left=24,right=24,width=210-left-right,bottom=276;
   let y=25;
   function nextPage(){pdf.addPage();y=27;}
   function fit(needed){if(y+needed>bottom)nextPage();}
   function write(value,opts={}){
     const font=opts.bold?'InterSB':'InterR',size=opts.size||10.5,line=opts.line||5.2,spacing=opts.after===undefined?4:opts.after;
     pdf.setFont(font,'normal');pdf.setFontSize(size);pdf.setTextColor(...(opts.color||black));
     const rows=pdf.splitTextToSize(String(value||''),opts.width||width);
     for(const row of rows){fit(line);pdf.text(row,left,y);y+=line;}
     y+=spacing;
   }
   function sectionHeading(title,color=blue,first=false){
     const split=pdf.splitTextToSize(title,width);
     fit(split.length*7+8);
     y+=first?4:5;
     pdf.setFont('InterSB','normal');pdf.setFontSize(12.5);pdf.setTextColor(...color);
     split.forEach(row=>{pdf.text(row,left,y);y+=6.6;});
     y+=5;
   }
   // Reference-led editorial structure: white pages, logo and black title,
   // red introductory heading, blue navigation headings; no IBKR branding.
   const displayTitle=selected==='agreement'?'Client Agreement':doc.englishTitle;
   pdf.setFont('InterR','normal');pdf.setFontSize(9.5);pdf.setTextColor(...black);
   pdf.text((profile.versionLabel||doc.version)+' | '+(profile.issueDate||''),210-right,19,{align:'right'});
   if(logoData&&logoData.startsWith('data:image/png')){
     try{
       const imgInfo=pdf.getImageProperties(logoData);
       let w=55,h=w*imgInfo.height/imgInfo.width;
       if(h>19){h=19;w=h*imgInfo.width/imgInfo.height;}
       pdf.addImage(logoData,'PNG',left,17,w,h,undefined,'FAST');y=Math.max(y,17+h+12);
     }catch(_){write(profile.companyName,{size:16,bold:true,after:5});}
   }else write(profile.companyName,{size:16,bold:true,after:5});
   fit(20);
   write(displayTitle,{size:19,bold:true,line:9,after:7});
   sectionHeading(selected==='agreement'?'About these Terms':'About this document',red,true);
   if(selected==='agreement'){
     write('This independent agreement draft describes the proposed rights and responsibilities of '+profile.companyName+' and the client named in the document. The legal provisions require review before use. Contact: '+profile.companyEmail+'.',{size:10.5,line:5.6,after:5});
     sectionHeading('ⓘ Important documents'.replace('ⓘ ','') ,blue,true);
     write('The complete agreement package may include the following separately approved documents:',{size:10.2,after:3});
     for(const item of ['Client Agreement (these Terms)','Account Opening Application','General Risk Disclosure','Express Consent / Electronic Acceptance','Costs and Charges; Privacy Policy; other applicable disclosures']){
       write('  •  '+item,{size:9.8,line:5.1,after:0});
     }
     y+=6;
     sectionHeading('Our legal relationship',blue,true);
     write('About us',{size:10.5,bold:true,after:4});
     write(profile.companyName+' is registered in '+profile.companyCountry+' under registration number '+profile.companyRegistration+'. Registered office: '+profile.companyAddress+'.',{size:10.2,line:5.5,after:5});
     write('The company contact address is '+profile.companyEmail+'. Any regulatory status or permission must be confirmed separately in the official registers before offering regulated services.',{size:10.2,line:5.5,after:5});
     write('Services and products',{size:10.5,bold:true,after:4});
     write('Services indicated in this draft: '+(profile.services||'[to be defined]')+'. Products indicated: '+(profile.products||'[to be defined]')+'.',{size:10.2,line:5.5,after:6});
     sectionHeading('Detailed contractual provisions',blue);
   }else{
     write('Prepared for '+profile.companyName+'. This is an independent working draft, not an executed or verified customer agreement.',{size:10.5,after:5});
     sectionHeading('Document information',blue);
   }
   const info=[['Company',profile.companyName],['Client',profile.clientName],['Client ID',profile.clientId],['Account',profile.accountId||'Not yet assigned'],['Registered address',profile.companyAddress],['Document version',profile.versionLabel||doc.version]];
   // Compact document metadata table.
   function tableRow(label,value){
     const a=pdf.splitTextToSize(String(label),43),b=pdf.splitTextToSize(String(value),width-51);
     const height=Math.max(a.length,b.length)*5.1+4;
     fit(height);
     pdf.setFillColor(246,247,248);pdf.rect(left,y-4,47,height,'F');
     pdf.setDrawColor(222,224,225);pdf.line(left,y+height-4,left+width,y+height-4);
     pdf.setFont('InterSB','normal');pdf.setFontSize(8.6);pdf.setTextColor(...gray);
     a.forEach((line,index)=>pdf.text(line,left+3,y+index*5.1));
     pdf.setFont('InterR','normal');pdf.setFontSize(8.6);pdf.setTextColor(...black);
     b.forEach((line,index)=>pdf.text(line,left+51,y+index*5.1));
     y+=height;
   }
   info.forEach(([label,value])=>tableRow(label,value));
   y+=8;
   for(const section of doc.sections){
     sectionHeading(section.title);
     for(const paragraph of section.paragraphs)write(paragraph,{size:9.6,line:5.25,after:5});
   }
   sectionHeading('Record of acceptance',blue);
   write('NOT EXECUTED. This document is a draft only. No signature, consent, onboarding approval, timestamp, or regulatory permission is certified by this export.',{size:9.6,bold:true,after:8});
   const total=pdf.getNumberOfPages();
   for(let p=1;p<=total;p++){
     pdf.setPage(p);pdf.setDrawColor(214,214,211);pdf.line(left,282,210-right,282);
     pdf.setFont('InterR','normal');pdf.setFontSize(8.3);pdf.setTextColor(...gray);
     pdf.text('WORKING DRAFT - NOT SIGNED | '+(profile.versionLabel||doc.version),left,288);
     pdf.text(p+' / '+total,210-right,288,{align:'right'});
   }
   const file='client_agreement_draft_'+doc.id+'_'+String(profile.clientId||'client').replace(/[^a-z0-9_-]/gi,'_')+'.pdf';
   pdf.save(file);
   status('PDF создан: '+file+'. Это неподписанный проект для юридической проверки.');
 }
 async function loadLogo(file){
   if(!file)return;
   if(file.size>1500000){status('Логотип не должен превышать 1,5 МБ.',true);return;}
   const version=++logoVersion;
   try{
     if(/\.svg$/i.test(file.name)||file.type==='image/svg+xml'){
       const svg=shared.sanitizeSvg(await file.text());
       const png=await shared.rasterizeSvg(svg);
       if(version!==logoVersion)return;
       logoData=png.dataUrl;
     }else if(file.type==='image/png'||file.type==='image/jpeg'){
       const url=await new Promise((resolve,reject)=>{
         const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(file);
       });
       const img=new Image();img.src=url;await img.decode();
       const canvas=document.createElement('canvas'),scale=Math.min(1,1000/Math.max(img.width,img.height));
       canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
       canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
       if(version!==logoVersion)return;
       logoData=canvas.toDataURL('image/png');
     }else throw new Error('Поддерживаются SVG, PNG или JPG.');
     save();status('Логотип загружен для предварительного просмотра и PDF и сохранён в этом браузере.');render();
   }catch(e){status('Ошибка загрузки логотипа: '+(e.message||'некорректный файл'),true);}
 }
 core.types.forEach((type,index)=>{
   const button=el('button','contracts-doc-button');button.type='button';button.dataset.contractType=type.id;
   button.append(el('span','contracts-doc-num',String(index+1).padStart(2,'0')));
   const copy=el('span');copy.append(el('strong','',type.title),el('small','',type.description));button.append(copy);
   button.addEventListener('click',()=>{selected=type.id;save();render();status('');});
   $('contracts-type-list').append(button);
 });
 $('contracts-sync').addEventListener('click',()=>syncFromTrade(true));
 $('contracts-export').addEventListener('click',exportPdf);
 $('contracts-logo-file').addEventListener('change',event=>{const file=event.target.files?.[0];event.target.value='';loadLogo(file);});
 $('contracts-reset-edits').addEventListener('click',()=>{
   if(!confirm('Сбросить изменения текста выбранного шаблона? Реквизиты компании сохранятся.'))return;
   delete overrides[selected];save();render();status('Текст восстановлен по шаблону.');
 });
 ensureLogo();fields();connectDesignControls();save();render();
})();
