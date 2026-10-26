/* Shared accessible search list, mounted above the page instead of inside cards. */
(() => {
  'use strict';
  const popup=document.createElement('div');popup.className='asset-picker';popup.hidden=true;
  const heading=document.createElement('div');heading.className='asset-picker-heading';
  const title=document.createElement('strong'),hint=document.createElement('span');hint.textContent='Печатайте название или символ для поиска';heading.append(title,hint);
  const list=document.createElement('div');list.className='asset-picker-list';list.id='account-asset-options';list.setAttribute('role','listbox');
  const footer=document.createElement('div');footer.className='asset-picker-footer';footer.textContent='Нет нужного варианта? Можно вписать свой.';
  popup.append(heading,list,footer);document.body.append(popup);
  let current=null,results=[],active=-1,suppressFocus=false,pointerInside=false;
  function close(){
    if(current){current.input.setAttribute('aria-expanded','false');current.input.removeAttribute('aria-activedescendant');}
    popup.hidden=true;current=null;active=-1;results=[];pointerInside=false;
  }
  function position(){
    if(!current||popup.hidden)return;
    if(!current.input.isConnected){close();return;}
    const rect=current.input.getBoundingClientRect(),view=window.visualViewport;
    const leftEdge=view?.offsetLeft||0,topEdge=view?.offsetTop||0,width=view?.width||innerWidth,height=view?.height||innerHeight;
    const bottom=topEdge+height,availableBelow=bottom-rect.bottom-12,availableAbove=rect.top-topEdge-12;
    const above=availableBelow<200&&availableAbove>availableBelow;
    popup.style.width=Math.min(Math.max(rect.width,300),width-24)+'px';
    popup.style.maxHeight=Math.min(360,Math.max(availableAbove,availableBelow),height-24)+'px';
    const bounds=popup.getBoundingClientRect();
    popup.style.left=Math.max(leftEdge+12,Math.min(rect.left,leftEdge+width-bounds.width-12))+'px';
    popup.style.top=Math.max(topEdge+12,Math.min(above?rect.top-bounds.height-6:rect.bottom+6,bottom-bounds.height-12))+'px';
  }
  function mark(index){
    active=index;
    for(const [i,option] of [...list.querySelectorAll('[role=option]')].entries())option.setAttribute('aria-selected',String(i===index));
    if(index>=0){const option=list.querySelectorAll('[role=option]')[index];current.input.setAttribute('aria-activedescendant',option.id);option.scrollIntoView({block:'nearest'});}
    else current.input.removeAttribute('aria-activedescendant');
  }
  function choose(item){
    if(!current)return;
    const selected=current;selected.onSelect(item);close();
    suppressFocus=true;selected.input.focus({preventScroll:true});suppressFocus=false;
  }
  function show(config,query=''){
    if(current&&current.input!==config.input)close();
    current=config;results=window.EstrattoAssets.search(config.group,query);active=-1;
    title.textContent=config.title;list.setAttribute('aria-label',config.title);list.replaceChildren();
    results.forEach((item,index)=>{
      const option=document.createElement('div');option.className='asset-picker-option';option.id=`account-asset-option-${index}`;option.tabIndex=-1;option.setAttribute('role','option');option.setAttribute('aria-selected','false');
      const names=document.createElement('div'),name=document.createElement('strong'),translation=document.createElement('small');name.textContent=item.name;translation.textContent=item.ru;names.append(name,translation);
      const symbol=document.createElement('span');symbol.className='asset-picker-symbol';symbol.textContent=item.symbol;
      option.append(names,symbol);
      option.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse')event.preventDefault();});
      option.addEventListener('click',()=>choose(item));list.append(option);
    });
    if(!results.length){const empty=document.createElement('p');empty.className='asset-picker-empty';empty.textContent='Ничего не найдено. Продолжайте вводить свой вариант.';list.append(empty);}
    popup.hidden=false;config.input.setAttribute('aria-expanded','true');config.input.removeAttribute('aria-activedescendant');position();
  }
  function attach(input,options){
    const config={...options,input};input.classList.add('picker-input');input.autocomplete='off';input.spellcheck=false;
    input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-haspopup','listbox');input.setAttribute('aria-controls',list.id);input.setAttribute('aria-expanded','false');
    input.addEventListener('focus',()=>{if(!suppressFocus)show(config);});
    input.addEventListener('click',()=>{if(current?.input!==input)show(config);});
    input.addEventListener('input',event=>{if(!event.isComposing)show(config,input.value);});
    input.addEventListener('compositionend',()=>show(config,input.value));
    input.addEventListener('keydown',event=>{
      if(event.isComposing)return;
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){
        event.preventDefault();if(current?.input!==input)show(config,input.value);
        if(results.length)mark(event.key==='ArrowDown'?(active+1)%results.length:(active<=0?results.length-1:active-1));
      } else if(event.key==='Enter'&&current?.input===input&&active>=0){event.preventDefault();choose(results[active]);}
      else if(event.key==='Escape'||event.key==='Tab')close();
    });
    input.addEventListener('blur',()=>{setTimeout(()=>{if(current?.input===input&&!pointerInside&&!popup.contains(document.activeElement))close();},0);});
  }
  popup.addEventListener('pointerdown',()=>{pointerInside=true;});
  document.addEventListener('pointerup',()=>{setTimeout(()=>{pointerInside=false;},0);});
  document.addEventListener('pointercancel',()=>{pointerInside=false;});
  document.addEventListener('pointerdown',event=>{if(current&&!popup.contains(event.target)&&event.target!==current.input)close();});
  window.addEventListener('resize',position);window.addEventListener('scroll',position,true);
  window.visualViewport?.addEventListener('resize',position);window.visualViewport?.addEventListener('scroll',position);
  document.addEventListener('estratto:navigate',close);
  window.EstrattoPicker={attach,close};
})();
