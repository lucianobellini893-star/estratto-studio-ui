(() => {
 'use strict';
 const core=window.EstrattoWorkspace,$=id=>document.getElementById(id),key='estratto-library.v1';
 const names={editor:'Выписка по сделкам',account:'Выписка по счёту',mail:'Письмо'},stateKeys={editor:core.keys[0],account:core.keys[1],mail:core.keys[2]};
 const profileKeys=['coName','coAddr','coSite','discA','discC','logoSvg','logoFills','logoParts','logoLayout','logoGap'];
 let library={version:1,clients:[],drafts:[],history:[],templates:[]},editingClient=null,pendingBackup=null,autoTimer,noticeTimer,switching=false,libraryReadError=false;
 try{const raw=localStorage.getItem(key);if(raw)library=core.library(JSON.parse(raw));}catch(_){libraryReadError=true;notice('Не удалось прочитать библиотеку. Скачайте резервную копию перед изменениями.',true);}
 library.history=library.history||[];library.templates=library.templates||[];
 const id=()=>crypto.randomUUID(),clone=value=>JSON.parse(JSON.stringify(value));
 function notice(text,error=false){const box=$('library-message');box.hidden=false;box.textContent=text;box.classList.toggle('error',error);clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>box.hidden=true,9000);}
 function write(next){if(libraryReadError){notice('Библиотека повреждена. Сначала сохраните резервную копию или восстановите корректную.',true);return false;}try{localStorage.setItem(key,JSON.stringify(next));library=next;return true;}catch(_){notice('Не удалось сохранить: хранилище браузера недоступно или заполнено. Скачайте резервную копию.',true);return false;}}
 function current(type){return type==='editor'?window.EstrattoDocument.getState():type==='account'?window.EstrattoAccountForm.get():window.EstrattoMailForm.get();}
 function profile(){const data=current('editor');return Object.fromEntries(profileKeys.filter(key=>key in data).map(key=>[key,data[key]]));}
 function flush(){for(const type of core.types)localStorage.setItem(stateKeys[type],JSON.stringify(current(type)));}
 function active(type){try{return sessionStorage.getItem('estratto-active-'+type)||'';}catch(_){return '';}}
 function setActive(type,value){try{sessionStorage.setItem('estratto-active-'+type,value);}catch(_){}}
 function button(text,action,style=''){const b=document.createElement('button');b.type='button';b.className='btn small '+style;b.textContent=text;b.addEventListener('click',action);return b;}
 function text(tag,value,className=''){const n=document.createElement(tag);n.textContent=value;n.className=className;return n;}
 function symbol(kind){
  const node=document.createElement('span');node.className='library-symbol '+(kind==='mail'?'peach':'');
  node.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(kind==='mail'?'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>':'<path d="M6 3h8l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM14 3v5h5M8 12h7M8 16h7"/>')+'</svg>';return node;
 }
 function identity(title,subtitle,avatar){const box=document.createElement('div');box.className='library-identity';const copy=document.createElement('div');copy.append(text('h2',title),text('p',subtitle,'hint'));box.append(avatar,copy);return box;}
 function moreMenu(actions){const menu=document.createElement('details');menu.className='library-more';const summary=document.createElement('summary');summary.textContent='•••';summary.setAttribute('aria-label','Другие действия');const popup=document.createElement('div');popup.className='library-more-menu';popup.append(...actions);menu.append(summary,popup);menu.addEventListener('toggle',()=>{if(menu.open)document.querySelectorAll('.library-more[open]').forEach(other=>{if(other!==menu)other.open=false;});});popup.addEventListener('click',()=>menu.open=false);return menu;}
 function emptyState(list,filtered,kind){const box=document.createElement('div');box.className='library-empty';box.append(symbol(kind),text('h3',filtered?'Ничего не найдено':kind==='clients'?'Ваш первый клиент':'Здесь будут ваши черновики'),text('p',filtered?'Попробуйте другое имя или название.':kind==='clients'?'Заполните карточку справа, чтобы быстро создавать выписки.':'Сохраните выписку или письмо в редакторе — и продолжайте работу в любое время.'));list.append(box);}
 function stamp(value){const date=new Date(value);return Number.isFinite(date.getTime())?date.toLocaleString('ru-RU',{dateStyle:'short',timeStyle:'short'}):'—';}
 function saveDraft(type,newCopy=false,automatic=false){
  const input=$('draft-name-'+type),data=current(type),existing=!newCopy&&library.drafts.find(row=>row.id===active(type)&&row.type===type);
  if(automatic&&!existing)return;
  const title=input.value.trim()||data.clientName||data.title||names[type];
  const draft={id:existing?.id||id(),type,name:title.slice(0,120),updatedAt:new Date().toISOString(),data,profile:type==='mail'?undefined:profile()};
  const next=clone(library);if(existing)next.drafts[next.drafts.findIndex(row=>row.id===existing.id)]=draft;else next.drafts.push(draft);
  if(next.drafts.length>1000){notice('Достигнут лимит в 1000 черновиков. Удалите ненужные.',true);return;}
  if(write(next)){setActive(type,draft.id);input.value=draft.name;$('draft-status-'+type).textContent='Сохранено · '+stamp(draft.updatedAt);renderDrafts();renderDocumentHub();if(!automatic)notice('Черновик сохранён. Дальнейшие изменения сохраняются автоматически.');}
 }
 function checkpoint(type){
  const data=current(type),next=clone(library);
  const draft={id:id(),type,name:'Перед переключением · '+(data.clientName||data.title||names[type]),updatedAt:new Date().toISOString(),data,profile:type==='mail'?undefined:profile()};
  if(next.drafts.length>=1000)throw new Error('Сначала освободите место в черновиках.');
  next.drafts.push(draft);if(!write(next))throw new Error('Текущую работу сохранить не удалось.');
 }
 function switchTo(type,data,savedProfile,draftId=''){
  try{
   clearTimeout(autoTimer);checkpoint(type);flush();
   const before=core.capture(localStorage),next=clone(before);
   next.storage[stateKeys[type]]=clone(data);
   if(savedProfile&&type!=='mail')next.storage[stateKeys.editor]={...next.storage[stateKeys.editor],...Object.fromEntries(profileKeys.filter(key=>key in savedProfile).map(key=>[key,savedProfile[key]]))};
   core.restore(localStorage,next);setActive(type,draftId);switching=true;location.hash=type;location.reload();
  }catch(error){notice(error.message||'Не удалось открыть документ.',true);}
 }
 function renderDrafts(){
  const list=$('draft-list'),query=$('draft-search').value.trim().toLocaleLowerCase(),filter=$('draft-filter').value;list.replaceChildren();
  const rows=library.drafts.filter(row=>(!filter||row.type===filter)&&[row.name,row.data.clientName,row.data.title].some(value=>String(value||'').toLocaleLowerCase().includes(query))).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
  $('draft-total').textContent=library.drafts.length;
  if(!rows.length)emptyState(list,Boolean(query||filter),'editor');
  for(const row of rows){const card=document.createElement('article');card.className='card library-item';card.append(identity(row.name,names[row.type],symbol(row.type)),text('time',stamp(row.updatedAt),'library-date'));
   const actions=document.createElement('div');actions.className='library-actions';actions.append(button('Открыть',()=>switchTo(row.type,row.data,row.profile,row.id)),moreMenu([button('Создать копию',()=>{const next=clone(library);next.drafts.push({...clone(row),id:id(),name:(row.name+' · копия').slice(0,120),updatedAt:new Date().toISOString()});if(next.drafts.length>1000)return notice('Лимит: 1000 черновиков.',true);if(write(next))renderDrafts();}),button('Удалить',()=>removeRecord('drafts',row.id),'library-delete')]));
   card.append(actions);list.append(card);
  }
 }
 function removeRecord(collection,id){
  const next=clone(library),record=next[collection].find(row=>row.id===id);next[collection]=next[collection].filter(row=>row.id!==id);
  if(write(next)){render();const box=$('library-message');notice('Запись удалена.');box.append(button('Отменить удаление',()=>{const restored=clone(library);if(!restored[collection].some(row=>row.id===id))restored[collection].push(record);if(write(restored)){render();notice('Запись восстановлена.');}}));}
 }
 function resetClient(){editingClient=null;$('client-form').reset();$('client-form-title').textContent='Новый клиент';$('client-cancel').hidden=true;}
 $('client-cancel').addEventListener('click',resetClient);
 $('client-form').addEventListener('submit',event=>{
  event.preventDefault();const name=$('library-client-name').value.trim(),publicId=$('library-client-id').value.trim().toUpperCase(),currency=$('library-client-currency').value;
  if(!name)return $('library-client-name').focus();
  const next=clone(library);if(publicId&&next.clients.some(row=>row.publicId.replace(/\s/g,'')===publicId.replace(/\s/g,'')&&row.id!==editingClient))return notice('Клиент с таким публичным ID уже существует.',true);
  const client={id:editingClient||id(),name,publicId,currency,updatedAt:new Date().toISOString()};const index=next.clients.findIndex(row=>row.id===editingClient);if(index>=0)next.clients[index]=client;else next.clients.push(client);
  if(next.clients.length>2000)return notice('Лимит: 2000 клиентов.',true);
  if(write(next)){resetClient();renderClients();notice('Клиент сохранён.');}
 });
 function renderClients(){
  const query=$('client-search').value.trim().toLocaleLowerCase(),list=$('client-list');list.replaceChildren();
  const rows=library.clients.filter(row=>(row.name+' '+row.publicId).toLocaleLowerCase().includes(query)).sort((a,b)=>a.name.localeCompare(b.name));
  $('client-total').textContent=library.clients.length;
  if(!rows.length)emptyState(list,Boolean(query),'clients');
  for(const row of rows){const card=document.createElement('article');card.className='card library-item';card.classList.add('client-item');const avatar=text('span',row.name.split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase(),'library-avatar');card.append(identity(row.name,row.publicId||'Без публичного ID',avatar));
   const actions=document.createElement('div');actions.className='library-actions';actions.append(text('span',row.currency,'library-currency'),button('Выписка по счёту',()=>switchTo('account',{clientName:row.name,publicId:row.publicId,clientId:'',accountId:'',currency:row.currency,date:new Date().toLocaleDateString('en-CA'),cash:[],crypto:[],transactions:[]})),moreMenu([button('Новая выписка по сделкам',()=>switchTo('editor',{...current('editor'),clientName:row.name,clientId:row.publicId,trades:''})),button('Изменить',()=>{editingClient=row.id;$('library-client-name').value=row.name;$('library-client-id').value=row.publicId;const select=$('library-client-currency');if(![...select.options].some(option=>option.value===row.currency))select.add(new Option(row.currency,row.currency));select.value=row.currency;$('client-form-title').textContent='Редактирование клиента';$('client-cancel').hidden=false;$('library-client-name').focus();}),button('Удалить',()=>removeRecord('clients',row.id),'library-delete')]));
   card.append(actions);list.append(card);
  }
 }
 for(const type of core.types){
  const root=$('page-'+type),heading=root.querySelector('.editor-heading');
  const bar=document.createElement('div');bar.className='draft-toolbar';
  const input=document.createElement('input');input.type='text';input.id='draft-name-'+type;input.maxLength=120;input.placeholder='Название черновика';input.setAttribute('aria-label','Название черновика');input.value=library.drafts.find(row=>row.id===active(type))?.name||'';
  const status=text('span','Сохраните черновик, чтобы включить автосохранение.','hint');status.id='draft-status-'+type;
  bar.append(input,button('Сохранить черновик',()=>saveDraft(type)),button('Сохранить копию',()=>saveDraft(type,true)),status);heading.after(bar);
  root.addEventListener('input',event=>{if(!active(type))return;clearTimeout(autoTimer);status.textContent='Сохраняю…';autoTimer=setTimeout(()=>saveDraft(type,false,true),700);});
  root.addEventListener('click',event=>{if(event.target.closest('[data-account-add],[data-remove],#mail-logo-remove,[data-mail-format],#mail-footer-enabled')){clearTimeout(autoTimer);autoTimer=setTimeout(()=>saveDraft(type,false,true),700);}});
 }
 document.addEventListener('estratto:navigate',()=>{for(const type of core.types)if(active(type))saveDraft(type,false,true);render();});
 document.addEventListener('click',event=>document.querySelectorAll('.library-more[open]').forEach(menu=>{if(!menu.contains(event.target))menu.open=false;}));
 document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('.library-more[open]').forEach(menu=>{menu.open=false;menu.querySelector('summary').focus();});});
 $('draft-search').addEventListener('input',renderDrafts);$('draft-filter').addEventListener('change',renderDrafts);$('client-search').addEventListener('input',renderClients);
 function renderDocumentHub(){
  $('document-hub-count').textContent=library.drafts.length;
  const list=$('document-hub-recent');list.replaceChildren();
  const rows=[...library.drafts].sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0,4);
  if(!rows.length)emptyState(list,false,'editor');
  for(const row of rows){const item=document.createElement('article');item.className='card library-item';const actions=document.createElement('div');actions.className='library-actions';actions.append(button('Продолжить',()=>switchTo(row.type,row.data,row.profile,row.id)));item.append(identity(row.name,names[row.type],symbol(row.type)),text('time',stamp(row.updatedAt),'library-date'),actions);list.append(item);}
 }
 function render(){renderDrafts();renderClients();renderDocumentHub();renderHistory();renderTemplates();$('backup-summary').textContent=library.clients.length+' клиентов · '+library.drafts.length+' черновиков · '+library.history.length+' в истории · '+library.templates.length+' шаблонов';}
 $('backup-download').addEventListener('click',()=>{try{flush();if(!localStorage.getItem(key)&&!write(library))return;const backup=core.capture(localStorage);const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='estratto-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('Резервная копия скачана.');}catch(_){notice('Не удалось создать резервную копию. Проверьте доступность хранилища браузера.',true);}});
 function cancelBackup(){pendingBackup=null;$('backup-review').hidden=true;}
 $('backup-file').addEventListener('change',async event=>{const file=event.target.files[0];event.target.value='';cancelBackup();if(!file)return;try{if(file.size>12000000)throw new Error('Файл — до 12 МБ.');pendingBackup=core.parseBackup(await file.text());const data=pendingBackup.storage[key];$('backup-review-text').textContent='Файл проверен: '+(data?.clients.length||0)+' клиентов, '+(data?.drafts.length||0)+' черновиков, '+(data?.history?.length||0)+' в истории, '+(data?.templates?.length||0)+' шаблонов. Разделов данных: '+Object.keys(pendingBackup.storage).length+'.';$('backup-review').hidden=false;}catch(error){notice(error.message,true);}});
 $('backup-cancel').addEventListener('click',cancelBackup);
 $('backup-restore').addEventListener('click',()=>{if(!pendingBackup)return;try{clearTimeout(autoTimer);core.restore(localStorage,pendingBackup);switching=true;for(const type of core.types)setActive(type,'');location.hash='backup';location.reload();}catch(_){notice('Восстановление не выполнено. Текущие данные сохранены; возможно, хранилище заполнено.',true);}});

 window.EstrattoRecordExport=(type,action,data,savedProfile)=>{
  if(!core.types.includes(type))return;
  const snapshot=clone(data||current(type));const next=clone(library);
  if(next.history.length>=1000)return notice('История заполнена (1000 записей). Экспорт выполнен, но запись не сохранена. Удалите ненужные записи.',true);
  next.history.push({id:id(),type,action,name:(snapshot.clientName||snapshot.title||names[type]).slice(0,200),createdAt:new Date().toISOString(),data:snapshot,profile:type==='mail'?undefined:savedProfile|| (type==='editor'?Object.fromEntries(profileKeys.filter(key=>key in snapshot).map(key=>[key,snapshot[key]])):profile())});
  if(write(next))renderHistory();
 };
 function renderHistory(){
  const list=$('history-list'),query=$('history-search').value.trim().toLocaleLowerCase(),filter=$('history-filter').value;list.replaceChildren();$('history-total').textContent=library.history.length;
  const rows=library.history.filter(row=>(!filter||row.type===filter)&&[row.name,row.data.publicId,row.data.clientId,row.action,stamp(row.createdAt)].some(value=>String(value||'').toLocaleLowerCase().includes(query))).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  if(!rows.length){const box=document.createElement('div');box.className='library-empty';box.append(symbol('editor'),text('h3',query||filter?'Ничего не найдено':'Здесь появится история'),text('p',query||filter?'Попробуйте другой запрос.':'Скачайте PDF или экспортируйте письмо — запись появится здесь автоматически.'));list.append(box);}
  for(const row of rows){const card=document.createElement('article');card.className='card library-item history-item';const actions=document.createElement('div');actions.className='library-actions';actions.append(button('Открыть копию',()=>switchTo(row.type,row.data,row.profile)),moreMenu([button('Удалить',()=>removeRecord('history',row.id),'library-delete')]));card.append(identity(row.name,names[row.type]+' · '+row.action,symbol(row.type)),text('time',stamp(row.createdAt),'library-date'),actions);list.append(card);}
 }
 $('history-search').addEventListener('input',renderHistory);$('history-filter').addEventListener('change',renderHistory);
 let editingTemplate=null,templateSource=null,usingTemplate=null;
 function resetTemplate(){editingTemplate=null;templateSource=null;$('template-form').reset();$('template-form-title').textContent='Новый шаблон';$('template-cancel').hidden=true;}
 $('template-cancel').addEventListener('click',resetTemplate);
 $('template-form').addEventListener('submit',event=>{
  event.preventDefault();const name=$('template-name').value.trim(),body=$('template-text').value;if(!name||!body.trim())return;
  const data={...(templateSource||current('mail')),title:$('template-title').value,text:body};
  if(templateSource?.text!==body)delete data.runs;
  const next=clone(library),index=next.templates.findIndex(row=>row.id===editingTemplate),row={id:editingTemplate||id(),name,updatedAt:new Date().toISOString(),data};
  if(index>=0)next.templates[index]=row;else next.templates.push(row);
  if(next.templates.length>1000)return notice('Лимит: 1000 шаблонов.',true);
  if(write(next)){resetTemplate();renderTemplates();notice('Шаблон письма сохранён.');}
 });
 document.querySelectorAll('[data-template-token]').forEach(button=>button.addEventListener('click',()=>{const input=$('template-text');input.setRangeText('{{'+button.dataset.templateToken+'}}',input.selectionStart,input.selectionEnd,'end');input.focus();input.dispatchEvent(new Event('input',{bubbles:true}));}));
 function editTemplate(row){editingTemplate=row.id;templateSource=clone(row.data);$('template-name').value=row.name;$('template-title').value=row.data.title||'';$('template-text').value=row.data.text||'';$('template-form-title').textContent='Редактирование шаблона';$('template-cancel').hidden=false;$('template-name').focus();}
 function renderTemplates(){
  const list=$('template-list'),query=$('template-search').value.trim().toLocaleLowerCase();list.replaceChildren();$('template-total').textContent=library.templates.length;
  const rows=library.templates.filter(row=>(row.name+' '+row.data.title).toLocaleLowerCase().includes(query)).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
  if(!rows.length){const box=document.createElement('div');box.className='library-empty';box.append(symbol('mail'),text('h3',query?'Ничего не найдено':'Ваш первый шаблон'),text('p',query?'Попробуйте другое название.':'Добавьте текст в форме или сохраните оформленное письмо из редактора.'));list.append(box);}
  for(const row of rows){const item=document.createElement('article');item.className='card library-item template-item';const actions=document.createElement('div');actions.className='library-actions';actions.append(button('Использовать',()=>useTemplate(row)),moreMenu([button('Изменить',()=>editTemplate(row)),button('Удалить',()=>removeRecord('templates',row.id),'library-delete')]));item.append(identity(row.name,row.data.title||'Без заголовка',symbol('mail')),actions);list.append(item);}
 }
 $('template-search').addEventListener('input',renderTemplates);
 const saveTemplate=button('Сохранить как шаблон',()=>{const data=current('mail');if(!String(data.text||'').trim())return notice('Сначала добавьте текст письма.',true);resetTemplate();templateSource=clone(data);$('template-name').value=data.title||'Новый шаблон';$('template-title').value=data.title||'';$('template-text').value=data.text;window.EstrattoNavigate('templates');$('template-name').focus();});
 $('page-mail').querySelector('.draft-toolbar').append(saveTemplate);
 function values(){return {client_name:$('template-use-name').value,company:$('template-use-company').value,amount:$('template-use-amount').value,date:$('template-use-date').value};}
 function previewTemplate(){
  if(!usingTemplate)return;
  try{const data=core.applyTemplate(usingTemplate.data,values());$('template-result-title').textContent=data.title;$('template-result-text').textContent=data.text;$('template-use-message').textContent='Готово к открытию в редакторе письма.';}
  catch(error){$('template-result-title').textContent=usingTemplate.data.title||'';$('template-result-text').textContent=usingTemplate.data.text||'';$('template-use-message').textContent=error.message;}
 }
 function useTemplate(row){
  usingTemplate=row;const select=$('template-use-client');select.replaceChildren(new Option('Ввести вручную',''));for(const client of library.clients)select.add(new Option(client.name,client.id));
  $('template-use-name').value='';$('template-use-company').value=current('editor').coName||'';$('template-use-amount').value='';$('template-use-date').value=new Date().toLocaleDateString('it-IT');
  $('template-use-title').textContent=row.name;previewTemplate();$('template-use-dialog').showModal();
 }
 $('template-use-client').addEventListener('change',event=>{const client=library.clients.find(row=>row.id===event.target.value);if(client)$('template-use-name').value=client.name;previewTemplate();});
 $('template-use-form').addEventListener('input',previewTemplate);
 for(const id of ['template-use-close','template-use-cancel'])$(id).addEventListener('click',()=>$('template-use-dialog').close());
 $('template-use-form').addEventListener('submit',event=>{event.preventDefault();if(!usingTemplate)return;try{const data=core.applyTemplate(usingTemplate.data,values());$('template-use-dialog').close();switchTo('mail',data);}catch(error){$('template-use-message').textContent=error.message;}});
 window.addEventListener('beforeunload',()=>{if(switching)return;for(const type of core.types)if(active(type))saveDraft(type,false,true);});
 render();
})();
