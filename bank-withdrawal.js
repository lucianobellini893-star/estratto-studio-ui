/* Independent bank withdrawal statement module. Records operator-entered requests,
   not proof of transfer execution or bank receipt. Existing generators untouched. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),doc=window.EstrattoDocument,num=window.EstrattoAccount;
 const key='estratto-withdrawal.v1';
 const today=()=>new Date().toISOString().slice(0,10);
 const fresh=()=>({date:today(),reference:'',beneficiary:'',bank:'',iban:'',bic:'',amount:'',fee:'0',currency:'EUR',status:'requested',bankRef:'',details:''});
 const labels={date:'Дата заявки',reference:'Номер заявки',beneficiary:'Получатель',bank:'Банк получателя',iban:'IBAN / номер счёта',bic:'BIC / SWIFT',amount:'Сумма вывода',fee:'Комиссия',currency:'Валюта',status:'Статус',bankRef:'Референс банка (если подтверждён)',details:'Описание'};
 const logoSlot=$('withdrawal-logo-slot');
 const companyInputs={coName:$('wd-company-name'),coAddr:$('wd-company-address'),coSite:$('wd-company-site')};
 function syncCompanyFields(){
  const data=doc.getState?.()||{};
  for(const [key,input] of Object.entries(companyInputs)){
   if(input&&document.activeElement!==input)input.value=String(data[key]||'');
  }
 }
 function showValidation(text,error=true){
  const box=$('wd-validation');
  if(!box)return;
  box.textContent=text||'';
  box.hidden=!text;
  box.classList.toggle('error',!!error);
 }
 function moveLogoHere(){
  const editor=$('shared-logo-editor');
  if(!logoSlot||!editor)return;
  logoSlot.append(editor);
  const heading=$('h-logo')?.querySelector('.step');
  if(heading)heading.textContent='3';
  doc.relayoutLogo?.();
  syncCompanyFields();
 }
 const statuses={requested:'Richiesto',review:'In verifica',processing:'In elaborazione',sent:'Inviato (non verificato)',completed:'Completato (non verificato)',rejected:'Rifiutato',cancelled:'Annullato'};
 let state={client:'',publicId:'',date:today(),rows:[fresh()]};
 try{let saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&typeof saved==='object')state={...state,...saved,rows:Array.isArray(saved.rows)?saved.rows.slice(0,40):[fresh()]};}catch(_){}
 if(!state.rows.length)state.rows=[fresh()];
 let timer,last=null,buildId=0,viewId=0;
 const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 const notice=(text,error=false)=>{const p=$('wd-msg');p.textContent=text||'';p.hidden=!text;p.classList.toggle('error',error)};
 function store(){try{localStorage.setItem(key,JSON.stringify(state));}catch(_){notice('Не удалось сохранить черновик в браузере.',true)}}
 const amount=(val,zero=false)=>{let d=num.decimal(val||'0');if(d.units<0n||(!zero&&d.units===0n))throw Error('укажи положительную сумму');return num.money(num.toMoney(d));};
 function check(){
  const issues=[],rows=[],seen=new Set();
  if(!state.client.trim())issues.push('Заполни имя клиента.');
  if(!state.publicId.trim())issues.push('Заполни публичный ID.');
  if(!num.validDate(state.date))issues.push('Проверь дату выписки.');
  state.rows.forEach((r,i)=>{
   const p='Операция '+(i+1)+': ',get=k=>String(r[k]||'').trim();
   if(!num.validDate(get('date')))issues.push(p+'дата некорректна.');
   else if(num.validDate(state.date)&&get('date')>state.date)issues.push(p+'дата операции позже выписки.');
   if(!get('reference'))issues.push(p+'нужен номер заявки.');
   if(seen.has(get('reference').toLowerCase()))issues.push(p+'номер заявки повторяется.');
   seen.add(get('reference').toLowerCase());
   if(!get('beneficiary')||!get('bank'))issues.push(p+'укажи получателя и банк.');
   const iban=get('iban').replace(/\s+/g,'').toUpperCase(),bic=get('bic').replace(/\s+/g,'').toUpperCase(),currency=get('currency').toUpperCase();
   if(!/^[A-Z0-9]{4,45}$/.test(iban))issues.push(p+'проверь IBAN или номер банковского счёта.');
   if(bic&&!/^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(bic))issues.push(p+'BIC: 8 или 11 символов.');
   if(!/^[A-Z]{3}$/.test(currency))issues.push(p+'валюта должна состоять из 3 букв.');
   if(!statuses[get('status')])issues.push(p+'неверный статус.');
   if(get('status')==='requested'&&get('bankRef'))issues.push(p+'для простой заявки банковский референс должен быть пуст.');
   let total='—',fee='—';
   try{total=amount(get('amount'))}catch(e){issues.push(p+'сумма: '+e.message);}
   try{fee=amount(get('fee')||'0',true)}catch(e){issues.push(p+'комиссия: '+e.message);}
   rows.push({...r,iban,bic,currency,total,fee});
  });
  return {issues,rows};
 }
 function drawRows(){
  const target=$('wd-rows');target.replaceChildren();
  state.rows.forEach((r,i)=>{
   const section=el('section');section.className='wd-row';
   const head=el('div');head.className='wd-row-head';head.append(el('strong','Вывод '+(i+1)));
   const remove=el('button','Удалить');remove.className='btn small';remove.type='button';remove.disabled=state.rows.length===1;
   remove.addEventListener('click',()=>{state.rows.splice(i,1);drawRows();store();schedule()});head.append(remove);section.append(head);
   const grid=el('div');grid.className='wd-fields';
   Object.entries(labels).forEach(([name,label])=>{
    const wrap=el('label',label);wrap.className='f';
    const inp=el(name==='status'?'select':'input');
    if(name==='status')Object.entries(statuses).forEach(([value,text])=>{const opt=el('option',text);opt.value=value;inp.append(opt)});
    else{inp.type=name==='date'?'date':'text';inp.maxLength=name==='details'?200:110;}
    inp.value=r[name]||'';
    inp.addEventListener('input',()=>{r[name]=inp.value;store();schedule()});
    wrap.append(inp);grid.append(wrap);
   });
   section.append(grid);target.append(section);
  });
  $('wd-count').textContent=String(state.rows.length);
 }
 function renderContent(model){
  return ({doc:pdf,f,C,MX,RIGHT,PT,FRAME_FIRST,FRAME_NEXT,FRAME_BOTTOM})=>{
   let y=FRAME_FIRST;const width=RIGHT-MX;
   const next=()=>{pdf.addPage('a4','landscape');y=FRAME_NEXT};
   const ensure=h=>{if(y+h>FRAME_BOTTOM)next()};
   f('InterSB',12,C.BLUE);pdf.text('Prelievi verso conti bancari',MX,y+4);y+=12;
   f('InterR',8,C.GRAY);
   for(const line of pdf.splitTextToSize('Riepilogo delle richieste di prelievo basato sui dati indicati. Non costituisce una conferma bancaria di esecuzione, invio o accredito.',width)){ensure(5);pdf.text(line,MX,y+3);y+=5}y+=4;
   model.rows.forEach((r,i)=>{
    const rows=[['Data richiesta',r.date.split('-').reverse().join('/')],['Riferimento',r.reference],['Stato',statuses[r.status]],['Beneficiario',r.beneficiary],['Banca beneficiaria',r.bank],['IBAN / Conto',r.iban],['BIC / SWIFT',r.bic||'—'],['Importo richiesto',r.total+' '+r.currency],['Commissione',r.fee+' '+r.currency],['Riferimento bancario',r.bankRef||'Non indicato'],['Descrizione',r.details||'—']];
    ensure(23);f('InterSB',10,C.BLUE);pdf.text('Prelievo '+(i+1)+' — '+r.reference,MX,y+4);y+=9;
    pdf.setFillColor(C.HEAD);pdf.rect(MX,y,width,8,'F');f('InterSB',7.5,C.SOFT);
    pdf.text('CAMPO',MX+4,y+5.5);pdf.text('DETTAGLI',MX+70,y+5.5);y+=8;
    rows.forEach(([label,value],j)=>{
     const lines=pdf.splitTextToSize(String(value),width-80),h=Math.max(9,lines.length*4+3);
     if(y+h>FRAME_BOTTOM){next();f('InterSB',9,C.BLUE);pdf.text('Prelievo '+(i+1)+' (segue)',MX,y+4);y+=9}
     if(j%2){pdf.setFillColor(C.ALT);pdf.rect(MX,y,width,h,'F')}
     pdf.setDrawColor(C.LINE);pdf.setLineWidth(.4*PT);pdf.line(MX,y+h,RIGHT,y+h);
     f('InterR',8,C.GRAY);pdf.text(label,MX+4,y+5);
     f(j===2?'InterSB':'InterR',8.2,C.BLACK);lines.forEach((line,k)=>pdf.text(line,MX+70,y+5+k*4));y+=h;
    });y+=8;
   });
   ensure(12);f('InterR',7.5,C.GRAY);
   for(const line of pdf.splitTextToSize('Stati e riferimenti inseriti dall’operatore e non verificati dalla banca. Per la prova del bonifico occorre la documentazione del prestatore di servizi di pagamento.',width)){ensure(4);pdf.text(line,MX,y+3);y+=4}
  };
 }
 async function preview(bytes,id){
  if(!window.pdfjsLib)return;
  const stage=$('wd-stage'),pdf=await pdfjsLib.getDocument({data:new Uint8Array(bytes.slice(0))}).promise;
  try{
   const fragment=document.createDocumentFragment(),w=Math.max(320,stage.clientWidth-30),dpr=Math.max(1.5,Math.min(devicePixelRatio||1,2.5));
   for(let i=1;i<=pdf.numPages;i++){
    const p=await pdf.getPage(i),base=p.getViewport({scale:1}),view=p.getViewport({scale:w/base.width*dpr}),canvas=el('canvas');
    canvas.width=Math.round(view.width);canvas.height=Math.round(view.height);
    await p.render({canvasContext:canvas.getContext('2d'),viewport:view}).promise;
    if(id!==viewId)return;
    fragment.append(canvas,el('div','стр. '+i+' из '+pdf.numPages));
   }
   if(id===viewId)stage.replaceChildren(fragment);
  }finally{await pdf.destroy()}
 }
 async function build(){
  const id=++buildId,checked=check();
  if(checked.issues.length){last=null;$('wd-download').disabled=false;$('wd-status').textContent='Нужно исправить данные';notice(checked.issues[0],true);showValidation(checked.issues[0]);return}
  $('wd-status').textContent='Готовлю PDF…';$('wd-download').disabled=false;notice('');showValidation('');
  try{
   const profile=doc.collectProfile();
   if(!profile.coName||!profile.coAddr?.length)throw Error('В настройках выписок укажи настоящее название и адрес компании.');
   const data={...profile,mode:'conto',trades:[],clientName:state.client.trim(),clientId:'',publicId:state.publicId.trim(),referenceDate:state.date.split('-').reverse().join('/'),toIso:state.date,accountBalance:'',accountCurrency:'',disclaimer:'Prospetto basato sui dati inseriti. Non costituisce conferma bancaria di bonifico o accredito.'};
   const pdf=await doc.buildPdf(data,renderContent(checked));
   if(id!==buildId)return;
   last={bytes:pdf.bytes,pages:pdf.pages};$('wd-download').disabled=false;
   $('wd-status').textContent=pdf.pages+' стр. · '+checked.rows.length+' операций';
   if($('page-withdrawal').classList.contains('active'))await preview(pdf.bytes,++viewId);
  }catch(e){if(id!==buildId)return;last=null;$('wd-download').disabled=false;$('wd-status').textContent='PDF недоступен';const why='Не удалось создать PDF: '+(e?.message||'неизвестно');notice(why,true);showValidation(why)}
 }
 function schedule(){last=null;clearTimeout(timer);timer=setTimeout(build,450)}
 for(const [id,key] of [['wd-client','client'],['wd-id','publicId'],['wd-date','date']]){
  $(id).value=state[key]||'';$(id).addEventListener('input',()=>{state[key]=$(id).value;store();schedule()});
 }
 $('wd-add').addEventListener('click',()=>{if(state.rows.length>=40)return notice('Максимум 40 выводов.',true);state.rows.push(fresh());drawRows();store();schedule()});
 $('wd-copy-client').addEventListener('click',()=>{
  const p=doc.getState?.()||{};
  state.client=p.clientName||state.client;state.publicId=p.publicId||p.clientId||state.publicId;
  $('wd-client').value=state.client;$('wd-id').value=state.publicId;store();schedule()
 });
 $('wd-download').addEventListener('click',async()=>{
  // Clicking download always attempts an up-to-date build and reports failures visibly.
  if(!last){
   clearTimeout(timer);
   await build();
   if(!last){$('wd-validation')?.scrollIntoView({block:'center',behavior:'smooth'});return;}
  }
  try{
   const blob=new Blob([last.bytes],{type:'application/pdf'}),filename='Prelievi_bancari_'+state.date+'.pdf';
   if(window.EstrattoDownloads?.save)await window.EstrattoDownloads.save({filename,data:blob});
   else{const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),20000)}
   notice('PDF сохранён. Статусы не являются банковским подтверждением.');
  }catch(e){notice('Не удалось скачать PDF: '+(e?.message||'ошибка'),true)}
 });
 // The legal-entity fields and SVG editor are the same ones used by other statements.
 for(const [key,input] of Object.entries(companyInputs)){
  input?.addEventListener('input',()=>{
   const original={coName:'co-name',coAddr:'co-addr',coSite:'co-site'}[key];
   const base=$(original);
   if(!base||base.value===input.value)return;
   base.value=input.value;
   base.dispatchEvent(new Event('input',{bubbles:true}));
  });
 }
 document.addEventListener('estratto:profilechange',()=>{
  syncCompanyFields();
  if($('page-withdrawal').classList.contains('active'))schedule();
 });
 document.addEventListener('estratto:navigate',e=>{
  if(e.detail==='withdrawal'){moveLogoHere();schedule();}
 });
 drawRows();syncCompanyFields();
 if($('page-withdrawal').classList.contains('active')){moveLogoHere();schedule();}
})();