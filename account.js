/* Manual trading-account workflow. The trade statement keeps its own data. */
(() => {
  'use strict';
  const core = window.EstrattoAccount, shared = window.EstrattoDocument;
  const $ = id => document.getElementById(id);
  const storeKey = 'estratto-conto.v1';
  const now = new Date();
  const today = [now.getFullYear(), String(now.getMonth()+1).padStart(2,'0'), String(now.getDate()).padStart(2,'0')].join('-');
  const initial = { clientName:'', clientId:'', accountId:'', date:today, currency:'USD', cash:[], crypto:[], transactions:[] };
  let state = { ...initial };
  try {
    const saved = JSON.parse(localStorage.getItem(storeKey));
    if (saved && typeof saved === 'object') state = { ...initial, ...saved };
  } catch (_) { /* Storage can be disabled by browser settings. */ }
  for (const group of ['cash','crypto','transactions']) {
    if (!Array.isArray(state[group])) state[group] = [];
    state[group] = state[group].filter(row => row && typeof row === 'object').slice(0,1000);
  }
  const labels = { deposit:'Пополнение', withdrawal:'Вывод', transfer:'Перевод', fee:'Комиссия', result:'Торговый результат', interest:'Проценты', adjustment:'Корректировка', other:'Другое' };
  let lastPdf = null, generation = 0, renderGeneration = 0, timer = null, attemptedDownload = false;
  const persist = () => { try { localStorage.setItem(storeKey, JSON.stringify(state)); } catch (_) {} };
  const node = (tag, className, text) => { const e = document.createElement(tag); if(className)e.className=className; if(text!==undefined)e.textContent=text; return e; };
  function field(group, index, key, label, options = {}) {
    const wrapper = node('label','f',label);
    const input = node(options.select ? 'select' : options.textarea ? 'textarea' : 'input');
    input.dataset.group = group; input.dataset.index = index; input.dataset.field = key;
    input.id = `ac-${group}-${index}-${key}`;
    if (options.select) for (const [value, text] of Object.entries(labels)) { const o=node('option','',text); o.value=value; input.append(o); }
    else if (!options.textarea) input.type = options.date ? 'date' : 'text';
    if (options.number) { input.inputMode='decimal'; input.autocomplete='off'; }
    if (options.placeholder) input.placeholder = options.placeholder;
    if (options.max) input.maxLength = options.max;
    if (options.textarea) { input.rows=2; input.maxLength=300; }
    input.value = state[group][index][key] || '';
    wrapper.append(input); return wrapper;
  }
  function renderRows(group) {
    const container = $(`ac-${group}-rows`); container.replaceChildren();
    if (!state[group].length) {
      container.append(node('p','account-empty',group==='transactions' ? 'Операции пока не добавлены. Без них PDF будет содержать пометку «Данные об операциях не предоставлены».' : 'Остатки пока не добавлены.'));
    }
    state[group].forEach((row,index) => {
      const article=node('div','account-entry'), header=node('div','account-entry-heading');
      header.append(node('span','',`${group==='transactions'?'Операция':'Актив'} ${String(index+1).padStart(2,'0')}`));
      const remove=node('button','account-remove','Удалить'); remove.type='button'; remove.dataset.remove=group; remove.dataset.index=index;
      remove.setAttribute('aria-label',`Удалить ${group==='transactions'?'операцию':'актив'} ${index+1}`);
      header.append(remove); article.append(header);
      const row1=node('div','row'), row2=node('div','row');
      if (group==='transactions') {
        row1.append(field(group,index,'date','Дата',{date:true}),field(group,index,'type','Тип операции',{select:true}));
        row2.append(field(group,index,'amount','Сумма (+ / −)',{number:true,placeholder:'+100.00 или −25.00'}),field(group,index,'currency','Валюта',{max:10,placeholder:'USD'}));
        article.append(row1,row2,field(group,index,'description','Описание',{textarea:true}),field(group,index,'reference','ID / Референс (необязательно)',{max:80}));
      } else {
        row1.append(field(group,index,'asset','Название актива',{max:80,placeholder:group==='cash'?'Euro':'Ethereum'}),field(group,index,'symbol','Символ',{max:16,placeholder:group==='cash'?'EUR':'ETH'}));
        row2.append(field(group,index,'quantity','Количество',{number:true,placeholder:'0.0000'}),field(group,index,'price',`Цена (${state.currency || 'USD'})`,{number:true,placeholder:'0.0000'}));
        article.append(row1,field(group,index,'wallet','Кошелёк / Портфель',{max:40,placeholder:'Spot'}),row2);
        const total=node('div','account-row-total'); total.append(node('span','','Стоимость'));
        const result=node('output'); result.id=`ac-${group}-${index}-value`; total.append(result); article.append(total);
      }
      container.append(article);
    });
    $(`ac-${group}-count`).textContent = state[group].length;
  }
  function updateSummary(model) {
    const valid = model.cash.length===state.cash.length && model.crypto.length===state.crypto.length && (model.cash.length+model.crypto.length)>0;
    $('ac-total').textContent = valid ? `${core.money(model.total)} ${model.currency}` : '—';
    $('ac-cash-total').textContent = valid ? `${core.money(model.cashTotal)} ${model.currency}` : '—';
    $('ac-crypto-total').textContent = valid ? `${core.money(model.cryptoTotal)} ${model.currency}` : '—';
    for (const group of ['cash','crypto']) state[group].forEach((row,index) => {
      let text='—';
      try { text=core.money(core.productMoney(core.decimal(row.quantity),core.decimal(row.price)))+' '+(state.currency||'USD').toUpperCase(); } catch (_) {}
      const output=$(`ac-${group}-${index}-value`); if(output)output.textContent=text;
    });
  }
  function issueTarget(path) {
    if (path === 'assets') return document.querySelector('[data-account-add="cash"]');
    const row = path.match(/^(cash|crypto|transactions)\.(\d+)\.(\w+)$/);
    return row ? $(`ac-${row[1]}-${row[2]}-${row[3]}`) : document.querySelector(`[data-account-field="${path}"]`);
  }
  function showValidation(checked, focus = false) {
    const root = $('page-account');
    for (const target of root.querySelectorAll('[data-account-invalid]')) {
      target.removeAttribute('aria-invalid'); target.removeAttribute('aria-describedby'); delete target.dataset.accountInvalid;
    }
    root.querySelectorAll('.account-field-error').forEach(message => message.remove());
    const box = $('ac-validation'); box.replaceChildren(); box.hidden = !attemptedDownload || !checked.issues.length;
    if (!attemptedDownload) return;
    if (checked.issues.length) box.textContent = 'Заполните или исправьте поля, выделенные красным. PDF пока не скачан.';
    checked.issues.forEach((issue,index) => {
      const target = issueTarget(issue.path); if (!target || target.dataset.accountInvalid) return;
      target.dataset.accountInvalid='true'; target.setAttribute('aria-invalid','true');
      const message=node('span','account-field-error',issue.message); message.id=`account-error-${index}`;
      target.setAttribute('aria-describedby',message.id);
      if(target.closest('label.f'))target.closest('label.f').append(message); else target.after(message);
    });
    if (focus && checked.issues.length) {
      const first = issueTarget(checked.issues[0].path);
      if (first) { first.scrollIntoView({block:'center',behavior:'instant'}); first.focus({preventScroll:true}); }
    }
  }
  function invalidate() {
    clearTimeout(timer); generation++; renderGeneration++; lastPdf=null;
    $('ac-download-message').hidden=true;
    const checked=core.validate(state), model=core.preview(state); updateSummary(checked); showValidation(checked);
    $('ac-download').textContent='Скачать PDF';
    $('ac-pv-status').textContent='Обновляю PDF…';$('ac-stage').setAttribute('aria-busy','true');
    const seq=generation;timer=setTimeout(()=>build(model,seq),300);
  }

  function drawContent(model) {
    return ({doc,f,C,W,H,MX,RIGHT,PT,PAD,ROW_H,HEAD_H,FRAME_FIRST,FRAME_NEXT,FRAME_BOTTOM}) => {
      let y=FRAME_FIRST;
      const width=RIGHT-MX, lineHeight=3.7;
      const newPage=()=>{doc.addPage('a4','landscape');y=FRAME_NEXT;};
      const ensure=height=>{if(y+height>FRAME_BOTTOM)newPage();};
      const title=text=>{f('InterSB',12,C.BLUE);doc.text(text,MX,y+4.3);y+=9;};
      const header=columns=>{
        doc.setFillColor(C.HEAD);doc.rect(MX,y,width,HEAD_H,'F');f('InterR',7.2,C.SOFT);
        let x=MX;
        for(const col of columns){doc.text(col.label,col.right?x+col.width-PAD:x+PAD,y+HEAD_H/2+7.2*PT*.36,{align:col.right?'right':'left'});x+=col.width;}
        y+=HEAD_H;
      };
      function table(name,columns,rows,total,empty) {
        f('InterR',8.3,C.BLACK);
        const firstHeight=rows.length?Math.max(ROW_H,...rows[0].cells.map((value,i)=>doc.splitTextToSize(String(value),columns[i].width-2*PAD).length*lineHeight+3)):ROW_H;
        ensure(9+HEAD_H+firstHeight+(rows.length<=1&&total!==undefined?9:0));title(name);header(columns);
        if(!rows.length){ensure(ROW_H);f('InterR',8.3,C.GRAY);doc.text(empty,MX+PAD,y+5);y+=ROW_H;}
        rows.forEach((row,index)=>{
          f('InterR',8.3,C.BLACK);
          const lines=row.cells.map((value,i)=>doc.splitTextToSize(String(value),columns[i].width-2*PAD));
          const height=Math.max(ROW_H,...lines.map(l=>l.length*lineHeight+3));
          const reserve=index===rows.length-1&&total!==undefined?9:0;
          if(y+height+reserve>FRAME_BOTTOM){newPage();title(name+' (segue)');header(columns);}
          if(index%2===1){doc.setFillColor(C.ALT);doc.rect(MX,y,width,height,'F');}
          doc.setDrawColor(C.LINE);doc.setLineWidth(.4*PT);doc.line(MX,y+height,RIGHT,y+height);
          let x=MX;
          lines.forEach((cell,i)=>{
            f('InterR',8.3,row.amountIndex===i?(row.amount===null?C.GRAY:row.amount>0n?C.GREEN:C.RED):C.BLACK);
            cell.forEach((text,j)=>doc.text(text,columns[i].right?x+columns[i].width-PAD:x+PAD,y+4.9+j*lineHeight,{align:columns[i].right?'right':'left'}));x+=columns[i].width;
          });y+=height;
        });
        if(total!==undefined){ensure(9);f('InterSB',9,C.BLACK);doc.text('Totale',MX+PAD,y+6);doc.text((total===null?'—':core.money(total))+' '+(model.currency||'—'),RIGHT-PAD,y+6,{align:'right'});y+=9;}
        y+=6;
      }
      const assetColumns=[['ATTIVITÀ',62],['SIMBOLO',26],['PORTAFOGLIO',40],['QUANTITÀ',42,true],[`PREZZO (${model.currency})`,45,true],[`VALORE (${model.currency})`,50,true]].map(([label,width,right])=>({label,width,right}));
      const assetRows=rows=>rows.map(r=>({cells:[r.asset,r.symbol,r.wallet,r.quantity,r.price,r.value===null?'—':core.money(r.value)]}));
      table('Disponibilità liquide',assetColumns,assetRows(model.cash),model.cashTotal,'Disponibilità liquide non indicate.');
      table('Criptoattività',assetColumns,assetRows(model.crypto),model.cryptoTotal,'Criptoattività non indicate.');
      const txColumns=[['DATA',28],['OPERAZIONE',42],['DESCRIZIONE',76],['IMPORTO',40,true],['VALUTA',22],['RIFERIMENTO',57]].map(([label,width,right])=>({label,width,right}));
      const date=value=>value?value.split('-').reverse().join('/'):'—';
      table('Movimenti del conto',txColumns,model.transactions.map(r=>({cells:[date(r.date),core.types[r.type]||'—',r.description||'—',r.amount===null?'—':core.money(r.amount,true),r.currency,r.reference||'—'],amount:r.amount,amountIndex:3})),undefined,'Dati sui movimenti non forniti.');

    };
  }
  async function build(model,seq) {
    try {
      const profile=shared.collectProfile();
      const data={...profile,mode:'conto',trades:[],clientName:model.clientName||'—',clientId:model.clientId||'—',accountId:model.accountId||'—',
        accountBalance:(model.total===null?'—':core.money(model.total))+' '+(model.currency||'—'),
        referenceDate:core.validDate(model.date||'')?model.date.split('-').reverse().join('/'):'—',toIso:model.date,
        disclaimer:'Il presente documento riepiloga le disponibilità e i movimenti del conto alla data indicata, sulla base dei dati forniti. La valorizzazione degli attivi è espressa nella valuta di riferimento. I movimenti mantengono la propria valuta e non vengono sommati nuovamente al saldo. Documento riservato al cliente; non costituisce consulenza finanziaria.'};
      const result=await shared.buildPdf(data,drawContent(model));
      if(seq!==generation)return;
      lastPdf={bytes:result.bytes,pages:result.pages,model,generation:seq};
      $('ac-pv-status').textContent=`${result.pages} ${result.pages===1?'страница':'стр.'} · ${model.transactions.length} операций`;
      if($('page-account').classList.contains('active')) {
        try { await renderPreview(lastPdf); }
        catch(e) { if(seq===generation)previewError(e); }
      }
    } catch(e) {
      if(seq!==generation)return;
      lastPdf=null;$('ac-pv-status').textContent='Не удалось собрать PDF';
      $('ac-validation').hidden=false;$('ac-validation').textContent='PDF не собран: '+e.message;
    } finally { if(seq===generation)$('ac-stage').removeAttribute('aria-busy'); }
  }
  function previewError(error) {
    const message=node('div','msg','PDF сформирован и доступен для скачивания. Не удалось показать предпросмотр: '+error.message);
    $('ac-stage').replaceChildren(message);
    $('ac-pv-status').textContent='PDF готов; предпросмотр недоступен';
  }
  async function renderPreview(pdf) {
    const seq=++renderGeneration, stage=$('ac-stage');
    if(typeof pdfjsLib==='undefined'){stage.replaceChildren(node('div','msg','Предпросмотр недоступен. Готовый PDF можно скачать.'));return;}
    const documentPdf=await pdfjsLib.getDocument({data:new Uint8Array(pdf.bytes.slice(0))}).promise;
    try {
      const fragment=document.createDocumentFragment();
      const width=Math.max(320,stage.clientWidth-48),dpr=Math.max(2,Math.min(devicePixelRatio||1,3));
      for(let i=1;i<=documentPdf.numPages;i++){
        const page=await documentPdf.getPage(i),base=page.getViewport({scale:1});
        const viewport=page.getViewport({scale:width/base.width*dpr}),canvas=node('canvas');canvas.width=Math.round(viewport.width);canvas.height=Math.round(viewport.height);canvas.setAttribute('aria-label',`Выписка по счёту, страница ${i}`);
        await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
        if(seq!==renderGeneration)return;
        fragment.append(canvas,node('div','pagelabel',`стр. ${i} из ${documentPdf.numPages}`));
      }
      if(seq===renderGeneration)stage.replaceChildren(fragment);
    } finally { await documentPdf.destroy(); }
  }
  $('page-account').addEventListener('input',event=>{
    const input=event.target;
    if(input.dataset.accountField){
      state[input.dataset.accountField]=input.value;
      if(input.dataset.accountField==='currency')for(const price of document.querySelectorAll('#page-account [data-field=price]'))price.parentElement.firstChild.textContent=`Цена (${input.value.toUpperCase() || 'USD'})`;
      persist();invalidate();
    }
    else if(input.dataset.group){state[input.dataset.group][Number(input.dataset.index)][input.dataset.field]=input.value;persist();invalidate();}
    else if(input.dataset.profileField){const original=$(input.dataset.profileField);original.value=input.value;original.dispatchEvent(new Event('input',{bubbles:true}));}
  });
  $('page-account').addEventListener('click',event=>{
    const add=event.target.closest('[data-account-add]'),remove=event.target.closest('[data-remove]');
    if(add){
      const group=add.dataset.accountAdd;
      if(state[group].length>=1000)return;
      state[group].push(group==='transactions'?{date:state.date,type:'deposit',amount:'',currency:state.currency,description:'',reference:''}:{asset:'',symbol:'',wallet:'Spot',quantity:'',price:''});
      renderRows(group);persist();invalidate();$(`ac-${group}-${state[group].length-1}-${group==='transactions'?'date':'asset'}`).focus();
    }
    if(remove){
      const group=remove.dataset.remove,index=Number(remove.dataset.index);state[group].splice(index,1);renderRows(group);persist();invalidate();
      const focus=$(`ac-${group}-${Math.min(index,state[group].length-1)}-${group==='transactions'?'date':'asset'}`)||document.querySelector(`[data-account-add="${group}"]`);focus.focus();
    }
  });
  function syncProfile() {
    for(const input of document.querySelectorAll('[data-profile-field]'))if(input!==document.activeElement)input.value=$(input.dataset.profileField).value;
    $('ac-logo-status').textContent=shared.collectProfile().logo?'Используется ваш логотип':'Логотип пока не загружен';
  }
  document.addEventListener('estratto:profilechange',()=>{syncProfile();invalidate();});
  function moveLogo(page) {
    const account=page==='account', slot=$(account?'account-logo-slot':'trade-logo-slot');
    slot.append($('shared-logo-editor'));
    $('h-logo').querySelector('.step').textContent=account?'7':'5';
    shared.relayoutLogo();
  }
  document.addEventListener('estratto:navigate',event=>{
    moveLogo(event.detail);
    if(event.detail==='account'&&lastPdf)renderPreview(lastPdf).catch(previewError);
  });
  let resizeTimer;
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(lastPdf&&$('page-account').classList.contains('active'))renderPreview(lastPdf).catch(()=>{});},250);});
  $('ac-download').addEventListener('click',async()=>{
    attemptedDownload=true;
    const checked=core.validate(state); showValidation(checked,true);
    if(checked.issues.length)return;
    clearTimeout(timer);
    const seq=generation;
    $('ac-download').disabled=true;
    try {
      if(!lastPdf || lastPdf.generation!==seq)await build(core.preview(state),seq);
      if(!lastPdf || generation!==seq || lastPdf.model.errors.length)return;
      const slug=lastPdf.model.accountId.replace(/[^A-Za-z0-9]+/g,'_')||'account';
      const url=URL.createObjectURL(new Blob([lastPdf.bytes],{type:'application/pdf'})),link=node('a');
      link.href=url;link.download=`estratto_conto_${slug}_${(lastPdf.model.date||'').replace(/-/g,'')}.pdf`;
      document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);
      $('ac-download-message').textContent='PDF скачан.';$('ac-download-message').hidden=false;
    } finally { $('ac-download').disabled=false; }
  });
  for(const input of document.querySelectorAll('[data-account-field]'))input.value=state[input.dataset.accountField]||'';
  for(const group of ['cash','crypto','transactions'])renderRows(group);
  moveLogo($('page-account').classList.contains('active')?'account':'editor');
  syncProfile();invalidate();
})();
