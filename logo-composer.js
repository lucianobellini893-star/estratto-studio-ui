/* Combine independently scaled SVG pieces without sharing IDs or CSS selectors. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EstrattoLogoComposer=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const ns='http://www.w3.org/2000/svg';
  function layout(parts,direction='horizontal',gap=12){
    if(!parts.length)return {width:0,height:0,parts:[]};
    const spacing=Math.min(60,Math.max(0,Number(gap)||0));
    const result=parts.map(part=>{
      if(!Number.isFinite(part.width)||!Number.isFinite(part.height)||part.width<=0||part.height<=0)throw new Error('SVG должен содержать корректный viewBox или размеры.');
      const height=100*Math.min(200,Math.max(25,Number(part.scale)||100))/100;
      return {width:height*part.width/part.height,height,x:0,y:0};
    });
    const vertical=direction==='vertical';
    const width=vertical?Math.max(...result.map(part=>part.width)):result.reduce((sum,part)=>sum+part.width,0)+spacing*(result.length-1);
    const height=vertical?result.reduce((sum,part)=>sum+part.height,0)+spacing*(result.length-1):Math.max(...result.map(part=>part.height));
    let cursor=0;
    for(const part of result){part.x=vertical?(width-part.width)/2:cursor;part.y=vertical?cursor:(height-part.height)/2;cursor+=(vertical?part.height:part.width)+spacing;}
    return {width,height,parts:result};
  }
  function rewriteRefs(value,ids){return value.replace(/url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g,(all,quote,id)=>ids.has(id)?`url(#${ids.get(id)})`:all);}
  function scopeStyles(text,scope,ids){
    text=text.replace(/\/\*[\s\S]*?\*\//g,'');
    let output='',cursor=0;
    while(cursor<text.length){
      const open=text.indexOf('{',cursor);if(open<0)break;
      const prelude=text.slice(cursor,open).trim();let end=open+1,depth=1,quote='';
      for(;end<text.length&&depth;end++){
        const char=text[end];if(quote){if(char===quote&&text[end-1]!=='\\')quote='';continue;}
        if(char==='"'||char==="'")quote=char;else if(char==='{')depth++;else if(char==='}')depth--;
      }
      if(depth)break;
      const body=text.slice(open+1,end-1);cursor=end;
      if(/^@(media|supports|layer)\b/i.test(prelude)){output+=prelude+'{'+scopeStyles(body,scope,ids)+'}';continue;}
      if(prelude.startsWith('@'))continue;
      const selectors=prelude.split(',').map(selector=>{
        selector=selector.trim().replace(/:root\b/g,'svg').replace(/#([\w-]+)/g,(all,id)=>ids.has(id)?'#'+ids.get(id):all);
        return '#'+scope+' '+selector;
      });
      output+=selectors.join(',')+'{'+rewriteRefs(body,ids)+'}';
    }
    return output;
  }
  function compose(parts,direction='horizontal',gap=12){
    const prepared=parts.map(part=>{
      const svg=part.svg.cloneNode(true);
      let box=(svg.getAttribute('viewBox')||'').trim().split(/[\s,]+/).map(Number);
      if(box.length!==4||!box.every(Number.isFinite)||box[2]<=0||box[3]<=0){
        const width=parseFloat(svg.getAttribute('width')),height=parseFloat(svg.getAttribute('height'));
        box=[0,0,width>0?width:300,height>0?height:100];svg.setAttribute('viewBox',box.join(' '));
      }
      return {svg,width:box[2],height:box[3],scale:part.scale,id:part.id};
    });
    const geometry=layout(prepared,direction,gap);
    const doc=document.implementation.createDocument(ns,'svg',null),root=doc.documentElement;
    root.setAttribute('viewBox',`0 0 ${geometry.width} ${geometry.height}`);root.setAttribute('width',geometry.width);root.setAttribute('height',geometry.height);
    prepared.forEach((part,index)=>{
      const prefix='logo-'+String(part.id).replace(/[^\w-]/g,'')+'-',scope=prefix+'scope',ids=new Map();
      const nodes=[part.svg,...part.svg.querySelectorAll('*')];
      nodes.forEach(node=>{if(node.id)ids.set(node.id,prefix+node.id);});
      nodes.forEach(node=>{
        node.removeAttribute('data-logo-part');node.removeAttribute('data-logo-unit');
        if(node.id)node.id=ids.get(node.id);
        for(const attribute of [...node.attributes]){
          let value=rewriteRefs(attribute.value,ids);
          if(/^(href|xlink:href)$/i.test(attribute.name)&&value.startsWith('#')&&ids.has(value.slice(1)))value='#'+ids.get(value.slice(1));
          node.setAttribute(attribute.name,value);
        }
      });
      part.svg.querySelectorAll('style').forEach(style=>{style.textContent=scopeStyles(style.textContent,scope,ids);});
      const bounds=geometry.parts[index],wrapper=doc.createElementNS(ns,'g');wrapper.id=scope;
      const svg=doc.importNode(part.svg,true);svg.setAttribute('data-logo-part',part.id);
      svg.setAttribute('x',bounds.x);svg.setAttribute('y',bounds.y);svg.setAttribute('width',bounds.width);svg.setAttribute('height',bounds.height);svg.setAttribute('preserveAspectRatio','xMidYMid meet');
      svg.style.setProperty('width',bounds.width+'px','important');svg.style.setProperty('height',bounds.height+'px','important');
      wrapper.append(svg);root.append(wrapper);
    });
    return new XMLSerializer().serializeToString(root);
  }
  return {layout,compose};
});
