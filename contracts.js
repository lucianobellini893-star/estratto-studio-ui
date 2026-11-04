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
   issueDate:new Date().toISOString().slice(0,10)
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
   const groups=[
     {title:'Компания',rows:[
       ['companyName','Название компании'],['companyAddress','Юридический адрес','textarea'],
       ['companyCountry','Страна регистрации'],['companyRegistration','Регистрационный номер'],
       ['companyEmail','Email компании'],['companyWebsite','Сайт'],
       ['regulator','Регулятор (только если подтверждён)'],['authorization','Номер лицензии (только если есть)'],
       ['governingLaw','Применимое право'],['jurisdiction','Компетентный суд / орган'],
       ['complaintsEmail','Email для жалоб'],['protectionScheme','Схема защиты инвесторов (если действует)'],
       ['services','Фактически доступные услуги','textarea'],['products','Доступные продукты','textarea'],
       ['feeSchedule','Ссылка или версия тарифов'],['signatureMethod','Реальный способ подтверждения']
     ]},
     {title:'Клиент и документ',rows:[
       ['clientName','Имя и фамилия клиента'],['clientId','ID клиента'],
       ['accountId','Номер счёта (если присвоен)'],['clientCountry','Страна проживания'],
       ['issueDate','Дата составления','date']
     ]}
   ];
   for(const group of groups){
     const label=el('div','contracts-label',group.title);container.append(label);
     const grid=el('div','contracts-field-grid');container.append(grid);
     for(const [name,title,type] of group.rows){
       const wrapper=el('label','contracts-field'+(type==='textarea'?' wide':''));
       wrapper.append(document.createTextNode(title));
       const input=el(type==='textarea'?'textarea':'input');
       if(type!=='textarea')input.type=type==='date'?'date':'text';
       else input.rows=2;
       input.value=profile[name]||'';
       input.dataset.contractField=name;
       input.autocomplete='off';
       input.addEventListener('input',()=>{profile[name]=input.value;save();render();});
       wrapper.append(input);grid.append(wrapper);
     }
   }
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
   $('contracts-selected-version').textContent='DRAFT • '+doc.version;
   document.querySelectorAll('[data-contract-type]').forEach(button=>button.classList.toggle('active',button.dataset.contractType===selected));
   const missing=$('contracts-missing');
   if(doc.missing.length){
     missing.textContent='Для подготовки документа не заполнены: '+doc.missing.join(', ')+'.';
     missing.hidden=false;
   }else missing.hidden=true;
   const page=$('contracts-document');page.replaceChildren();
   const top=el('div');
   if(logoData){
     const logo=el('img','contracts-preview-logo');
     logo.alt='Логотип компании';logo.src=logoData;top.append(logo);
   }else top.append(el('div','contracts-label',profile.companyName||'COMPANY'));
   top.append(el('div','contracts-topline'));
   const company=el('p','contracts-meta',(profile.companyName||'[COMPANY]')+' · '+(profile.companyAddress||'[ADDRESS]'));
   top.append(company);page.append(top);
   page.append(el('h1','',doc.title));
   page.append(el('p','contracts-meta',doc.englishTitle+' · Versione '+doc.version+' · Data '+(profile.issueDate||'[DA COMPLETARE]')));
   const parties=el('div','contracts-parties');
   parties.append(el('strong','',profile.companyName||'[Ragione sociale da compilare]'));
   parties.append(el('div','', 'Cliente: '+(profile.clientName||'[Nome da compilare]')+' · ID: '+(profile.clientId||'[ID da compilare]')));
   parties.append(el('div','', 'N. conto: '+(profile.accountId||'[non assegnato]')));
   page.append(parties);
   const warning=el('div','contracts-draft-note','BOZZA NON FIRMATA — Questo documento non è un contratto Interactive Brokers e non prova alcuna accettazione. Richiede revisione legale e verifica delle autorizzazioni prima dell’uso con clienti.');
   page.append(warning);
   for(const section of doc.sections){
     page.append(el('h2','',section.title));
     for(const paragraph of section.paragraphs)page.append(el('p','',paragraph));
   }
   page.append(el('div','contracts-footer','BOZZA • Nessuna firma registrata • '+doc.version+' • '+(profile.issueDate||'data da definire')));
   renderEditor(doc);
 }
 function renderEditor(doc){
   const holder=$('contracts-clauses');holder.replaceChildren();
   const label=el('div','contracts-label','MODIFICA DEL TESTO DELLA BOZZA');holder.append(label);
   const help=el('p','contracts-lock','I paragrafi sono modificabili. Le modifiche restano in questo browser e valgono solo per il tipo di documento selezionato. Non inserire attestazioni false di firma, licenza o accettazione.');
   holder.append(help);
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
     holder.append(details);
   });
 }
 function renderDocumentOnly(){
   const y=window.scrollY;
   updating=true;
   const doc=sectionsFor(selected),page=$('contracts-document');page.replaceChildren();
   if(logoData){const img=el('img','contracts-preview-logo');img.alt='Логотип компании';img.src=logoData;page.append(img);}
   page.append(el('div','contracts-topline'));
   page.append(el('p','contracts-meta',profile.companyName||'[COMPANY]'));
   page.append(el('h1','',doc.title));
   page.append(el('p','contracts-meta',doc.englishTitle+' · '+doc.version+' · '+(profile.issueDate||'[DATE]')));
   page.append(el('div','contracts-draft-note','BOZZA NON FIRMATA — Revisione legale necessaria. Nessuna accettazione verificata.'));
   for(const section of doc.sections){page.append(el('h2','',section.title));for(const paragraph of section.paragraphs)page.append(el('p','',paragraph));}
   page.append(el('div','contracts-footer','Documento non firmato · '+doc.version));
   updating=false;
 }
 async function exportPdf(){
   const doc=sectionsFor(selected);
   const missing=doc.missing;
   if(missing.length){status('Completa prima i dati obbligatori: '+missing.join(', '),true);return;}
   const jsPDF=window.jspdf?.jsPDF;
   if(!jsPDF){status('Il motore PDF non è disponibile.',true);return;}
   const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
   try{
     for(const [family,file] of [['InterR','Inter-Regular.ttf'],['InterSB','Inter-SemiBold.ttf']]){
       const response=await fetch('fonts/'+file);
       if(!response.ok)throw new Error('Font '+file+' non disponibile');
       const bytes=new Uint8Array(await response.arrayBuffer());
       let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));
       pdf.addFileToVFS(file,btoa(binary));
       pdf.addFont(file,family,'normal');
     }
   }catch(e){status('Не удалось загрузить шрифты для PDF: '+e.message,true);return;}
   const margin=19,pageW=210,pageH=297,width=pageW-margin*2;
   let y=25,pageNo=1;
   const addPage=()=>{pdf.addPage();pageNo++;y=25};
   function ensure(height){if(y+height>pageH-24)addPage();}
   function text(value,{size=10,bold=false,gap=5,line=5.2,color=[40,40,40]}={}){
     pdf.setFont(bold?'InterSB':'InterR','normal');
     pdf.setFontSize(size);pdf.setTextColor(...color);
     const wraps=pdf.splitTextToSize(String(value||''),width);
     for(const row of wraps){
       ensure(line);
       pdf.text(row,margin,y);
       y+=line;
     }
     y+=gap;
   }
   pdf.setDrawColor(160,160,155);
   if(logoData&&logoData.startsWith('data:image/png')){
     try{pdf.addImage(logoData,'PNG',margin,y,40,15,undefined,'FAST');y+=19}catch(_){}
   }
   text(profile.companyName,{bold:true,size:11,gap:3});
   text(profile.companyAddress,{size:8,gap:5,color:[106,106,99]});
   pdf.line(margin,y,pageW-margin,y);y+=9;
   text(doc.title,{size:17,bold:true,line:7,gap:5});
   text(doc.englishTitle+' · '+doc.version+' · '+profile.issueDate,{size:9,color:[105,105,99],gap:7});
   text('Societa: '+profile.companyName+' | Cliente: '+profile.clientName+' | ID: '+profile.clientId,{size:9,gap:8});
   text('BOZZA NON FIRMATA - Documento non approvato e non sottoscritto. Necessaria revisione legale.',{size:9,bold:true,color:[145,72,32],gap:8});
   for(const section of doc.sections){
     ensure(16);text(section.title,{size:11,bold:true,gap:3,line:6});
     for(const paragraph of section.paragraphs)text(paragraph,{size:9.5,gap:5,line:5.15});
     y+=2;
   }
   const total=pdf.getNumberOfPages();
   for(let p=1;p<=total;p++){
     pdf.setPage(p);pdf.setFont('InterR','normal');pdf.setFontSize(8);pdf.setTextColor(125,125,120);
     pdf.line(margin,282,pageW-margin,282);
     pdf.text('BOZZA NON FIRMATA - '+doc.version,margin,288);
     pdf.text(p+' / '+total,pageW-margin,288,{align:'right'});
   }
   const filename='draft_'+doc.id+'_'+String(profile.clientId||'client').replace(/[^a-zA-Z0-9_-]/g,'_')+'.pdf';
   pdf.save(filename);
   status('Scaricato: '+filename+'. È una bozza non firmata; richiede verifica legale.');
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
 ensureLogo();fields();save();render();
})();
