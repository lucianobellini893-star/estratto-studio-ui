/* Display Italian separators while keeping exact, ungrouped decimal values. */
(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./account-core.js'):root.EstrattoAccount);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.EstrattoNumbers=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(core){
  'use strict';
  function canonical(value){
    const raw=String(value??'').trim();
    if(!raw)return '';
    try{return (raw.startsWith('+')?'+':'')+core.decimal(raw).text;}catch(_){return raw;}
  }
  function display(value,minFraction=0){
    const raw=String(value??'');
    const match=raw.match(/^([+-]?)(\d*)(?:\.(\d*))?$/);
    if(!match||!raw||raw==='+'||raw==='-')return raw;
    const integer=(match[2]||'0').replace(/^0+(?=\d)/,'');
    const grouped=integer.replace(/\B(?=(\d{3})+(?!\d))/g,'.');
    const fraction=match[3]??'';
    return match[1]+grouped+(match[3]!==undefined||minFraction?','+fraction.padEnd(minFraction,'0'):'');
  }
  function fromEditing(value){
    const raw=String(value).replace(/−/g,'-');
    if(!/^[+-]?[\d.]*(?:,\d*)?$/.test(raw))return raw;
    let result=raw.replace(/\./g,'').replace(',','.');
    if(/^[+-]?\./.test(result))result=result.replace('.', '0.');
    return result;
  }
  function set(input,value,settled=true){
    const normalized=canonical(value);
    input.dataset.numericValue=normalized;
    const visible=settled?normalized.replace(/(\.\d*?)0+$/,'$1').replace(/\.$/,''):normalized;
    input.value=display(visible,settled?Number(input.dataset.numericPrecision||0):0);
  }
  function caretAt(value,count){
    if(!count)return 0;
    let seen=0;
    for(let i=0;i<value.length;i++)if(value[i]!=='.'&&++seen>=count)return i+1;
    return value.length;
  }
  function emit(input,type='insertText',data=null){
    input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:type,data}));
  }
  function attach(input,options={}){
    input.dataset.numericPrecision=String(options.precision??0);
    input.dataset.numericInput='true';
    input.inputMode='decimal';input.autocomplete='off';input.spellcheck=false;
    set(input,options.value??input.value);
    input.addEventListener('beforeinput',event=>{
      if(event.isComposing||!event.cancelable)return;
      const start=input.selectionStart,end=input.selectionEnd;
      if(event.inputType==='insertText'&&(event.data==='.'||event.data===',')){
        event.preventDefault();
        if(input.value.slice(0,start).includes(',')||input.value.slice(end).includes(','))return;
        input.setRangeText(',',start,end,'end');emit(input,'insertText',',');
      } else if(start===end&&event.inputType==='deleteContentBackward'&&input.value[start-1]==='.'){
        event.preventDefault();input.setRangeText('',Math.max(0,start-2),start,'end');emit(input,event.inputType);
      } else if(start===end&&event.inputType==='deleteContentForward'&&input.value[start]==='.'){
        event.preventDefault();input.setRangeText('',start,start+2,'end');emit(input,event.inputType);
      }
    });
    input.addEventListener('input',event=>{
      if(event.numericFormatted)return;
      if(event.isComposing){input.dataset.numericValue=input.value;return;}
      let raw=input.value;
      let position=input.selectionStart??raw.length;
      if(event.data==='.'&&raw[position-1]==='.')raw=raw.slice(0,position-1)+','+raw.slice(position);
      const external=event.data&&event.data.length>1;
      const value=external?canonical(raw):fromEditing(raw);
      const semantic=raw.slice(0,position).replace(/\./g,'').length;
      input.dataset.numericValue=value;
      input.value=display(value);
      const next=external?input.value.length:caretAt(input.value,semantic);
      input.setSelectionRange(next,next);
    });
    input.addEventListener('compositionend',()=>{
      const event=new InputEvent('input',{bubbles:true,inputType:'insertText',data:input.value});input.dispatchEvent(event);
    });
    input.addEventListener('paste',event=>{
      const text=event.clipboardData?.getData('text/plain');if(text===undefined)return;
      event.preventDefault();
      const start=input.selectionStart,end=input.selectionEnd;
      if(start===0&&end===input.value.length){
        set(input,canonical(text),false);
        const formatted=new Event('input',{bubbles:true});formatted.numericFormatted=true;input.dispatchEvent(formatted);
      } else {
        const insert=canonical(text).replace('.',',');
        input.setRangeText(insert,start,end,'end');emit(input,'insertFromPaste');
      }
    });
    input.addEventListener('blur',()=>{
      const previous=input.dataset.numericValue;
      const value=/^[+-]?\d+\.$/.test(previous)?previous.slice(0,-1):previous;
      set(input,value);
      if(value!==previous){const event=new Event('input',{bubbles:true});event.numericFormatted=true;input.dispatchEvent(event);}
    });
  }
  return {canonical,display,fromEditing,set,attach};
});
