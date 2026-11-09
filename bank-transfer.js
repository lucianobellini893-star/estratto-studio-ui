/* Standalone beneficiary bank transfer summary; independent from trading and bank withdrawal statements. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const shared=window.EstrattoDocument;
 const numbers=window.EstrattoAccount;
 const renderer=window.EstrattoTransferPdf;
 const storageKey='estratto-bank-transfer.v1';
 const today=()=>{
  const date=new Date();
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
 };
 const empty=()=>({date:today(),reference:'',beneficiary:'',bank:'',iban:'',bic:'',amount:'',fee:'0',currency:'EUR',status:'requested',bankRef:'',details:''});
 const statuses={requested:'In attesa di accredito',review:'Trasferimento in verifica',processing:'Trasferimento in elaborazione',sent:'Inviato alla banca',completed:'Accredito confermato',rejected:'Trasferimento respinto',cancelled:'Trasferimento annullato'};
 const labels={date:'Дата перевода / заявки',reference:'Идентификатор перевода (необязательно)',beneficiary:'Получатель средств',bank:'Название банка',iban:'IBAN / номер счёта',bic:'BIC / SWIFT (необязательно)',amount:'Сумма к получению',fee:'Комиссия',currency:'Валюта',status:'Статус поступления средств',bankRef:'Референс / подтверждение банка (при наличии)',details:'Примечание'};
 let state={client:'',publicId:'',rows:[empty()]};
 try{
  const saved=JSON.parse(localStorage.getItem(storageKey)||'null');
  if(saved&&typeof saved==='object')state={
   client:String(saved.client||''),publicId:String(saved.publicId||''),
   rows:[{...empty(),...((Array.isArray(saved.rows)&&saved.rows[0])||{})}]
  };
 }catch(_){}
 const entry=state.rows[0];
 let last=null,cycle=0,viewCycle=0,timer;
 const make=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
 const notice=(text,error=false)=>{
  for(const id of ['bt-msg','bt-validation']){
   const el=$(id);if(!el)continue;el.textContent=text||'';el.hidden=!text;el.classList.toggle('error',error);
  }
 };
 function save(){
  try{localStorage.setItem(storageKey,JSON.stringify({client:state.client,publicId:state.publicId,rows:[entry]}));}
  catch(_){notice('Не получилось сохранить черновик в браузере. Проверь настройки локального хранилища.',true);}
 }
 function values(){
  const errors=[];
  if(!state.client.trim())errors.push('Укажи имя клиента.');
  if(!numbers.validDate(entry.date))errors.push('Укажи корректную дату перевода.');
  if(!entry.beneficiary.trim())errors.push('Укажи получателя банковского перевода.');
  if(!entry.bank.trim())errors.push('Укажи название банка получателя.');
  const iban=String(entry.iban||'').replace(/\s/g,'').toUpperCase();
  const bic=String(entry.bic||'').replace(/\s/g,'').toUpperCase();
  const currency=String(entry.currency||'').trim().toUpperCase();
  if(!/^[A-Z0-9]{4,45}$/.test(iban))errors.push('Укажи корректный IBAN или номер банковского счёта.');
  if(bic&&!/^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(bic))errors.push('BIC/SWIFT должен состоять из 8 или 11 букв и цифр.');
  if(!/^[A-Z]{3}$/.test(currency))errors.push('Укажи валюту тремя латинскими буквами.');
  if(!statuses[entry.status])errors.push('Выбери статус вывода.');
  let sum='',fee='';
  try{
   const amount=numbers.decimal(entry.amount,'Сумма перевода');
   if(amount.units<=0n)throw Error('Сумма вывода должна быть больше нуля.');
   sum=numbers.money(numbers.toMoney(amount));
  }catch(e){errors.push(e.message);}
  try{
   const amount=numbers.decimal(entry.fee||'0','Комиссия');
   if(amount.units<0n)throw Error('Комиссия не может быть отрицательной.');
   fee=numbers.money(numbers.toMoney(amount));
  }catch(e){errors.push(e.message);}
  if(entry.status==='completed'&&!entry.bankRef.trim())errors.push('Для статуса «Accredito confermato» необходим реальный банковский референс, подтверждающий зачисление.');
  return {errors,transfer:{...entry,iban,bic,currency},sum,fee};
 }
 function fields(){
  const root=$('bt-rows');root.replaceChildren();
  const grid=make('div');grid.className='bt-fields';
  for(const [field,label] of Object.entries(labels)){
   const holder=make('label',label);holder.className='f';
   const el=make(field==='status'?'select':'input');
   if(field==='status'){
    for(const [key,value] of Object.entries(statuses)){
     const option=make('option',value);option.value=key;el.append(option);
    }
   }else{
    el.type=field==='date'?'date':'text';el.autocomplete='off';
    el.maxLength=field==='details'?200:field==='iban'?45:110;
   }
   if(field==='iban')el.placeholder='IT60 X054 2811 1010 0000 0123 456';
   if(field==='reference')el.placeholder='TR-2026-0001';
   el.value=entry[field]||'';
   el.addEventListener('input',()=>{
    entry[field]=el.value;
    save();schedule();
   });
   holder.append(el);grid.append(holder);
  }
  root.append(grid);
 }
 const logoSlot=$('transfer-logo-slot');
 const companyFields={coName:$('bt-company-name'),coAddr:$('bt-company-address'),coSite:$('bt-company-site')};
 function syncCompany(){
  const data=shared.getState?.()||{};
  for(const [key,input] of Object.entries(companyFields)){
   if(input&&document.activeElement!==input)input.value=String(data[key]||'');
  }
 }
 function attachLogo(){
  const editor=$('shared-logo-editor');
  if(editor&&logoSlot){logoSlot.append(editor);shared.relayoutLogo?.();}
  syncCompany();
 }
 async function drawPreview(bytes,renderId){
  const stage=$('bt-stage');
  if(!window.pdfjsLib){stage.textContent='PDF создан. Просмотр недоступен, скачивание работает.';return;}
  const pdf=await pdfjsLib.getDocument({data:new Uint8Array(bytes.slice(0))}).promise;
  try{
   const frag=document.createDocumentFragment();
   const width=Math.max(300,stage.clientWidth-28),dpr=Math.min(2.2,Math.max(1.3,window.devicePixelRatio||1));
   for(let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i),normal=page.getViewport({scale:1});
    const vp=page.getViewport({scale:width/normal.width*dpr}),canvas=make('canvas');
    canvas.width=Math.round(vp.width);canvas.height=Math.round(vp.height);
    canvas.setAttribute('aria-label','Банковский перевод: страница '+i);
    await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
    if(renderId!==viewCycle)return;
    frag.append(canvas);
   }
   if(renderId===viewCycle)stage.replaceChildren(frag);
  }finally{await pdf.destroy();}
 }
 async function build(){
  const id=++cycle;
  const valid=values();
  if(valid.errors.length){
   last=null;$('bt-status').textContent='Нужно заполнить данные';
   notice(valid.errors[0],true);return false;
  }
  notice('');$('bt-status').textContent='Формирую отдельный PDF…';
  try{
   const profile=shared.collectProfile();
   if(!profile.coName)throw Error('Укажи название своей компании в блоке оформления.');
   if(!renderer?.generate)throw Error('Модуль отдельного PDF не загрузился. Обнови страницу.');
   const pdf=await renderer.generate({
    state,entry:valid.transfer,profile,statusLabel:statuses[entry.status],
    amount:valid.sum,fee:valid.fee
   });
   if(id!==cycle)return false;
   last={bytes:pdf.bytes};
   $('bt-status').textContent='PDF готов · перевод на счёт получателя';
   if($('page-transfer').classList.contains('active')){
    try{await drawPreview(pdf.bytes,++viewCycle);}
    catch(e){notice('PDF готов и скачивается. Ошибка только в предпросмотре: '+(e.message||'неизвестно'),true);}
   }
   return true;
  }catch(error){
   if(id!==cycle)return false;
   last=null;$('bt-status').textContent='Ошибка PDF';
   notice('Не удалось создать PDF: '+(error?.message||'неизвестная ошибка'),true);
   return false;
  }
 }
 function schedule(){last=null;clearTimeout(timer);timer=setTimeout(build,360);}
 for(const [id,key] of [['bt-client','client'],['bt-id','publicId']]){
  const input=$(id);input.value=state[key]||'';
  input.addEventListener('input',()=>{state[key]=input.value;save();schedule();});
 }
 $('bt-download').addEventListener('click',async()=>{
  if(!last){clearTimeout(timer);await build();}
  if(!last){$('bt-validation')?.scrollIntoView({block:'center',behavior:'smooth'});return;}
  try{
   const file=new Blob([last.bytes],{type:'application/pdf'});
   const filename='Trasferimento_bancario_'+entry.date+'.pdf';
   if(window.EstrattoDownloads?.save)await window.EstrattoDownloads.save({filename,data:file});
   else{
    const url=URL.createObjectURL(file),link=make('a');
    link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),20000);
   }
   notice('Документ скачан. Документ составлен по введённым данным. Он не заменяет подтверждение банка.');
  }catch(e){notice('Не удалось скачать: '+(e.message||'ошибка'),true);}
 });
 for(const [key,input] of Object.entries(companyFields)){
  input?.addEventListener('input',()=>{
   const original=$( {coName:'co-name',coAddr:'co-addr',coSite:'co-site'}[key]);
   if(!original||original.value===input.value)return;
   original.value=input.value;
   original.dispatchEvent(new Event('input',{bubbles:true}));
  });
 }
 document.addEventListener('estratto:profilechange',()=>{
  syncCompany();
  if($('page-transfer').classList.contains('active'))schedule();
 });
 document.addEventListener('estratto:navigate',event=>{
  if(event.detail==='transfer'){attachLogo();schedule();}
 });
 fields();syncCompany();
 if($('page-transfer').classList.contains('active')){attachLogo();schedule();}
})();