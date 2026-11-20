/* Standalone bank withdrawal PDF. Does not use trading/account statement
   data, transaction ledger, balances or period constraints.
   This is an operator-authored withdrawal summary, not a bank payment receipt. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.EstrattoTransferPdf=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 let fontCache=null;
 async function fonts(){
  if(fontCache)return fontCache;
  const fileNames={InterR:'Inter-Regular.ttf',InterM:'Inter-Medium.ttf',InterSB:'Inter-SemiBold.ttf'};
  const out={};
  for(const [name,file] of Object.entries(fileNames)){
   const response=await fetch('fonts/'+file);
   if(!response.ok)throw Error('Шрифт '+file+' не загрузился.');
   const bytes=new Uint8Array(await response.arrayBuffer());
   let binary='';
   for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode.apply(null,bytes.subarray(i,i+32768));
   out[name]={file,base64:btoa(binary)};
  }
  return fontCache=out;
 }
 const groupIban=value=>String(value||'').replace(/\s+/g,'').toUpperCase().replace(/(.{4})(?=.)/g,'$1 ');
 async function generate({state,entry,profile,statusLabel,amount,fee}){
  const ctor=window.jspdf?.jsPDF;
  if(!ctor)throw Error('Библиотека jsPDF недоступна.');
  const doc=new ctor({orientation:'landscape',unit:'mm',format:'a4',compress:true});
  const loaded=await fonts();
  for(const [name,item] of Object.entries(loaded)){
   doc.addFileToVFS(item.file,item.base64);
   doc.addFont(item.file,name,'normal');
  }
  const H=210,MX=17,RIGHT=280,WIDTH=RIGHT-MX,FOOT=196;
  const color={ink:'#0B0D12',blue:'#1F4FD1',muted:'#6B7280',soft:'#3A3F4B',light:'#E6E8EE',bar:'#D1D5DB',head:'#E8ECF9',alt:'#F4F5F8'};
  const cur=String(entry.currency||'').toUpperCase();
  function font(weight,size,textColor=color.ink){
   doc.setFont(weight==='sb'?'InterSB':weight==='m'?'InterM':'InterR','normal');
   doc.setFontSize(size);doc.setTextColor(textColor);
  }
  function wrap(value,width,weight,size){font(weight,size);return doc.splitTextToSize(String(value==null||value===''?'—':value),width);}
  const issue=String(entry.date||'').split('-').reverse().join('/');
  // Header: logo + document title/date, then company | client, like the Estratto statements.
  const logo=profile.logo;
  if(logo?.dataUrl){
   const ratio=Number(logo.ratio)||1;const height=15;const width=Math.min(55,height*ratio);
   doc.addImage(logo.dataUrl,'PNG',MX,11,width,Math.min(height,width/ratio),undefined,'FAST');
  }else{
   doc.setFillColor(color.blue);doc.roundedRect(MX,11,14,14,2.8,2.8,'F');
   font('sb',7.5,'#FFFFFF');doc.text('LOGO',MX+7,19.2,{align:'center'});
  }
  font('r',7.6,color.muted);doc.text('RIEPILOGO DEL TRASFERIMENTO BANCARIO',RIGHT,15,{align:'right'});
  font('m',10.5);doc.text(issue,RIGHT,21.5,{align:'right'});
  let y=36;
  font('m',11.2);doc.text(String(profile.coName||'—').slice(0,90),MX,y);
  let ly=y;const addr=(profile.coAddr||[]).filter(Boolean).slice(0,3);
  for(const line of addr){ly+=4.6;font('r',8.3,color.muted);doc.text(String(line).slice(0,90),MX,ly);}
  font('m',11.2);const coW=Math.max(doc.getTextWidth(String(profile.coName||'')),...addr.map(a=>{font('r',8.3);return doc.getTextWidth(String(a));}),70);
  const barX=MX+Math.min(coW,120)+12,cx=barX+14;
  doc.setDrawColor(color.bar);doc.setLineWidth(.25);doc.line(barX,y-5,barX,Math.max(ly,y+9.2)+1.5);
  font('m',11.2);doc.text(String(state.client||'—').slice(0,70),cx,y);
  if(String(state.publicId||'').trim()){
   font('r',8.3,color.muted);doc.text('ID cliente',cx,y+4.6);
   font('m',9.4);doc.text(String(state.publicId).slice(0,60),cx,y+9.2);
  }
  // Main transfer row (horizontal table, same look as the trade statement).
  y=Math.max(ly,y+9.2)+13;
  font('sb',12.8,color.blue);doc.text('Trasferimento verso il conto bancario del beneficiario',MX,y);
  y+=5;
  const cols=[['RIFERIMENTO',30],['DATA',24],['BENEFICIARIO',33],['BANCA',40],['IBAN',70],['BIC / SWIFT',33],['IMPORTO ('+cur+')',33]];
  const scale=WIDTH/cols.reduce((a,c)=>a+c[1],0);let x=MX;const colX=cols.map(c=>{const at=x;x+=c[1]*scale;return at;});
  const pad=3;
  doc.setFillColor(color.head);doc.rect(MX,y,WIDTH,9,'F');
  font('r',7.6,color.soft);
  cols.forEach((c,k)=>{if(k===cols.length-1)doc.text(c[0],RIGHT-pad,y+5.9,{align:'right'});else doc.text(c[0],colX[k]+pad,y+5.9);});
  y+=9;
  const cells=[entry.reference||'—',issue,entry.beneficiary,entry.bank,groupIban(entry.iban),entry.bic||'—',amount];
  const wrapped=cells.map((v,k)=>wrap(v,cols[k][1]*scale-pad*2,'r',8.9));
  const rowH=Math.max(10.5,Math.max(...wrapped.map(w=>w.length))*4.2+6.3);
  wrapped.forEach((w,k)=>{font('r',8.9);w.forEach((line,n)=>{
   if(k===cols.length-1)doc.text(line,RIGHT-pad,y+6.6+n*4.2,{align:'right'});else doc.text(line,colX[k]+pad,y+6.6+n*4.2);
  });});
  y+=rowH;doc.setDrawColor(color.light);doc.setLineWidth(.3);doc.line(MX,y,RIGHT,y);
  // Two key/value tables side by side.
  const colW=(WIDTH-9)/2,leftX=MX,rightX=MX+colW+9,labelW=colW*0.44;
  function kvTable(x0,top,title,rows){
   let yy=top;
   font('sb',10,color.blue);doc.text(title,x0,yy);yy+=4;
   doc.setFillColor(color.head);doc.rect(x0,yy,colW,9,'F');
   font('r',7.6,color.soft);doc.text('CAMPO',x0+pad,yy+5.9);doc.text('INFORMAZIONE',x0+labelW+pad,yy+5.9);yy+=9;
   rows.forEach(([label,value,strong],k)=>{
    const lines=wrap(value,colW-labelW-pad*2,strong?'sb':'r',9.4);
    const h=Math.max(10,lines.length*4.2+5.8);
    if(k%2===1){doc.setFillColor(color.alt);doc.rect(x0,yy,colW,h,'F');}
    doc.setDrawColor(color.light);doc.setLineWidth(.3);doc.line(x0,yy+h,x0+colW,yy+h);
    const labelLine=wrap(label,labelW-pad*2,'r',9.2)[0];
    font('r',9.2,color.muted);doc.text(labelLine,x0+pad,yy+6.3);
    font(strong?'sb':'r',9.4);lines.forEach((line,n)=>doc.text(line,x0+labelW+pad,yy+6.3+n*4.2));
    yy+=h;
   });
   return yy;
  }
  const payerRows=[['Ordinante',entry.payer||profile.coName||'—']];
  if(String(entry.payerBank||'').trim())payerRows.push(['Banca ordinante',entry.payerBank]);
  if(String(entry.payerIban||'').trim())payerRows.push(['IBAN ordinante',groupIban(entry.payerIban)]);
  const detailRows=[['Stato del trasferimento',statusLabel,true],['Riferimento banca',entry.bankRef||'Non fornito'],['Causale / Note',entry.details||'—']];
  const email=String(entry.supportEmail||'').trim(),phone=String(entry.supportPhone||'').trim();
  const info='I tempi di accredito dipendono dalla banca del beneficiario. Conservi il riferimento del trasferimento per eventuali richieste.';
  const infoLines=wrap(info,colW-10,'r',9);
  const infoH=infoLines.length*4.4+7.5;
  const kvHeight=rows=>13+rows.reduce((sum,[,value,strong])=>sum+Math.max(10,wrap(value,colW-labelW-pad*2,strong?'sb':'r',9.4).length*4.2+5.8),0);
  const totalsH=33;
  const leftH=kvHeight(payerRows)+14+4+infoH+(email||phone?12:0);
  const rightH=kvHeight(detailRows)+totalsH;
  // Spread the blocks over the page: the gap above them grows when there is room, shrinks when values are long.
  const gap=Math.max(7,Math.min(15,FOOT-6-y-Math.max(leftH,rightH)));
  const tablesTop=y+gap;
  const leftY=kvTable(leftX,tablesTop,'Ordinante',payerRows);
  const rightY=kvTable(rightX,tablesTop,'Dettagli',detailRows);
  // Totals under "Dettagli" (same pattern as Totale realizzato in the statement).
  const tx=rightX+pad,tr=rightX+colW-pad;
  let ty=rightY+9;
  if(ty+totalsH-9>FOOT-3){doc.addPage('a4','landscape');ty=24;}
  font('r',9.4,color.soft);doc.text('Importo destinato al beneficiario',tx,ty);font('m',10.1);doc.text(amount+' '+cur,tr,ty,{align:'right'});
  ty+=7.5;font('r',9.4,color.soft);doc.text('Commissione',tx,ty);font('m',10.1);doc.text(fee+' '+cur,tr,ty,{align:'right'});
  ty+=4.5;doc.setDrawColor(color.light);doc.setLineWidth(.3);doc.line(rightX,ty,rightX+colW,ty);
  ty+=8.5;font('sb',11.3);doc.text('Totale trasferito',tx,ty);font('sb',13.5,color.blue);doc.text(amount+' '+cur,tr,ty,{align:'right'});
  // Information + support contacts under "Ordinante" (first page when it fits).
  doc.setPage(1);
  let iy=leftY+14;
  if(iy+4+infoH+(email||phone?12:0)>FOOT-3){
   if(doc.getNumberOfPages()<2)doc.addPage('a4','landscape');
   doc.setPage(2);iy=doc.getNumberOfPages()>1&&ty>24&&ty<60?ty+16:24;
  }
  font('sb',10,color.blue);doc.text('Informazioni',leftX,iy);iy+=4;
  doc.setFillColor(color.alt);doc.roundedRect(leftX,iy,colW,infoH,2,2,'F');
  font('r',9,color.soft);infoLines.forEach((line,n)=>doc.text(line,leftX+5,iy+6.6+n*4.4));
  iy+=infoH+7;
  let cx2=leftX;
  for(const [label,value] of [['Assistenza',email],['Telefono',phone]]){
   if(!value)continue;
   font('r',8.6,color.muted);doc.text(label,cx2,iy);
   font('m',9.4);doc.text(value.slice(0,60),cx2,iy+4.8);
   font('m',9.4);cx2+=Math.max(55,doc.getTextWidth(value.slice(0,60))+14);
  }
  // Footer on every page.
  const pages=doc.getNumberOfPages();
  for(let i=1;i<=pages;i++){
   doc.setPage(i);
   doc.setDrawColor(color.light);doc.setLineWidth(.3);doc.line(MX,FOOT,RIGHT,FOOT);
   font('r',7.2,color.muted);
   doc.text('Riepilogo emesso dalla società indicata, non dalla banca del beneficiario.',MX,FOOT+5);
   const right=[String(profile.siteCaption||'').slice(0,55),'Pagina '+i+' di '+pages].filter(Boolean).join(' · ');
   doc.text(right,RIGHT,FOOT+5,{align:'right'});
  }
  return {bytes:doc.output('arraybuffer'),pages};
 }
 return {generate};
});