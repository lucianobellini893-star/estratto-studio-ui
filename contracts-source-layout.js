/* Visual source-PDF preservation: user-provided pages rasterised at high resolution,
   then designated company data replaced at text coordinates. Original is unchanged.
   Export is image-based and not a digitally signed or text-searchable PDF. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EstrattoPdfLayout=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const SCALE=1.85;
 function getRules(doc,profile,fields){
  return fields.map(([key])=>({key,old:String(doc.old?.[key]||'').trim(),newText:String(profile[key]||'').trim()}))
   .filter(r=>r.old.length>=3&&r.newText&&r.old!==r.newText).sort((a,b)=>b.old.length-a.old.length);
 }
 function createRuns(content,viewport){
  const out=[],v=viewport.transform,scale=Math.hypot(v[0],v[1])||1;
  for(const item of content.items||[]){
   if(!item.str||!String(item.str).trim()||!item.width)continue;
   const t=item.transform;
   const x=v[0]*t[4]+v[2]*t[5]+v[4],baseline=v[1]*t[4]+v[3]*t[5]+v[5];
   const dx=v[0]*t[0]+v[2]*t[1],dy=v[1]*t[0]+v[3]*t[1];
   if(Math.abs(dy)>Math.abs(dx)*.20)continue;
   const font=Math.max(2,Math.hypot(v[0]*t[2]+v[2]*t[3],v[1]*t[2]+v[3]*t[3]));
   out.push({str:String(item.str),x,baseline,width:Math.abs(item.width)*scale,font,fontName:item.fontName||'',top:baseline-font*.91,bottom:baseline+font*.24});
  }
  return out;
 }
 function buildLines(runs){
  const rows=[];
  for(const run of runs){
   let line=rows.find(row=>Math.abs(row.baseline-run.baseline)<Math.max(1.7,Math.min(row.font,run.font)*.32));
   if(!line){line={baseline:run.baseline,font:run.font,runs:[]};rows.push(line);}
   line.runs.push(run);
  }
  rows.sort((a,b)=>a.baseline-b.baseline);
  for(const row of rows){
   row.runs.sort((a,b)=>a.x-b.x);let line='',prev=null,spans=[];
   for(const run of row.runs){
    const gap=prev?run.x-(prev.x+prev.width):0;
    if(prev&&gap>Math.max(1.2,Math.min(prev.font,run.font)*.14)&&!line.endsWith(' ')&&!run.str.startsWith(' '))line+=' ';
    const start=line.length;line+=run.str;spans.push({run,start,end:line.length});prev=run;
   }
   row.text=line;row.spans=spans;
  }
  return rows;
 }
 // Keep character offsets while normalising runs split at arbitrary PDF glyph boundaries.
 function searchable(value){
  const src=String(value).normalize('NFKC').replace(/[\u00a0\u2007\u202f]/g,' ');
  let result='',offsets=[],space=false;
  for(let i=0;i<src.length;i++){
   const ch=src[i];
   if(/\s/.test(ch)){
    if(!space&&result.length){result+=' ';offsets.push(i);}
    space=true;continue;
   }
   result+=ch.toLocaleLowerCase('en-US');offsets.push(i);space=false;
  }
  return {text:result,offsets};
 }
 function occurrences(rows,rules){
  const hits=[],coverage=Object.fromEntries(rules.map(r=>[r.key,0]));
  for(const row of rows){
   const normal=searchable(row.text),reserved=[];
   for(const rule of rules){
    const needle=searchable(rule.old).text.trim();
    if(!needle)continue;
    let start=0,at;
    while((at=normal.text.indexOf(needle,start))!==-1){
     const end=at+needle.length;
     start=end;
     // Do not replace a brand fragment inside a longer alphanumeric identifier.
     if(at>0&&/[a-z0-9]/i.test(normal.text[at-1])&&/[a-z0-9]/i.test(needle[0]))continue;
     if(end<normal.text.length&&/[a-z0-9]/i.test(normal.text[end])&&/[a-z0-9]/i.test(needle[needle.length-1]))continue;
     if(reserved.some(([lo,hi])=>at<hi&&end>lo))continue;
     const beginChar=normal.offsets[at],endChar=normal.offsets[end-1]+1;
     const slices=[];
     for(const span of row.spans){
      const lo=Math.max(beginChar,span.start),hi=Math.min(endChar,span.end);
      if(lo>=hi)continue;
      const len=Math.max(1,span.end-span.start);
      slices.push({...span.run,x:span.run.x+span.run.width*(lo-span.start)/len,width:span.run.width*(hi-lo)/len});
     }
     if(slices.length){reserved.push([at,end]);hits.push({rule,slices,row,startChar:beginChar,endChar});coverage[rule.key]++;}
    }
   }
  }
  return {hits,coverage};
 }
 function sampleBackground(ctx,left,top,width,height){
  const x=Math.max(0,Math.floor(left)),y=Math.max(0,Math.floor(top));
  const w=Math.max(1,Math.min(ctx.canvas.width-x,Math.ceil(width))),h=Math.max(1,Math.min(ctx.canvas.height-y,Math.ceil(height)));
  if(x>=ctx.canvas.width||y>=ctx.canvas.height)return [255,255,255];
  const data=ctx.getImageData(x,y,w,h).data,counts=new Map(),step=Math.max(1,Math.floor(data.length/600));
  for(let i=0;i<data.length;i+=4*step){
   const parts=[data[i],data[i+1],data[i+2]].map(c=>Math.min(255,Math.round(c/16)*16));
   const key=parts.join(',');counts.set(key,(counts.get(key)||0)+1);
  }
  let chosen='255,255,255',count=0;for(const [k,n] of counts)if(n>count){chosen=k;count=n;}
  return chosen.split(',').map(Number);
 }

 // Repaint each affected complete text line. Painting replacements inside
 // old glyph rectangles caused leftover characters and text collisions.
 function drawHits(ctx,hits){
  const groups=new Map();
  for(const hit of hits){
   const row=hit.row;
   if(!groups.has(row))groups.set(row,[]);
   groups.get(row).push(hit);
  }
  let compressed=0,skipped=0,repairs=0;
  for(const [row,group] of groups){
   const runs=row.runs;
   if(!runs?.length){skipped+=group.length;continue;}
   const left=Math.max(0,Math.min(...runs.map(r=>r.x)));
   const right=Math.min(ctx.canvas.width,Math.max(...runs.map(r=>r.x+r.width)));
   const font=Math.max(...runs.map(r=>r.font));
   const baseline=row.baseline;
   const top=Math.max(0,Math.min(...runs.map(r=>r.top))-Math.max(1.5,font*.12));
   const bottom=Math.min(ctx.canvas.height,Math.max(...runs.map(r=>r.bottom))+Math.max(1.5,font*.10));
   if(!(right>left+3&&bottom>top+3)){skipped+=group.length;continue;}
   const replacement=group.slice().sort((a,b)=>b.startChar-a.startChar);
   let rewritten=row.text;
   for(const hit of replacement){
    rewritten=rewritten.slice(0,hit.startChar)+hit.rule.newText+rewritten.slice(hit.endChar);
   }
   if(rewritten===row.text)continue;
   // Sample outside original glyphs rather than over dark pixels.
   const sampleX=Math.max(0,Math.floor(left-5));
   const sampleY=Math.max(0,Math.floor(top+2));
   const bg=sampleBackground(ctx,sampleX,sampleY,Math.min(3,ctx.canvas.width-sampleX),Math.min(3,bottom-top-2));
   const foreground=bg.reduce((sum,v)=>sum+v,0)>570?'#171717':'#ffffff';
   const bold=/bold|heavy|black/i.test(String(runs[0].fontName||''))||
     (font>19&&row.text.length<70);
   let size=font*(font>18?.94:.88);
   const originalSize=size;
   const available=Math.max(5,Math.min(ctx.canvas.width-12,right+Math.max(4,font*.5))-left);
   const fontSpec=()=>String(bold?'bold ':'')+size+'px Arial, sans-serif';
   ctx.save();
   ctx.font=fontSpec();
   while(size>Math.max(6,font*.69)&&ctx.measureText(rewritten).width>available){
    size-=.35;ctx.font=fontSpec();
   }
   const measured=ctx.measureText(rewritten).width;
   const stretch=measured>available?available/measured:1;
   if(size<originalSize*.9||stretch<.95)compressed++;
   ctx.fillStyle='rgb('+bg.join(',')+')';
   ctx.fillRect(Math.max(0,left-1.5),top,Math.min(ctx.canvas.width-left+1.5,right-left+3),bottom-top);
   ctx.fillStyle=foreground;
   ctx.translate(left,baseline);
   ctx.scale(stretch,1);
   ctx.font=fontSpec();
   ctx.fillText(rewritten,0,0);
   ctx.restore();
   repairs++;
  }
  return {compressed,skipped,repairs};
 }
 async function exportPdf(source,rules,progress){
  const JsPDF=window.jspdf?.jsPDF;
  if(!JsPDF||!window.pdfjsLib)throw Error('Не загрузились библиотеки для PDF.');
  const sourcePdf=await pdfjsLib.getDocument({data:new Uint8Array(source.bytes)}).promise;
  const coverage=Object.fromEntries(rules.map(r=>[r.key,0]));
  let output=null,compressed=0,skipped=0,repairedLines=0;
  for(let i=1;i<=sourcePdf.numPages;i++){
   progress?.(i,sourcePdf.numPages);
   const page=await sourcePdf.getPage(i),natural=page.getViewport({scale:1}),viewport=page.getViewport({scale:SCALE});
   const canvas=document.createElement('canvas');
   canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   const ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:true});
   if(!ctx)throw Error('Невозможно создать графический холст.');
   await page.render({canvasContext:ctx,viewport}).promise;
   if(rules.length){
    const content=await page.getTextContent();
    const found=occurrences(buildLines(createRuns(content,viewport)),rules);
    for(const [key,value] of Object.entries(found.coverage))coverage[key]+=value;
    const cleanup=drawHits(ctx,found.hits);
    compressed+=cleanup.compressed;skipped+=cleanup.skipped;repairedLines+=cleanup.repairs;
   }
   if(!output)output=new JsPDF({unit:'pt',format:[natural.width,natural.height],orientation:natural.width>natural.height?'landscape':'portrait',compress:true});
   else output.addPage([natural.width,natural.height],natural.width>natural.height?'landscape':'portrait');
   output.addImage(canvas.toDataURL('image/jpeg',.94),'JPEG',0,0,natural.width,natural.height,undefined,'FAST');
   canvas.width=0;canvas.height=0;page.cleanup?.();
  }
  if(!output)throw Error('Не найдены страницы PDF.');
  if(!Object.values(coverage).some(count=>count>0))throw Error('В PDF не найдены совпадения для замены. Изменённый файл не создан. Проверь точное исходное название компании и текст в PDF.');
  output.setProperties({title:'Working Draft — Legal Review',subject:'Source PDF visual layout preserved as flattened pages; company field substitutions applied.',creator:'Estratto Studio'});
  return {pdf:output,coverage,compressed,skipped,repairedLines,pages:sourcePdf.numPages};
 }
 return {getRules,createRuns,buildLines,occurrences,exportPdf};
});