/* Portable local workspace data. No network or account service. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EstrattoWorkspace=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const keys=['estratto-operazioni.v1','estratto-conto.v1','estratto-mail.v1','estratto-library.v1'];
 const types=['editor','account','mail'];
 function check(value,depth=0){
  if(depth>30)throw new Error('Слишком сложная структура файла.');
  if(value&&typeof value==='object')for(const key of Object.keys(value)){
   if(['__proto__','prototype','constructor'].includes(key))throw new Error('Недопустимое поле в файле.');
   check(value[key],depth+1);
  }
 }
 function object(value){return value&&typeof value==='object'&&!Array.isArray(value);}
 function documentData(type,data){
  if(!object(data))throw new Error('Повреждены данные документа.');
  const fields=type==='account'?['clientName','clientId','accountId','publicId','date','currency']:type==='mail'?['title','text','logoUrl','footerLabel','footerCompany','layout']:['clientName','clientId','trades','coName','coAddr','coSite','discA','discC','logoSvg','mode','from','to'];
  for(const field of fields)if(data[field]!==undefined&&typeof data[field]!=='string')throw new Error('Неверный тип поля документа: '+field);
  const arrays=type==='account'?['cash','crypto','transactions']:type==='mail'?['parts','runs']:['logoParts'];
  for(const field of arrays)if(data[field]!==undefined){
   if(!Array.isArray(data[field])||data[field].some(row=>!object(row)))throw new Error('Повреждены строки документа.');
   if(type==='account')for(const row of data[field])if(Object.values(row).some(value=>typeof value!=='string'))throw new Error('Неверный формат строки выписки.');
  }
 }
 function library(value){
  if(!object(value)||value.version!==1||!Array.isArray(value.clients)||!Array.isArray(value.drafts))throw new Error('Неверный формат библиотеки.');
  if(value.clients.length>2000||value.drafts.length>1000)throw new Error('Слишком много записей.');
  for(const client of value.clients)if(!object(client)||typeof client.id!=='string'||typeof client.name!=='string'||!client.name.trim()||typeof client.publicId!=='string'||!(/^[A-Z]{3}$/.test(client.currency)))throw new Error('Некорректная карточка клиента.');
  for(const draft of value.drafts)if(!object(draft)||typeof draft.id!=='string'||!types.includes(draft.type)||typeof draft.name!=='string'||!object(draft.data))throw new Error('Некорректный черновик.');
  for(const draft of value.drafts){documentData(draft.type,draft.data);if(draft.profile!==undefined)documentData('editor',draft.profile);}
  for(const field of ['history','templates'])if(value[field]!==undefined){
   if(!Array.isArray(value[field])||value[field].length>1000)throw new Error('Некорректный раздел '+field);
   for(const row of value[field]){
    if(!object(row)||typeof row.id!=='string'||typeof row.name!=='string')throw new Error('Некорректная запись '+field);
    const type=field==='templates'?'mail':row.type;if(!types.includes(type))throw new Error('Неверный тип документа');documentData(type,row.data);
    if(row.profile!==undefined)documentData('editor',row.profile);
   }
   if(new Set(value[field].map(row=>row.id)).size!==value[field].length)throw new Error('Повторяющиеся ID');
  }
  for(const collection of [value.clients,value.drafts])if(new Set(collection.map(row=>row.id)).size!==collection.length)throw new Error('Повторяющиеся ID в библиотеке.');
  return value;
 }
 const variables=['client_name','company','amount','date'];
 function applyTemplate(data,values){
  const used=new Set();const replace=text=>String(text||'').replace(/{{\s*([^{}]+?)\s*}}/g,(all,key)=>{used.add(key);if(!variables.includes(key))throw new Error('Неизвестная подстановка: '+key);if(!String(values[key]||'').trim())throw new Error('Заполните подстановку: '+key);return String(values[key]);});
  const result={...data,title:replace(data.title),text:replace(data.text)};
  if(Array.isArray(data.runs)&&data.runs.map(run=>run.text||'').join('')===data.text){
   // Replace against the full text so tokens may span differently formatted runs.
   const runs=[];const text=String(data.text||'');let position=0;
   const source=data.runs.map(run=>{const start=position;position+=String(run.text||'').length;return {...run,start,end:position};});
   const append=(start,end)=>{for(const run of source){const a=Math.max(start,run.start),b=Math.min(end,run.end);if(b>a){const {start:_,end:__,...format}=run;runs.push({...format,text:text.slice(a,b)});}}};
   let cursor=0;for(const match of text.matchAll(/{{\s*([^{}]+?)\s*}}/g)){append(cursor,match.index);const format=source.find(run=>run.end>match.index)||{};const {start:_,end:__,...style}=format;runs.push({...style,text:replace(match[0])});cursor=match.index+match[0].length;}append(cursor,text.length);result.runs=runs;
  }else delete result.runs;
  return result;
 }
 function parseBackup(text){
  if(typeof text!=='string'||text.length>12000000)throw new Error('Файл резервной копии — до 12 МБ.');
  let value;try{value=JSON.parse(text);}catch(_){throw new Error('Не удалось прочитать JSON-файл.');}
  check(value);
  if(!object(value)||value.format!=='estratto-studio-backup'||value.version!==1||!object(value.storage))throw new Error('Это не резервная копия Estratto Studio.');
  const entries=Object.entries(value.storage);
  if(!entries.length||entries.some(([key])=>!keys.includes(key)))throw new Error('Недопустимые разделы резервной копии.');
  for(const [key,data] of entries){
   if(!object(data))throw new Error('Повреждён раздел резервной копии.');
   if(key==='estratto-library.v1')library(data);
   else documentData(key===keys[0]?'editor':key===keys[1]?'account':'mail',data);
   if(key==='estratto-conto.v1')for(const field of ['cash','crypto','transactions'])if(data[field]!==undefined&&!Array.isArray(data[field]))throw new Error('Повреждены строки выписки.');
   if(key==='estratto-mail.v1'&&data.parts!==undefined&&!Array.isArray(data.parts))throw new Error('Повреждён логотип письма.');
  }
  return value;
 }
 function capture(storage){
  const values={};for(const key of keys){const raw=storage.getItem(key);if(raw!==null)values[key]=JSON.parse(raw);}
  return {format:'estratto-studio-backup',version:1,createdAt:new Date().toISOString(),storage:values};
 }
 function restore(storage,backup){
  const valid=parseBackup(JSON.stringify(backup));const before=new Map(keys.map(key=>[key,storage.getItem(key)]));
  try{for(const key of keys)storage.removeItem(key);for(const [key,value] of Object.entries(valid.storage))storage.setItem(key,JSON.stringify(value));}
  catch(error){for(const key of keys)storage.removeItem(key);for(const [key,value] of before)if(value!==null)storage.setItem(key,value);throw error;}
 }
 return {variables,applyTemplate,keys,types,library,parseBackup,capture,restore};
});
