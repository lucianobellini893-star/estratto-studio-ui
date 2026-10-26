const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../account-core.js');
const asset=(changes={})=>({asset:'Euro',symbol:'EUR',wallet:'Spot',quantity:'2.0000',price:'1.1470',...changes});
const state=(changes={})=>({clientName:'Test Client',clientId:'TEST PUBLIC ID',accountId:'TEST ACCOUNT',date:'2026-10-26',currency:'USD',cash:[asset()],crypto:[],transactions:[],...changes});
test('cash and crypto reproduce four-decimal account balance without summing transactions twice',()=>{
 const result=core.validate(state({crypto:[asset({asset:'Ethereum',symbol:'ETH',quantity:'0.0478964200',price:'1,912.3129'})],transactions:[{date:'2026-10-01',type:'deposit',amount:'100',currency:'USD',reference:'T1'}]}));
 assert.deepEqual(result.errors,[]);assert.equal(result.cashTotal,22940n);assert.equal(result.cryptoTotal,915929n);assert.equal(result.total,938869n);assert.equal(core.money(result.total),'93,8869');
 assert.equal(result.crypto[0].quantity,'0.0478964200');
});
test('calculations use exact decimals, including half-cent rounding at four decimals',()=>{
 assert.equal(core.productMoney(core.decimal('0.1'),core.decimal('0.2')),200n);
 assert.equal(core.toMoney(core.decimal('1.23445')),12345n);
 assert.equal(core.toMoney(core.decimal('-1.23445')),-12345n);
 assert.equal(core.money(-10000n,true),'−1,0000');
});
test('decimal comma, European grouping and negative sign are accepted',()=>{
 assert.equal(core.toMoney(core.decimal('1.234,5678')),12345678n);
 assert.equal(core.toMoney(core.decimal('−12,50')),-125000n);
 assert.equal(core.toMoney(core.decimal('0.001')),10n);
});
test('malformed, non-finite and overprecision values block export',()=>{
 for(const value of ['','Infinity','1e6','20 USD','1,2,3','0.12345678901','1,23.45','1.23,45'])assert.throws(()=>core.decimal(value));
 const result=core.validate(state({cash:[asset({quantity:'bad'})]}));assert.ok(result.errors.some(e=>e.includes('Количество')));
});
test('invalid dates and future transactions are rejected',()=>{
 assert.equal(core.validDate('2026-02-30'),false);assert.equal(core.validDate('2024-02-29'),true);
 const result=core.validate(state({transactions:[{date:'2026-10-27',type:'deposit',amount:'1',currency:'USD'}]}));
 assert.ok(result.errors.some(e=>e.includes('позже')));
});
test('debit and credit signs are checked instead of silently changing user data',()=>{
 for(const [type,amount] of [['deposit','-2'],['withdrawal','2'],['fee','2']]){
  assert.ok(core.validate(state({transactions:[{date:'2026-10-01',type,amount,currency:'USD'}]})).errors.length);
 }
});
test('multiple currencies are retained and do not affect portfolio balance',()=>{
 const transactions=[{date:'2026-10-01',type:'deposit',amount:'100',currency:'EUR',reference:'T1'},{date:'2026-10-02',type:'fee',amount:'-2',currency:'USD',reference:'T2'}];
 const result=core.validate(state({transactions}));assert.deepEqual(result.errors,[]);assert.equal(result.total,22940n);assert.equal(result.transactions[0].currency,'EUR');
});
test('duplicate references are rejected',()=>{
 const row={date:'2026-10-01',type:'deposit',amount:'1',currency:'USD',reference:'DUP'};
 assert.ok(core.validate(state({transactions:[row,{...row}]})).errors.some(e=>e.includes('уже используется')));
});
test('empty account cannot become a zero balance by accident; explicitly entered zero is valid',()=>{
 assert.ok(core.validate(state({cash:[]})).errors.length);
 const result=core.validate(state({cash:[asset({quantity:'0'})]}));assert.deepEqual(result.errors,[]);assert.equal(result.total,0n);
});
test('empty form preview does not invent zero account balances',()=>{
 const result=core.preview(state({clientName:'',clientId:'',accountId:'',cash:[]}));
 assert.equal(result.draft,true);assert.equal(result.total,null);assert.equal(result.cashTotal,null);assert.equal(result.cryptoTotal,null);assert.ok(result.errors.length);
});
test('invalid numeric input remains unknown in a draft instead of being silently dropped',()=>{
 const result=core.preview(state({cash:[asset(),asset({quantity:'invalid'})]}));
 assert.equal(result.draft,true);assert.equal(result.cash.length,2);assert.equal(result.cash[1].quantity,'—');assert.equal(result.cash[1].value,null);assert.equal(result.total,null);
});
test('completed form produces a final model instead of a draft',()=>{
 const result=core.preview(state());assert.equal(result.draft,false);assert.deepEqual(result.errors,[]);assert.equal(result.total,22940n);
});
test('account statements do not require or retain the trade public ID',()=>{
 const result=core.validate(state({clientId:''}));assert.deepEqual(result.errors,[]);assert.equal(result.clientId,'');
 const stored=core.validate(state({clientId:'OLD PUBLIC ID'}));assert.equal(stored.clientId,'');
});
test('validation identifies every missing asset field for inline highlighting',()=>{
 const result=core.validate(state({cash:[asset({asset:'',symbol:'',wallet:'',quantity:'',price:''})]}));
 for(const field of ['asset','symbol','wallet','quantity','price'])assert.ok(result.issues.some(issue=>issue.path===`cash.0.${field}`),field);
 assert.ok(!result.issues.some(issue=>issue.path==='clientId'));
});
test('validation identifies the precise invalid transaction field and both duplicate reference fields',()=>{
 const row={date:'2026-10-01',type:'withdrawal',amount:'-2',currency:'USD',reference:'DUP'};
 const result=core.validate(state({transactions:[row,{...row,amount:'2'}]}));
 for(const path of ['transactions.1.amount','transactions.0.reference','transactions.1.reference'])assert.ok(result.issues.some(issue=>issue.path===path),path);
});
