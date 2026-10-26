const {test}=require('node:test');
const assert=require('node:assert/strict');
const mail=require('../mail-core.js');
test('plain pasted text preserves paragraphs and escapes executable markup',()=>{
 const output=mail.build({title:'Titolo <x>',text:'Gentile cliente,\r\n\r\n<script>alert(1)</script>\n<button>Test</button>'});
 assert.match(output.html,/&lt;script&gt;/);assert.match(output.html,/&lt;button&gt;/);assert.doesNotMatch(output.html,/<(?:script|button|form|a)\b/i);assert.match(output.html,/<br>/);assert.equal((output.html.match(/<p /g)||[]).length,2);
});
test('email uses gray gutters, white text card and left aligned proportional logo',()=>{
 const output=mail.build({text:'Test',logoUrl:'https://example.com/logo.png',logoRatio:5,logoHeight:64});
 assert.match(output.html,/bgcolor="#f4f4f5"/);assert.match(output.html,/bgcolor="#ffffff"/);assert.match(output.html,/align="left"/);assert.match(output.html,/width="240" height="48"/);assert.doesNotMatch(output.html,/Powered by|unsubscribe|<button/i);
});
test('invalid logo URLs are rejected and localhost fonts stay out of exported email',()=>{
 assert.equal(mail.validate({text:'Test',logoUrl:'javascript:alert(1)'})[0].field,'mail-logo-url');
 assert.equal(mail.validate({text:' '})[0].field,'mail-text');
 assert.doesNotMatch(mail.build({text:'Test'},{fontBase:'http://127.0.0.1:8000/fonts/'}).html,/127\.0\.0\.1/);
 assert.match(mail.build({text:'Test'},{fontBase:'https://example.com/fonts/'}).html,/Inter-Regular.ttf/);
});
test('eml carries UTF8 text and an attached PNG referenced by CID',()=>{
 const eml=mail.eml({title:'Comunicazione — Клиент',text:'Gentile cliente, è pronto.',logoData:'data:image/png;base64,aGVsbG8='},{token:'test'});
 assert.match(eml,/Content-ID: <estratto-logo@local>/);assert.match(eml,/multipart\/alternative/);
 const html=eml.split('Content-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n')[1].split('\r\n--')[0];
 assert.match(Buffer.from(html,'base64').toString('utf8'),/cid:estratto-logo@local/);
 assert.doesNotMatch(eml,/^To:|^From:/m);
});
