const {test}=require('node:test');const assert=require('node:assert/strict');const core=require('../workspace-core.js');
const memory=()=>{const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};};
const library=()=>({version:1,clients:[{id:'client',name:'Test',publicId:'ABC',currency:'EUR'}],drafts:[{id:'draft',name:'My draft',type:'mail',data:{text:'Gentile cliente',runs:[{text:'Gentile cliente',bold:true}]}}]});
test('backup round trip keeps named drafts, client records and multipart logos and excludes unrelated storage',()=>{
 const source=memory();source.setItem('estratto-library.v1',JSON.stringify(library()));source.setItem('estratto-mail.v1',JSON.stringify({text:'Test',parts:[{svg:'<svg/>',scale:100}]}));source.setItem('unrelated','private');
 const backup=core.parseBackup(JSON.stringify(core.capture(source)));assert.equal(backup.storage.unrelated,undefined);
 const target=memory();target.setItem('unrelated','keep');core.restore(target,backup);
 assert.deepEqual(JSON.parse(target.getItem('estratto-library.v1')),library());assert.equal(target.getItem('unrelated'),'keep');
});
test('invalid backups and prototype keys are rejected before storage changes',()=>{
 for(const text of ['{}','not-json','{"format":"estratto-studio-backup","version":1,"storage":{"evil":{}}}','{"format":"estratto-studio-backup","version":1,"storage":{"estratto-mail.v1":{"__proto__":{}}}}'])assert.throws(()=>core.parseBackup(text));
 const storage=memory();storage.setItem(core.keys[0],'{}');assert.throws(()=>core.restore(storage,{format:'wrong'}));assert.equal(storage.getItem(core.keys[0]),'{}');
});
test('restoring missing sections clears only app keys and rolls back if storage rejects a write',()=>{
 const storage=memory();storage.setItem(core.keys[0],'{"clientName":"Old"}');storage.setItem(core.keys[1],'{}');
 const original=storage.setItem;storage.setItem=(key,value)=>{if(value.includes('REJECT'))throw new Error('quota');return original(key,value);};
 assert.throws(()=>core.restore(storage,{format:'estratto-studio-backup',version:1,storage:{[core.keys[0]]:{clientName:'REJECT'}}}));
 assert.equal(storage.getItem(core.keys[0]),'{"clientName":"Old"}');assert.equal(storage.getItem(core.keys[1]),'{}');
 core.restore(storage,{format:'estratto-studio-backup',version:1,storage:{[core.keys[2]]:{text:'Test'}}});assert.equal(storage.getItem(core.keys[0]),null);
});
