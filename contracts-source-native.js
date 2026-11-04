/* Original-page PDF export. Changes selected text labels over the original
   vector PDF pages, without rebuilding page art, tables or typography.
   Overlay is for legal review, NOT secure redaction: old PDF text streams
   may remain beneath the replacement and in search results. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EstrattoPdfNative=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 let loading;
 const pdfLibUrl='https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
 const fontkitUrl='https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js';
 function loadScript(src){
  return new Promise((resolve,reject)=>{
   const script=document.createElement('script');
   script.src=src;script.async=true;script.onload=resolve;
   script.onerror=()=>reject(new Error('Не удалось загрузить PDF-редактор. Проверь подключение к Интернету и перезагрузи страницу.'));
   document.head.append(script);
  });
 }
 async function libraries(){
  if(!loading)loading=(async()=>{
   if(!window.PDFLib)await loadScript(pdfLibUrl);
   if(!window.fontkit){
    try{await loadScript(fontkitUrl);}catch(_){}
   }
   if(!window.PDFLib)throw Error('Модуль изменения PDF недоступен.');
  })().catch(error=>{loading=null;throw error;});
  return loading;
 }
 async function loadFont(document){
  const lib=window.PDFLib;
  if(window.fontkit){
   try{
    document.registerFontkit(window.fontkit);
    const file=await fetch('fonts/Inter-Regular.ttf');
    if(!file.ok)throw Error('Inter font');
    return await document.embedFont(new Uint8Array(await file.arrayBuffer()),{subset:true});
   }catch(error){/* Standard font handles ASCII/Latin when custom is unavailable. */}
  }
  return document.embedFont(lib.StandardFonts.Helvetica);
 }
 function notUnicodeSafe(font,word){
  try{font.encodeText(word);return false;}catch(e){return true;}
 }
 function rectForHit(hit){
  const chunks=hit.slices;
  const x=Math.min(...chunks.map(p=>p.x)),right=Math.max(...chunks.map(p=>p.x+p.width));
  const top=Math.min(...chunks.map(p=>p.top)),bottom=Math.max(...chunks.map(p=>p.bottom));
  const baseline=chunks[0].baseline,fontsize=Math.max(...chunks.map(p=>p.font));
  return {x,width:right-x,top,bottom,baseline,fontsize};
 }
 async function generate(source,rules,progress){
  await libraries();
  const {PDFDocument,rgb}=window.PDFLib;
  const originalBytes=new Uint8Array(source.bytes);
  const pdfDoc=await PDFDocument.load(originalBytes,{updateMetadata:false});
  const pdfJs=await pdfjsLib.getDocument({data:new Uint8Array(originalBytes)}).promise;
  const geometry=window.EstrattoPdfLayout;
  if(!geometry)throw Error('Модуль поиска текста в PDF не загружен.');
  if(pdfDoc.getPageCount()!==pdfJs.numPages)throw Error('Количество страниц исходного PDF не совпадает.');
  const font=await loadFont(pdfDoc);
  const coverage=Object.fromEntries(rules.map(r=>[r.key,0]));
  const warnings=[];
  let shortened=0,changed=0;
  for(let i=0;i<pdfJs.numPages;i++){
   progress?.(i+1,pdfJs.numPages);
   const page=await pdfJs.getPage(i+1);
   const target=pdfDoc.getPage(i);
   const rotation=page.rotate||0;
   if(rotation%360!==0){warnings.push('Страница '+(i+1)+' повёрнута; автоматическая замена пропущена.');continue;}
   const viewport=page.getViewport({scale:1});
   const content=await page.getTextContent();
   const rows=geometry.buildLines(geometry.createRuns(content,viewport));
   const {hits,coverage:found}=geometry.occurrences(rows,rules);
   for(const [key,n] of Object.entries(found))coverage[key]=(coverage[key]||0)+n;
   const width=target.getWidth(),height=target.getHeight();
   for(const hit of hits){
    const r=rectForHit(hit);
    if(!(r.width>1)||!(r.top>=0)||r.x<0||r.x+r.width>width+1)continue;
    const text=hit.rule.newText;
    if(notUnicodeSafe(font,text))throw Error('Название содержит символы, которых нет в доступном шрифте. Проверь написание или подключение к Интернету.');
    // Preserve the vector content and original layout. The white patch and
    // replacement text become a new overlay on the original PDF page.
    target.drawRectangle({x:r.x-1,y:height-r.bottom-1,width:r.width+2,height:r.bottom-r.top+2,
     color:rgb(1,1,1),opacity:1});
    let size=Math.max(4,r.fontsize*.89);
    while(size>4&&font.widthOfTextAtSize(text,size)>r.width*.98)size-=.25;
    if(font.widthOfTextAtSize(text,size)>r.width*.98){shortened++;size=Math.max(3.5,size);}
    target.drawText(text,{x:r.x,y:height-r.baseline, size,font,color:rgb(.1,.1,.12),
     maxWidth:r.width});
    changed++;
   }
  }
  if(changed===0)throw Error('Ни одно старое значение не удалось найти непосредственно на PDF-страницах. Файл не создан.');
  // Metadata explicitly distinguishes a reviewed copy from the signed source.
  pdfDoc.setTitle('Working Draft — Legal Review');
  pdfDoc.setSubject('Original PDF design with overlaid company-data changes; not valid for secure redaction.');
  pdfDoc.setCreator('Estratto Studio Review Editor');
  const bytes=await pdfDoc.save({useObjectStreams:true});
  return {blob:new Blob([bytes],{type:'application/pdf'}),coverage,shortened,warnings,pages:pdfJs.numPages,changed};
 }
 return {generate,libraries};
});