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
  const fileNames={InterR:'Inter-Regular.ttf',InterSB:'Inter-SemiBold.ttf'};
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
 async function generate({state,entry,profile,statusLabel,amount,fee}){
  const ctor=window.jspdf?.jsPDF;
  if(!ctor)throw Error('Библиотека jsPDF недоступна.');
  const doc=new ctor({orientation:'landscape',unit:'mm',format:'a4',compress:true});
  const loaded=await fonts();
  for(const [name,item] of Object.entries(loaded)){
   doc.addFileToVFS(item.file,item.base64);
   doc.addFont(item.file,name,'normal');
  }
  const W=297,H=210,MX=17,RIGHT=280;
  const color={ink:'#0B0D12',blue:'#1F4FD1',muted:'#6B7280',light:'#E6E8EE',head:'#E8ECF9',alt:'#F4F5F8'};
  function font(bold,size,textColor=color.ink){
   doc.setFont(bold?'InterSB':'InterR','normal');
   doc.setFontSize(size);doc.setTextColor(textColor);
  }
  function lines(value,width,bold=false,size=9){
   font(bold,size);return doc.splitTextToSize(String(value||'—'),width);
  }
  const issue=String(entry.date||'').split('-').reverse().join('/');
  const originalDate=String(entry.date||state.date||'').split('-').reverse().join('/');
  // Paper header: firm logo, legal name and address, consistent with the
  // separate Estratto PDF family. No account ledger, trade period or balance.
  const logo=profile.logo;
  if(logo?.dataUrl){
   const ratio=Number(logo.ratio)||1;
   const height=16;const width=Math.min(57,height*ratio);
   doc.addImage(logo.dataUrl,'PNG',MX,11,width,Math.min(height,width/ratio),undefined,'FAST');
  }else{
   doc.setFillColor(color.blue);doc.roundedRect(MX,11,15,15,3,3,'F');
   font(true,8,'#FFFFFF');doc.text('LOGO',MX+7.5,20,{align:'center'});
  }
  font(false,8,color.muted);doc.text('RIEPILOGO DEL TRASFERIMENTO BANCARIO',RIGHT,15,{align:'right'});
  font(true,10.5);doc.text(issue,RIGHT,22,{align:'right'});
  let y=34;
  font(true,11.2);doc.text(String(profile.coName||'—').slice(0,160),MX,y);
  const address=(profile.coAddr||[]).join(' · ');
  for(const line of lines(address,240,false,8.5)){
   y+=4.5;font(false,8.5,color.muted);doc.text(line,MX,y);
  }
  y+=10;doc.setDrawColor(color.light);doc.setLineWidth(.45);doc.line(MX,y,RIGHT,y);
  y+=12; font(true,14,color.blue);
  doc.text('Trasferimento verso il conto bancario del beneficiario',MX,y);
  y+=7;font(false,8.5,color.muted);
  doc.text('Dati relativi al trasferimento comunicati dall’emittente',MX,y);
  y+=6;
  const items=[
   ['Cliente',state.client],['Identificativo cliente (facoltativo)',state.publicId||'—'],
   ['Data del trasferimento / richiesta',originalDate],['Riferimento del trasferimento',entry.reference||'—'],
   ['Beneficiario',entry.beneficiary],['Banca beneficiaria',entry.bank],
   ['IBAN / Conto bancario',entry.iban],['BIC / SWIFT',entry.bic||'—'],
   ['Importo destinato al beneficiario',amount+' '+String(entry.currency).toUpperCase()],
   ['Commissione',fee+' '+String(entry.currency).toUpperCase()],
   ['Stato del trasferimento',statusLabel],
   ['Riferimento banca',entry.bankRef||'Non fornito'],
   ['Causale / Note',entry.details||'—']
  ];
  const leftWidth=73,rowWidth=RIGHT-MX,valueWidth=rowWidth-leftWidth-12;
  doc.setFillColor(color.head);doc.rect(MX,y,rowWidth,8,'F');
  font(true,7.4,'#3A3F4B');doc.text('CAMPO',MX+4,y+5.5);doc.text('INFORMAZIONE',MX+leftWidth+4,y+5.5);y+=8;
  for(const [i,[label,value]] of items.entries()){
   const wrapped=lines(value,valueWidth,false,8.4);
   const height=Math.max(6.9,wrapped.length*3.8+2.7);
   if(y+height>173){
    doc.addPage('a4','landscape');y=24;
    font(true,10,color.blue);doc.text('Trasferimento bancario (segue)',MX,y);y+=9;
    doc.setFillColor(color.head);doc.rect(MX,y,rowWidth,8,'F');
    font(true,7.4,'#3A3F4B');doc.text('CAMPO',MX+4,y+5.5);doc.text('INFORMAZIONE',MX+leftWidth+4,y+5.5);y+=8;
   }
   if(i%2===1){doc.setFillColor(color.alt);doc.rect(MX,y,rowWidth,height,'F');}
   doc.setDrawColor(color.light);doc.line(MX,y+height,RIGHT,y+height);
   font(false,8,color.muted);doc.text(label,MX+4,y+5);
   font(label==='Stato del trasferimento',8.4,color.ink);
   wrapped.forEach((line,j)=>doc.text(line,MX+leftWidth+4,y+4.8+j*3.8));
   y+=height;
  }
  const footerY=183;
  doc.setDrawColor(color.light);doc.line(MX,footerY,RIGHT,footerY);
  font(false,7,color.muted);doc.text('Riepilogo emesso dalla societa indicata, non dalla banca del beneficiario.',MX,footerY+6);
  // Omit redundant informational footer. The document type remains identified at the top.
  if(profile.siteCaption){font(false,7,color.muted);doc.text(String(profile.siteCaption).slice(0,55),RIGHT,footerY+11,{align:'right'});}
  const pages=doc.getNumberOfPages();
  for(let i=1;i<=pages;i++){
   doc.setPage(i);font(false,7,color.muted);doc.text('Pagina '+i+' di '+pages,MX,205);
  }
  return {bytes:doc.output('arraybuffer'),pages};
 }
 return {generate};
});