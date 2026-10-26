/* Independent mail drafts; never changes either PDF profile. */
(() => {
  'use strict';
  const core=window.EstrattoMail,shared=window.EstrattoDocument,$=id=>document.getElementById(id),key='estratto-mail.v1';
  let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch(_){}
  const state={title:'',text:'',logoUrl:'',logoHeight:32,layout:'horizontal',parts:[],...saved,logoData:''};
  if(!Array.isArray(state.parts))state.parts=[];
  state.parts=state.parts.slice(0,4);let sequence=0,busy=false,timer;
  const options={fontBase:new URL('fonts/',location.href).href};
  function message(id,text,error=false){const box=$(id);box.textContent=text;box.hidden=!text;box.classList.toggle('error',error);}
  function persist(){try{const {logoData,...draft}=state;localStorage.setItem(key,JSON.stringify(draft));}catch(_){message('mail-export-message','Не удалось сохранить черновик в браузере. Скачайте HTML, чтобы сохранить письмо.',true);}}
  function refresh(){
    $('mail-frame').srcdoc=core.build(state,{...options,preview:true,placeholder:true}).html;
    $('mail-code').value=core.build(state,options).html;
    $('mail-logo-size-value').textContent=state.logoHeight+' px';
    $('mail-logo-download').disabled=!state.logoData||busy;
    const stage=$('mail-logo-stage');stage.replaceChildren();
    const source=core.https(state.logoUrl)||core.png(state.logoData);
    if(source){const img=new Image();img.src=source;img.alt='Логотип письма';const size=core.dimensions(state);img.width=size.width;img.height=size.height;stage.append(img);}
    else {const span=document.createElement('span');span.className='dim';span.textContent=busy?'Подготовка логотипа…':'Загрузите свой SVG — логотип появится слева над письмом.';stage.append(span);}
  }
  function partsUI(){
    $('mail-logo-add-wrap').hidden=!state.parts.length||state.parts.length>=4;
    $('mail-logo-remove').hidden=!state.parts.length;
    $('mail-logo-composition').hidden=state.parts.length<2;
    $('mail-logo-layout').value=state.layout;
    const list=$('mail-logo-parts');list.replaceChildren();
    state.parts.forEach((part,index)=>{
      const row=document.createElement('div');row.className='mail-part';
      const label=document.createElement('label');label.className='f';label.textContent=part.name||'Часть '+(index+1);
      const range=document.createElement('input');range.type='range';range.min=25;range.max=200;range.value=part.scale||100;range.setAttribute('aria-label','Масштаб: '+label.textContent);
      const output=document.createElement('output');output.textContent=range.value+'%';
      range.addEventListener('input',()=>{part.scale=Number(range.value);output.textContent=range.value+'%';renderLogo();});label.append(range,output);
      const remove=document.createElement('button');remove.type='button';remove.className='btn small';remove.textContent='Удалить часть';remove.addEventListener('click',()=>{state.parts.splice(index,1);partsUI();renderLogo();});row.append(label,remove);list.append(row);
    });
  }
  async function renderLogo(){
    const version=++sequence;busy=true;refresh();
    try{
      if(state.parts.length){
        const svg=window.EstrattoLogoComposer.compose(state.parts.map(part=>({...part,svg:shared.sanitizeSvg(part.svg)})),state.layout,12);
        const image=await shared.rasterizeSvg(svg);if(version!==sequence)return;
        state.logoData=image.dataUrl;state.logoRatio=image.ratio;
      }else {state.logoData='';state.logoRatio=4;}
      message('mail-logo-message','');
    }catch(_){if(version!==sequence)return;state.logoData='';message('mail-logo-message','Не удалось обработать SVG. Загрузите корректный файл ещё раз.',true);}
    finally{if(version===sequence){busy=false;persist();refresh();}}
  }
  async function upload(input,append){
    const files=[...input.files];input.value='';if(!files.length)return;
    try{
      if(files.length+(append?state.parts.length:0)>4)throw new Error('Можно загрузить до четырёх частей логотипа.');
      const parts=[];for(const file of files){if(file.size>1000000)throw new Error('Размер одного SVG — до 1 МБ.');const text=await file.text();const svg=shared.sanitizeSvg(text);parts.push({id:'mail'+Date.now()+parts.length,name:file.name,svg:new XMLSerializer().serializeToString(svg),scale:100});}
      const next=append?[...state.parts,...parts]:parts;
      if(next.reduce((sum,part)=>sum+part.svg.length,0)>750000)throw new Error('Слишком большой логотип. Уменьшите размер SVG.');
      state.parts=next;partsUI();await renderLogo();
    }catch(error){message('mail-logo-message',error.message==='parse'?'Это не корректный SVG-файл.':error.message,true);}
  }
  for(const [id,field] of [['mail-title','title'],['mail-text','text'],['mail-logo-url','logoUrl'],['mail-logo-size','logoHeight']]){
    $(id).value=state[field];$(id).addEventListener('input',()=>{state[field]=id==='mail-logo-size'?Number($(id).value):$(id).value;$(id).removeAttribute('aria-invalid');message('mail-export-message','');clearTimeout(timer);timer=setTimeout(()=>{persist();refresh();},140);});
  }
  $('mail-logo-file').addEventListener('change',event=>upload(event.target,false));
  $('mail-logo-add').addEventListener('change',event=>upload(event.target,true));
  $('mail-logo-remove').addEventListener('click',()=>{state.parts=[];partsUI();renderLogo();});
  $('mail-logo-layout').addEventListener('change',()=>{state.layout=$('mail-logo-layout').value;renderLogo();});
  function ready(){
    const issues=core.validate(state);document.querySelectorAll('#page-mail [aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
    if(issues.length){for(const issue of issues)$(issue.field).setAttribute('aria-invalid','true');$(issues[0].field).focus();message('mail-export-message',issues[0].message,true);return false;}
    if(busy){message('mail-export-message','Дождитесь подготовки логотипа.',true);return false;}
    if(state.parts.length&&!state.logoData){message('mail-export-message','Загрузите корректный логотип или уберите его.',true);return false;}return true;
  }
  function download(content,type,name){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  $('mail-copy-html').addEventListener('click',async()=>{
    if(!ready())return;const html=core.build(state,options).html;
    try{await navigator.clipboard.writeText(html);message('mail-export-message','HTML скопирован. Вставьте его в редактор исходного HTML письма.');}
    catch(_){$('mail-source').open=true;$('mail-code').value=html;$('mail-code').focus();$('mail-code').select();message('mail-export-message','Код выделен. Нажмите Ctrl+C или ⌘C, чтобы скопировать.');}
  });
  $('mail-copy-formatted').addEventListener('click',async()=>{
    if(!ready())return;const built=core.build(state,options);
    try{await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([built.html],{type:'text/html'}),'text/plain':new Blob([built.plainText],{type:'text/plain'})})]);message('mail-export-message','Оформленное письмо скопировано. Вставьте его в тело нового письма Hostinger. Проверьте логотип перед отправкой.');}
    catch(_){message('mail-export-message','Браузер не разрешил копирование оформления. Используйте HTML-код или скачайте файл письма.',true);}
  });
  $('mail-download-html').addEventListener('click',()=>{if(ready())download(core.build(state,options).html,'text/html;charset=utf-8','messaggio.html');});
  $('mail-download-eml').addEventListener('click',()=>{if(ready())download(core.eml(state,options),'message/rfc822','messaggio.eml');});
  $('mail-logo-download').addEventListener('click',()=>{if(state.logoData){const a=document.createElement('a');a.href=state.logoData;a.download='logo-mail.png';a.click();}});
  for(const device of ['desktop','mobile'])$('mail-'+device).addEventListener('click',()=>{for(const item of ['desktop','mobile'])$('mail-'+item).setAttribute('aria-pressed',String(item===device));$('mail-preview-stage').classList.toggle('phone',device==='mobile');});
  partsUI();renderLogo();
})();
