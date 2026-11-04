/* Independent mail drafts; never changes either PDF profile. */
(() => {
  'use strict';
  const core=window.EstrattoMail,shared=window.EstrattoDocument,$=id=>document.getElementById(id),key='estratto-mail.v1';
  let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch(_){}
  const state={title:'',text:'',logoUrl:'',logoHeight:32,layout:'horizontal',parts:[],footerEnabled:false,footerStyle:'card',footerLabel:'Powered by',footerCompany:'',signatureName:'',signatureRole:'',signaturePhone:'',signatureEmail:'',signatureAddress:'',signatureLinkedin:'',signatureWhatsapp:'',signatureTelegram:'',signatureInstagram:'',signaturePhoto:'',...saved,logoData:''};
  if(!Array.isArray(state.parts))state.parts=[];
  state.parts=state.parts.slice(0,4);let sequence=0,busy=false,timer;
  const options={fontBase:new URL('fonts/',location.href).href};
  let interactiveSvg='',logoUnits=[],logoSelection=[];
  const shapeSelector='path,rect,circle,ellipse,polygon,polyline,line,text,use';
  const hexColor=value=>{
    const match=String(value||'').match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
    if(match)return '#'+[match[1],match[2],match[3]].map(n=>Number(n).toString(16).padStart(2,'0')).join('').toUpperCase();
    return /^#[a-f0-9]{6}$/i.test(String(value||''))?value.toUpperCase():null;
  };
  function paintUnit(unit,color){
    if(unit.getAttribute('fill')!=='none')unit.style.setProperty('fill',color,'important');
    if(unit.getAttribute('stroke')&&unit.getAttribute('stroke')!=='none')unit.style.setProperty('stroke',color,'important');
    if(unit.localName==='text')unit.querySelectorAll('tspan,textPath').forEach(child=>child.style.setProperty('fill',color,'important'));
  }
  function drawLogoSelection(){
    const stage=$('mail-logo-stage');
    stage.querySelectorAll('.sel-box').forEach(box=>box.remove());
    const bounds=stage.getBoundingClientRect();
    logoSelection.forEach(key=>{
      const entry=logoUnits.find(item=>item.key===key);if(!entry)return;
      const rect=entry.element.getBoundingClientRect();
      if(!rect.width||!rect.height)return;
      const box=document.createElement('div');box.className='sel-box';
      Object.assign(box.style,{left:(rect.left-bounds.left-2)+'px',top:(rect.top-bounds.top-2)+'px',width:(rect.width+4)+'px',height:(rect.height+4)+'px'});
      stage.append(box);
    });
    $('mail-logo-sel-info').textContent=logoSelection.length?'Выделено элементов: '+logoSelection.length+'. Выберите цвет ниже. Shift + клик — один элемент.':'Нажмите на часть логотипа, чтобы выделить строку. Или выберите один из исходных цветов.';
  }
  function renderMailColors(){
    const container=$('mail-logo-colors');container.replaceChildren();
    for(const color of [...new Set(logoUnits.map(unit=>unit.color).filter(Boolean))]){
      const button=document.createElement('button');button.type='button';button.className='sw';
      button.style.background=color;button.title=color+' — выделить все элементы этого цвета';
      button.setAttribute('aria-label','Выделить элементы цвета '+color);
      button.addEventListener('click',()=>{logoSelection=logoUnits.filter(unit=>unit.color===color).map(unit=>unit.key);drawLogoSelection();});
      container.append(button);
    }
  }
  function mountEditableLogo(){
    const stage=$('mail-logo-stage');stage.replaceChildren();logoUnits=[];
    $('mail-logo-tools').hidden=!state.parts.length;
    if(!interactiveSvg){
      const empty=document.createElement('span');empty.className='dim';
      empty.textContent=busy?'Подготовка логотипа…':'Загрузите SVG, чтобы выбирать элементы и менять их цвета.';
      stage.append(empty);renderMailColors();return;
    }
    const parsedSvg=new DOMParser().parseFromString(interactiveSvg,'image/svg+xml').documentElement;
    const mounted=document.importNode(parsedSvg,true);mounted.removeAttribute('width');mounted.removeAttribute('height');
    mounted.style.width='100%';mounted.style.height='auto';mounted.style.maxHeight='140px';
    stage.append(mounted);
    const counts=new Map();
    for(const element of mounted.querySelectorAll(shapeSelector)){
      if(element.closest('defs,clipPath,mask,pattern,symbol,marker'))continue;
      const partId=element.closest('[data-logo-part]')?.getAttribute('data-logo-part')||state.parts[0]?.id||'';
      const index=counts.get(partId)||0;counts.set(partId,index+1);
      const key=partId+':'+index;
      const color=hexColor(getComputedStyle(element).fill)||hexColor(element.getAttribute('fill'));
      if(!color)continue;
      const unit={key,partId,index,element,color};logoUnits.push(unit);
      element.style.cursor='pointer';
      element.addEventListener('click',event=>{
        event.stopPropagation();
        if(event.shiftKey)logoSelection=[key];
        else{
          const rect=element.getBoundingClientRect(),y=rect.top+rect.height/2;
          logoSelection=logoUnits.filter(other=>{
            const b=other.element.getBoundingClientRect(),mid=b.top+b.height/2;
            return other.partId===partId&&other.color===color&&Math.abs(mid-y)<=Math.max(3,rect.height*.35);
          }).map(other=>other.key);
          if(!logoSelection.includes(key))logoSelection.push(key);
        }
        drawLogoSelection();
      });
    }
    logoSelection=logoSelection.filter(key=>logoUnits.some(unit=>unit.key===key));
    renderMailColors();drawLogoSelection();
  }
  function message(id,text,error=false){
    const box=$(id);box.textContent=text;box.hidden=!text;box.classList.toggle('error',error);
  }
  function persist(){
    try{const {logoData,...draft}=state;localStorage.setItem(key,JSON.stringify(draft));}
    catch(_){message('mail-export-message','Не удалось сохранить черновик в браузере. Скачайте HTML, чтобы сохранить письмо.',true);}
  }
  function refresh(){
    const card=state.footerStyle==='card';
    $('mail-footer-card-fields').hidden=!card;
    $('mail-footer-simple-fields').hidden=card;
    const photoPreview=$('mail-signature-photo-preview');
    photoPreview.replaceChildren();
    if(state.signaturePhoto){
      const image=document.createElement('img');
      image.src=state.signaturePhoto;image.alt='Фото для подписи';
      image.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;';
      photoPreview.append(image);
    }else photoPreview.textContent='Фото';
    $('mail-signature-photo-remove').disabled=!state.signaturePhoto;
    $('mail-frame').srcdoc=core.build(state,{...options,preview:true,placeholder:true}).html;
    $('mail-code').value=core.build(state,options).html;
    $('mail-logo-size-value').textContent=state.logoHeight+' px';
    $('mail-logo-download').disabled=!state.logoData||busy;
    mountEditableLogo();
  }
  function applyMailColor(color){
    if(!logoSelection.length){
      $('mail-logo-sel-info').textContent='Сначала выберите часть логотипа или существующий цвет.';
      return;
    }
    for(const key of logoSelection){
      const item=logoUnits.find(unit=>unit.key===key);if(!item)continue;
      const part=state.parts.find(part=>part.id===item.partId);if(!part)continue;
      part.fills=part.fills||{};part.fills[item.index]=color.toUpperCase();
    }
    preferEditedLogo();renderLogo();
  }
  $('mail-logo-stage').addEventListener('click',()=>{logoSelection=[];drawLogoSelection();});
  document.querySelectorAll('[data-mail-logo-color]').forEach(button=>button.addEventListener('click',()=>applyMailColor(button.dataset.mailLogoColor)));
  $('mail-logo-picker').addEventListener('input',event=>applyMailColor(event.target.value));
  $('mail-logo-reset-colors').addEventListener('click',()=>{
    state.parts.forEach(part=>{delete part.color;part.fills={};});
    logoSelection=[];preferEditedLogo();partsUI();renderLogo();
  });
  function preferEditedLogo(){
    if(state.logoUrl){state.logoUrl='';$('mail-logo-url').value='';}
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
      range.addEventListener('input',()=>{part.scale=Number(range.value);output.textContent=range.value+'%';preferEditedLogo();renderLogo();});label.append(range,output);
      const colorLabel=document.createElement('label');colorLabel.className='f';colorLabel.textContent='Цвет части';
      const color=document.createElement('input');color.type='color';color.value=/^#[0-9a-f]{6}$/i.test(part.color||'')?part.color:'#202020';
      color.setAttribute('aria-label','Цвет: '+(part.name||'часть '+(index+1)));
      color.addEventListener('input',()=>{part.color=color.value;preferEditedLogo();renderLogo();});
      colorLabel.append(color);
      const original=document.createElement('button');original.type='button';original.className='btn small';
      original.textContent='Исходные цвета';original.addEventListener('click',()=>{delete part.color;preferEditedLogo();partsUI();renderLogo();});
      const remove=document.createElement('button');remove.type='button';remove.className='btn small';remove.textContent='Удалить часть';
      remove.addEventListener('click',()=>{state.parts.splice(index,1);partsUI();renderLogo();});
      row.append(label,colorLabel,original,remove);list.append(row);
    });
  }
  async function renderLogo(){
    const version=++sequence;busy=true;refresh();
    try{
      if(state.parts.length){
        const prepared=state.parts.map(part=>{
          const svg=shared.sanitizeSvg(part.svg);
          if(/^#[0-9a-f]{6}$/i.test(part.color||'')){
            const color=part.color;
            // Recolour visible SVG shapes only; keep stroke-only graphics and empty fills intact.
            for(const shape of svg.querySelectorAll('path,rect,circle,ellipse,polygon,polyline,line,text,tspan')){
              const fill=shape.getAttribute('fill')||shape.style.fill||'';
              const stroke=shape.getAttribute('stroke')||shape.style.stroke||'';
              if(!/^(none|transparent)$/i.test(fill.trim())&&!['line','polyline'].includes(shape.localName)){
                shape.style.setProperty('fill',color,'important');
              }
              if((stroke||['line','polyline'].includes(shape.localName))&&!/^(none|transparent)$/i.test(stroke.trim())){
                shape.style.setProperty('stroke',color,'important');
              }
            }
          }
          // Per-shape colors are indexed within each uploaded SVG part.
          const shapes=[...svg.querySelectorAll(shapeSelector)].filter(element=>!element.closest('defs,clipPath,mask,pattern,symbol,marker'));
          shapes.forEach((shape,index)=>{
            const color=part.fills?.[index];
            if(/^#[0-9a-f]{6}$/i.test(color||''))paintUnit(shape,color);
          });
          return {...part,svg};
        });
        const svg=window.EstrattoLogoComposer.compose(prepared,state.layout,12);
        const image=await shared.rasterizeSvg(svg);if(version!==sequence)return;
        interactiveSvg=svg;state.logoData=image.dataUrl;state.logoRatio=image.ratio;
      }else {interactiveSvg='';state.logoData='';state.logoRatio=4;}
      message('mail-logo-message','');
    }catch(_){if(version!==sequence)return;interactiveSvg='';state.logoData='';message('mail-logo-message','Не удалось обработать SVG. Загрузите корректный файл ещё раз.',true);}
    finally{if(version===sequence){busy=false;persist();refresh();}}
  }
  async function upload(input,append){
    const files=[...input.files];input.value='';if(!files.length)return;
    try{
      if(files.length+(append?state.parts.length:0)>4)throw new Error('Можно загрузить до четырёх частей логотипа.');
      const parts=[];for(const file of files){if(file.size>1000000)throw new Error('Размер одного SVG — до 1 МБ.');const text=await file.text();const svg=shared.sanitizeSvg(text);parts.push({id:'mail'+Date.now()+parts.length,name:file.name,svg:new XMLSerializer().serializeToString(svg),scale:100});}
      const next=append?[...state.parts,...parts]:parts;
      if(next.reduce((sum,part)=>sum+part.svg.length,0)>750000)throw new Error('Слишком большой логотип. Уменьшите размер SVG.');
      state.parts=next;
      // An external hosted image would otherwise hide the edited SVG in both preview and export.
      state.logoUrl='';$('mail-logo-url').value='';
      partsUI();await renderLogo();
    }catch(error){message('mail-logo-message',error.message==='parse'?'Это не корректный SVG-файл.':error.message,true);}
  }
  for(const [id,field] of [['mail-title','title'],['mail-footer-label','footerLabel'],['mail-footer-company','footerCompany'],['mail-logo-url','logoUrl'],['mail-logo-size','logoHeight']]){
    $(id).value=state[field];$(id).addEventListener('input',()=>{state[field]=id==='mail-logo-size'?Number($(id).value):$(id).value;$(id).removeAttribute('aria-invalid');message('mail-export-message','');clearTimeout(timer);timer=setTimeout(()=>{persist();refresh();},140);});
  }
  const editor=$('mail-text');
  if(Array.isArray(state.runs)&&state.runs.map(run=>String(run.text||'')).join('')===state.text)editor.innerHTML=core.paragraphs(state.text,state.runs);
  else editor.textContent=state.text;
  let selectionRange=null;
  function rememberSelection(){const selection=getSelection();if(selection.rangeCount&&editor.contains(selection.anchorNode)&&editor.contains(selection.focusNode))selectionRange=selection.getRangeAt(0).cloneRange();}
  document.addEventListener('selectionchange',rememberSelection);
  function readEditor(){
    const runs=[];
    function add(text,format){if(text)runs.push({text,...format});}
    function walk(node,format={}){
      if(node.nodeType===Node.TEXT_NODE){add(node.textContent,format);return;}
      if(node.nodeType!==Node.ELEMENT_NODE)return;
      const tag=node.tagName;
      if(tag==='BR'){add('\n',format);return;}
      const next={...format};
      if(['B','STRONG'].includes(tag)||Number(node.style.fontWeight)>=600)next.bold=true;
      if(['I','EM'].includes(tag)||node.style.fontStyle==='italic')next.italic=true;
      if(tag==='U'||node.style.textDecoration.includes('underline'))next.underline=true;
      const color=node.getAttribute('color')||node.style.color;
      if(color){const canvas=document.createElement('canvas').getContext('2d');canvas.fillStyle=color;const normalized=canvas.fillStyle;if(/^#[a-f0-9]{6}$/i.test(normalized))next.color=normalized;}
      const block=['DIV','P'].includes(tag);
      if(block&&runs.length&&!runs[runs.length-1].text.endsWith('\n'))add('\n',format);
      for(const child of node.childNodes)walk(child,next);
      if(block&&node.nextSibling)add('\n',format);
    }
    for(const node of editor.childNodes)walk(node);
    state.runs=runs;state.text=runs.map(run=>run.text).join('');
    editor.removeAttribute('aria-invalid');message('mail-export-message','');
    clearTimeout(timer);timer=setTimeout(()=>{persist();refresh();},140);
  }
  editor.addEventListener('input',readEditor);
  editor.addEventListener('paste',event=>{event.preventDefault();const text=event.clipboardData.getData('text/plain');document.execCommand('insertText',false,text);readEditor();});
  function format(command,value){
    editor.focus();if(selectionRange&&editor.contains(selectionRange.commonAncestorContainer)){const selection=getSelection();selection.removeAllRanges();selection.addRange(selectionRange);}
    document.execCommand(command,false,value);rememberSelection();readEditor();
  }
  document.querySelectorAll('[data-mail-format]').forEach(button=>{
    button.addEventListener('mousedown',event=>event.preventDefault());
    button.addEventListener('click',()=>format(button.dataset.mailFormat));
  });
  $('mail-text-color').addEventListener('input',event=>format('foreColor',event.target.value));
  $('mail-footer-enabled').checked=Boolean(state.footerEnabled);
  $('mail-footer-enabled').addEventListener('change',()=>{state.footerEnabled=$('mail-footer-enabled').checked;persist();refresh();});

  // A single footerCompany value powers both signature styles.
  const sigFields=[
    ['mail-signature-name','signatureName'],
    ['mail-signature-role','signatureRole'],
    ['mail-signature-phone','signaturePhone'],
    ['mail-signature-email','signatureEmail'],
    ['mail-signature-address','signatureAddress'],
    ['mail-signature-linkedin','signatureLinkedin'],
    ['mail-signature-whatsapp','signatureWhatsapp'],
    ['mail-signature-telegram','signatureTelegram'],
    ['mail-signature-instagram','signatureInstagram'],
    ['mail-footer-company-card','footerCompany']
  ];
  for(const [id,key] of sigFields){
    const el=$(id);
    el.value=state[key]||'';
    el.addEventListener('input',()=>{
      state[key]=el.value;
      if(key==='footerCompany')$('mail-footer-company').value=el.value;
      clearTimeout(timer);timer=setTimeout(()=>{persist();refresh();},130);
    });
  }
  $('mail-footer-company').addEventListener('input',()=>{
    $('mail-footer-company-card').value=$('mail-footer-company').value;
  });
  $('mail-footer-style').value=state.footerStyle==='simple'?'simple':'card';
  state.footerStyle=$('mail-footer-style').value;
  $('mail-footer-style').addEventListener('change',()=>{
    state.footerStyle=$('mail-footer-style').value;
    persist();refresh();
  });
  async function loadSignaturePhoto(file){
    if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){
      message('mail-export-message','Для фотографии используйте JPG, PNG или WebP.',true);return;
    }
    if(file.size>8*1024*1024){
      message('mail-export-message','Фотография должна быть меньше 8 МБ.',true);return;
    }
    const objectUrl=URL.createObjectURL(file);
    try{
      const image=await new Promise((resolve,reject)=>{
        const img=new Image();
        img.onload=()=>resolve(img);
        img.onerror=()=>reject(new Error('Фотографию не удалось открыть.'));
        img.src=objectUrl;
      });
      const canvas=document.createElement('canvas');
      canvas.width=256;canvas.height=256;
      const ctx=canvas.getContext('2d');
      if(!ctx)throw new Error('Браузер не поддерживает обработку фотографии.');
      const length=Math.min(image.naturalWidth,image.naturalHeight);
      const sx=(image.naturalWidth-length)/2,sy=(image.naturalHeight-length)/2;
      ctx.fillStyle='#ffffff';ctx.fillRect(0,0,256,256);
      ctx.drawImage(image,sx,sy,length,length,0,0,256,256);
      state.signaturePhoto=canvas.toDataURL('image/jpeg',.82);
      persist();refresh();
      message('mail-export-message','Фотография добавлена в подпись.');
    }catch(error){
      message('mail-export-message',error.message||'Не удалось обработать фото.',true);
    }finally{URL.revokeObjectURL(objectUrl);}
  }
  $('mail-signature-photo-file').addEventListener('change',event=>{
    const file=event.target.files?.[0];event.target.value='';
    loadSignaturePhoto(file);
  });
  $('mail-signature-photo-remove').addEventListener('click',()=>{
    state.signaturePhoto='';persist();refresh();
    message('mail-export-message','Фотография удалена из подписи.');
  });

  $('mail-logo-file').addEventListener('change',event=>upload(event.target,false));
  $('mail-logo-add').addEventListener('change',event=>upload(event.target,true));
  $('mail-logo-remove').addEventListener('click',()=>{state.parts=[];partsUI();renderLogo();});
  $('mail-logo-layout').addEventListener('change',()=>{state.layout=$('mail-logo-layout').value;preferEditedLogo();renderLogo();});
  function ready(){
    const issues=core.validate(state);document.querySelectorAll('#page-mail [aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
    if(issues.length){for(const issue of issues)$(issue.field).setAttribute('aria-invalid','true');$(issues[0].field).focus();message('mail-export-message',issues[0].message,true);return false;}
    if(busy){message('mail-export-message','Дождитесь подготовки логотипа.',true);return false;}
    if(state.parts.length&&!state.logoData){message('mail-export-message','Загрузите корректный логотип или уберите его.',true);return false;}return true;
  }
  function download(content,type,name){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  $('mail-copy-html').addEventListener('click',async()=>{
    if(!ready())return;const html=core.build(state,options).html,exportSnapshot=window.EstrattoMailForm.get();
    try{await navigator.clipboard.writeText(html);window.EstrattoRecordExport?.('mail','HTML скопирован',exportSnapshot);message('mail-export-message','HTML скопирован. Вставьте его в редактор исходного HTML письма.');}
    catch(_){$('mail-source').open=true;$('mail-code').value=html;$('mail-code').focus();$('mail-code').select();message('mail-export-message','Код выделен. Нажмите Ctrl+C или ⌘C, чтобы скопировать.');}
  });
  $('mail-copy-formatted').addEventListener('click',async()=>{
    if(!ready())return;const built=core.build(state,options),exportSnapshot=window.EstrattoMailForm.get();
    try{await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([built.html],{type:'text/html'}),'text/plain':new Blob([built.plainText],{type:'text/plain'})})]);window.EstrattoRecordExport?.('mail','Письмо скопировано',exportSnapshot);message('mail-export-message','Оформленное письмо скопировано. Вставьте его в тело нового письма Hostinger. Проверьте логотип перед отправкой.');}
    catch(_){message('mail-export-message','Браузер не разрешил копирование оформления. Используйте HTML-код или скачайте файл письма.',true);}
  });
  $('mail-download-html').addEventListener('click',()=>{if(ready()){download(core.build(state,options).html,'text/html;charset=utf-8','messaggio.html');window.EstrattoRecordExport?.('mail','HTML скачан');}});
  $('mail-download-eml').addEventListener('click',()=>{if(ready()){download(core.eml(state,options),'message/rfc822','messaggio.eml');window.EstrattoRecordExport?.('mail','EML скачан');}});
  $('mail-logo-download').addEventListener('click',()=>{if(state.logoData){const a=document.createElement('a');a.href=state.logoData;a.download='logo-mail.png';a.click();}});
  for(const device of ['desktop','mobile'])$('mail-'+device).addEventListener('click',()=>{for(const item of ['desktop','mobile'])$('mail-'+item).setAttribute('aria-pressed',String(item===device));$('mail-preview-stage').classList.toggle('phone',device==='mobile');});
  window.EstrattoMailForm={get:()=>{const {logoData,...draft}=state;return JSON.parse(JSON.stringify(draft));}};
  partsUI();renderLogo();
})();
