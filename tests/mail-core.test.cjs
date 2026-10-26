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
test('selected text formatting exports only allowed inline styles and escaped content',()=>{
 const output=mail.build({text:'Gentile Mario <Rossi>',runs:[{text:'Gentile '},{text:'Mario <Rossi>',bold:true,italic:true,underline:true,color:'#3159ed',html:'<script>bad</script>'}]});
 assert.match(output.html,/<strong style="font-weight:600;">Mario &lt;Rossi&gt;<\/strong>/);
 assert.match(output.html,/color:#3159ed/);assert.match(output.html,/<em>/);assert.match(output.html,/<u>/);assert.doesNotMatch(output.html,/<script/);
 const invalid=mail.build({text:'Test',runs:[{text:'Test',color:'red; background:url(x)'}]});assert.doesNotMatch(invalid.html,/background:url/);
 const stale=mail.build({text:'Updated',runs:[{text:'Old',bold:true}]});assert.match(stale.html,/Updated/);assert.doesNotMatch(stale.html,/>Old</);
});
test('editable company footer is optional, escaped and included in plain text',()=>{
 const state={text:'Test',footerEnabled:true,footerLabel:'Powered by',footerCompany:'Studio <Example>'};
 const built=mail.build(state);assert.match(built.html,/Studio &lt;Example&gt;/);assert.match(built.plainText,/Powered by Studio <Example>/);
 assert.doesNotMatch(mail.build({...state,footerEnabled:false}).html,/Powered by|Studio &lt;Example&gt;/);
});
