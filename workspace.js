(() => {
 'use strict';
 const core=window.EstrattoWorkspace,$=id=>document.getElementById(id),key='estratto-library.v1';
 const names={editor:'Выписка по сделкам',account:'Выписка по счёту',mail:'Письмо'},stateKeys={editor:core.keys[0],account:core.keys[1],mail:core.keys[2]};
 const profileKeys=['coName','coAddr','coSite','discA','discC','logoSvg','logoFills','logoParts','logoLayout','logoGap'];
 let library={version:1,clients:[],drafts:[]},editingClient=null,pendingBackup=null,autoTimer,noticeTimer,switching=false,libraryReadError=false;
 try{const raw=localStorage.getItem(key);if(raw)library=core.library(JSON.parse(raw));}catch(_){libraryReadError=true;notice('Не удалось прочитать библиотеку. Скачайте резервную копию перед изменениями.',true);}
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
 function stamp(value){const date=new Date(value);return Number.isFinite(date.getTime())?date.toLocaleString('ru-RU',{dateStyle:'short',timeStyle:'short'}):'—';}
 function saveDraft(type,newCopy=false,automatic=false){
  const input=$('draft-name-'+type),data=current(type),existing=!newCopy&&library.drafts.find(row=>row.id===active(type)&&row.type===type);
  if(automatic&&!existing)return;
  const title=input.value.trim()||data.clientName||data.title||names[type];
  const draft={id:existing?.id||id(),type,name:title.slice(0,120),updatedAt:new Date().toISOString(),data,profile:type==='mail'?undefined:profile()};
  const next=clone(library);if(existing)next.drafts[next.drafts.findIndex(row=>row.id===existing.id)]=draft;else next.drafts.push(draft);
  if(next.drafts.length>1000){notice('Достигнут лимит в 1000 черновиков. Удалите ненужные.',true);return;}
  if(write(next)){setActive(type,draft.id);input.value=draft.name;$('draft-status-'+type).textContent='Сохранено · '+stamp(draft.updatedAt);renderDrafts();if(!automatic)notice('Черновик сохранён. Дальнейшие изменения сохраняются автоматически.');}
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
  if(!rows.length)list.append(text('p',library.drafts.length?'Ничего не найдено.':'Сохраните первый черновик в редакторе выписки или письма.','account-empty'));
  for(const row of rows){const card=document.createElement('article');card.className='card library-item';card.append(text('h2',row.name),text('p',names[row.type]+' · '+stamp(row.updatedAt),'hint'));
   const actions=document.createElement('div');actions.className='library-actions';actions.append(button('Открыть',()=>switchTo(row.type,row.data,row.profile,row.id),'primary'),button('Создать копию',()=>{const next=clone(library);next.drafts.push({...clone(row),id:id(),name:(row.name+' · копия').slice(0,120),updatedAt:new Date().toISOString()});if(next.drafts.length>1000)return notice('Лимит: 1000 черновиков.',true);if(write(next))renderDrafts();}),button('Удалить',()=>removeRecord('drafts',row.id)));
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
  if(!rows.length)list.append(text('p',library.clients.length?'Ничего не найдено.':'Добавьте первого клиента.','account-empty'));
  for(const row of rows){const card=document.createElement('article');card.className='card library-item';card.append(text('h2',row.name),text('p',(row.publicId||'Без публичного ID')+' · '+row.currency,'hint'));
   const actions=document.createElement('div');actions.className='library-actions';actions.append(button('Новая выписка по счёту',()=>switchTo('account',{clientName:row.name,publicId:row.publicId,clientId:'',accountId:'',currency:row.currency,date:new Date().toLocaleDateString('en-CA'),cash:[],crypto:[],transactions:[]})),button('Новая выписка по сделкам',()=>switchTo('editor',{...current('editor'),clientName:row.name,clientId:row.publicId,trades:''})),button('Изменить',()=>{editingClient=row.id;$('library-client-name').value=row.name;$('library-client-id').value=row.publicId;const select=$('library-client-currency');if(![...select.options].some(option=>option.value===row.currency))select.add(new Option(row.currency,row.currency));select.value=row.currency;$('client-form-title').textContent='Редактирование клиента';$('client-cancel').hidden=false;$('library-client-name').focus();}),button('Удалить',()=>removeRecord('clients',row.id)));
   card.append(actions);list.append(card);
  }
 }
 for(const type of core.types){
  const root=$('page-'+type),heading=root.querySelector('.editor-heading');
  const bar=document.createElement('div');bar.className='draft-toolbar';
  const input=document.createElement('input');input.id='draft-name-'+type;input.maxLength=120;input.placeholder='Название черновика';input.setAttribute('aria-label','Название черновика');input.value=library.drafts.find(row=>row.id===active(type))?.name||'';
  const status=text('span','Сохраните черновик, чтобы включить автосохранение.','hint');status.id='draft-status-'+type;
  bar.append(input,button('Сохранить черновик',()=>saveDraft(type)),button('Сохранить копию',()=>saveDraft(type,true)),status);heading.after(bar);
  root.addEventListener('input',event=>{if(!active(type))return;clearTimeout(autoTimer);status.textContent='Сохраняю…';autoTimer=setTimeout(()=>saveDraft(type,false,true),700);});
  root.addEventListener('click',event=>{if(event.target.closest('[data-account-add],[data-remove],#mail-logo-remove,[data-mail-format],#mail-footer-enabled')){clearTimeout(autoTimer);autoTimer=setTimeout(()=>saveDraft(type,false,true),700);}});
 }
 document.addEventListener('estratto:navigate',()=>{for(const type of core.types)if(active(type))saveDraft(type,false,true);render();});
 $('draft-search').addEventListener('input',renderDrafts);$('draft-filter').addEventListener('change',renderDrafts);$('client-search').addEventListener('input',renderClients);
 function render(){renderDrafts();renderClients();$('backup-summary').textContent=library.clients.length+' клиентов · '+library.drafts.length+' черновиков';}
 $('backup-download').addEventListener('click',()=>{try{flush();if(!localStorage.getItem(key)&&!write(library))return;const backup=core.capture(localStorage);const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='estratto-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('Резервная копия скачана.');}catch(_){notice('Не удалось создать резервную копию. Проверьте доступность хранилища браузера.',true);}});
 function cancelBackup(){pendingBackup=null;$('backup-review').hidden=true;}
 $('backup-file').addEventListener('change',async event=>{const file=event.target.files[0];event.target.value='';cancelBackup();if(!file)return;try{if(file.size>12000000)throw new Error('Файл — до 12 МБ.');pendingBackup=core.parseBackup(await file.text());const data=pendingBackup.storage[key];$('backup-review-text').textContent='Файл проверен: '+(data?.clients.length||0)+' клиентов, '+(data?.drafts.length||0)+' черновиков. Разделов данных: '+Object.keys(pendingBackup.storage).length+'.';$('backup-review').hidden=false;}catch(error){notice(error.message,true);}});
 $('backup-cancel').addEventListener('click',cancelBackup);
 $('backup-restore').addEventListener('click',()=>{if(!pendingBackup)return;try{clearTimeout(autoTimer);core.restore(localStorage,pendingBackup);switching=true;for(const type of core.types)setActive(type,'');location.hash='backup';location.reload();}catch(_){notice('Восстановление не выполнено. Текущие данные сохранены; возможно, хранилище заполнено.',true);}});
 window.addEventListener('beforeunload',()=>{if(switching)return;for(const type of core.types)if(active(type))saveDraft(type,false,true);});
 render();
})();
