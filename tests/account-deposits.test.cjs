const {test}=require('node:test');
const assert=require('node:assert/strict');
const deposits=require('../account-deposits.js');
const headings=['ID','Dest currency','Dest amount','Order method','Payment Requisites','Order status','Trading users','Brand','Created','Last note'].join('\n');
const record=(id,amount='1000',status='Approved',client='TEST CLIENT',currency='Euro',created='2026-07-29 11:52:15')=>[id,'sd',currency,amount,'Bank account',status,client,'test-brand',created].join('\n');
test('vertical CRM copy with empty optional cells and sd marker yields three deposits totalling 6000 EUR',()=>{
 const result=deposits.parse(headings+'\n'+[record('100001'),record('100002','4000'),record('100003')].join('\n'));
 assert.equal(result.transactions.length,3);assert.equal(result.totals[0].amount,60000000n);assert.equal(result.totals[0].currency,'EUR');
 assert.equal(result.clientName,'TEST CLIENT');assert.equal(result.transactions[0].reference,'100001');assert.equal(result.transactions[0].description,'Bonifico bancario');
});
test('tab-delimited CRM copy retains missing optional columns without shifting the client or date',()=>{
 const text='ID\tDest currency\tDest amount\tOrder method\tPayment Requisites\tOrder status\tTrading users\tBrand\tCreated\tLast note\n100001\tEuro\t1000\tBank account\t\tApproved\tTEST CLIENT\ttest-brand\t2026-07-29 11:52:15\t';
 const result=deposits.parse(text);assert.equal(result.transactions[0].sourceClient,'TEST CLIENT');assert.equal(result.transactions[0].date,'2026-07-29');
});
test('pending and rejected records keep their statuses and are excluded from posted totals',()=>{
 const result=deposits.parse([record('100001'),record('100002','4000','Pending'),record('100003','1000','Rejected')].join('\n'));
 assert.equal(result.transactions.length,3);assert.equal(result.statusCounts.pending,1);assert.equal(result.statusCounts.rejected,1);assert.equal(result.totals[0].amount,10000000n);
});
test('repeated source IDs are deduplicated and conflicting source duplicates are rejected',()=>{
 assert.equal(deposits.parse(record('100001')+'\n'+record('100001','1000.00')).transactions.length,1);
 assert.throws(()=>deposits.parse(record('100001')+'\n'+record('100001','4000')),/разными данными/);
});
test('malformed rows cannot be silently dropped from a mixed valid report',()=>{
 assert.throws(()=>deposits.parse(record('100001')+'\n'+record('100002','bad')),/сумма/);
 assert.throws(()=>deposits.parse(record('100001')+'\n'+record('100002','1000','Approved','TEST CLIENT','Unknown currency')),/неизвестная валюта/);
 assert.throws(()=>deposits.parse(record('100001')+'\n'+record('100002','1000','Unknown status')),/статус/);
});
test('multiple clients, invalid dates and negative deposits are rejected',()=>{
 assert.throws(()=>deposits.parse(record('100001')+'\n'+record('100002','1000','Approved','ANOTHER CLIENT')),/несколько клиентов/);
 assert.throws(()=>deposits.parse(record('100001','-10')),/положительной/);
 assert.throws(()=>deposits.parse(record('100001','1000','Approved','TEST CLIENT','Euro','2026-02-30 11:52:15')),/дата/);
});
test('reimport is idempotent and an edited reference still uses the original source ID',()=>{
 const rows=deposits.parse(record('100001')+'\n'+record('100002')).transactions;
 const existing=[{...rows[0],reference:'MANUALLY-EDITED'}];
 const first=deposits.merge(existing,rows);assert.equal(first.added,1);assert.equal(first.skipped,1);
 const again=deposits.merge(first.transactions,rows);assert.equal(again.added,0);assert.equal(again.transactions.length,2);
 assert.throws(()=>deposits.merge([{...rows[0],amount:'999'}],rows),/другой датой/);
});
test('different currencies remain separate in import totals',()=>{
 const result=deposits.parse(record('100001')+'\n'+record('100002','500','Approved','TEST CLIENT','USD'));
 assert.equal(result.totals.length,2);assert.equal(result.transactions[1].currency,'USD');
});
const withdrawRecord=(id,amount,status)=>[id,'sd','Euro',amount,'Bank account','Bank address: Sample address','View all',status,'TEST CLIENT','test-brand','2026-07-23 16:37:47'].join('\n');
test('withdrawal report keeps five requests and separates one completed, two pending and two failed',()=>{
 const text=['ID','Dest currency','Dest amount','Network','Order method','Payment Requisites','Order status','Trading users','Brand','Created','Last note',withdrawRecord('200001','13636','Pending approve'),withdrawRecord('200002','13636','Pending approve'),withdrawRecord('200003','618.5','Failed'),withdrawRecord('200004','618.5','Failed'),withdrawRecord('200005','170','Approved')].join('\n');
 const result=deposits.parse(text,{type:'withdrawal'});
 assert.equal(result.transactions.length,5);assert.equal(result.statusCounts.approved,1);assert.equal(result.statusCounts.pending,2);assert.equal(result.statusCounts.failed,2);
 assert.equal(result.totals[0].amount,1700000n);assert.equal(result.transactions[0].amount,'-13636');
 assert.equal(result.transactions[0].description,'Bonifico bancario');assert.ok(result.transactions.every(row=>row.type==='withdrawal'));
 assert.ok(!JSON.stringify(result.transactions).includes('Sample address'));
});
test('notes and payment requisites never enter the imported transaction',()=>{
 const result=deposits.parse(withdrawRecord('200001','170','Approved')+'\nA note that must not be printed',{type:'withdrawal'});
 assert.ok(!JSON.stringify(result.transactions).includes('note that'));
 assert.equal(result.transactions[0].note,undefined);
});
test('Network may be present without replacing the payment method',()=>{
 const text=withdrawRecord('200001','170','Approved').replace('170\nBank account','170\nEthereum\nBank account');
 const result=deposits.parse(text,{type:'withdrawal'});assert.equal(result.transactions[0].description,'Bonifico bancario');
});
test('a changed status updates the existing imported request without dropping other history',()=>{
 const pending=deposits.parse(withdrawRecord('200001','170','Pending approve'),{type:'withdrawal'}).transactions;
 const approved=deposits.parse(withdrawRecord('200001','170','Approved'),{type:'withdrawal'}).transactions;
 const other={date:'2026-07-01',type:'fee',amount:'-1',currency:'EUR',reference:'MANUAL'};
 const result=deposits.merge([...pending,other],approved);
 assert.equal(result.added,0);assert.equal(result.updated,1);assert.equal(result.transactions.length,2);
 assert.equal(result.transactions[0].status,'approved');assert.deepEqual(result.transactions[1],other);
});
