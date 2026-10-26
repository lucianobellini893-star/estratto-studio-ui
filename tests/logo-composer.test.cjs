const {test}=require('node:test');const assert=require('node:assert/strict');const {layout}=require('../logo-composer.js');
test('horizontal parts preserve aspect ratios and center independently sized components',()=>{
 const result=layout([{width:40,height:40,scale:100},{width:160,height:40,scale:50}],'horizontal',12);
 assert.equal(result.width,312);assert.equal(result.height,100);assert.deepEqual(result.parts[1],{width:200,height:50,x:112,y:25});
});
test('vertical parts center without stretching or overlapping',()=>{
 const result=layout([{width:40,height:40,scale:100},{width:160,height:40,scale:50}],'vertical',12);
 assert.equal(result.width,200);assert.equal(result.height,162);assert.deepEqual(result.parts[0],{width:100,height:100,x:50,y:0});assert.equal(result.parts[1].y,112);
});
test('zero gap, changed order and relative scale retain stable component boundaries',()=>{
 const result=layout([{width:200,height:50,scale:100},{width:50,height:50,scale:200}],'horizontal',0);
 assert.equal(result.parts[0].x+result.parts[0].width,result.parts[1].x);assert.equal(result.parts[0].y,50);
 assert.throws(()=>layout([{width:0,height:0}]),/viewBox/);
});
