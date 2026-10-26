/* Text-only email design: table layout and inline styles for mail clients. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EstrattoMail=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const font="Inter,Arial,Helvetica,sans-serif";
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function https(value){
    const text=String(value||'').trim();if(!text)return '';
    try{const url=new URL(text);return url.protocol==='https:'&&!url.username&&!url.password?url.href:'';}catch(_){return '';}
  }
  function png(value){return /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(String(value||''))?value:'';}
  function validate(state){
    const issues=[];
    if(!String(state.text||'').trim())issues.push({field:'mail-text',message:'Введите текст письма.'});
    if(String(state.text||'').length>60000)issues.push({field:'mail-text',message:'Текст письма — до 60 000 символов.'});
    if(String(state.title||'').length>200)issues.push({field:'mail-title',message:'Заголовок — до 200 символов.'});
    if(String(state.logoUrl||'').trim()&&!https(state.logoUrl))issues.push({field:'mail-logo-url',message:'Укажите полную HTTPS-ссылку на изображение.'});
    return issues;
  }
  function paragraphs(value,runs){
    if(Array.isArray(runs)&&runs.length<=10000&&runs.map(run=>String(run.text||'')).join('')===String(value||'')){
      const content=runs.map(run=>{
        let text=escape(run.text).replace(/\n/g,'<br>');
        if(run.bold)text='<strong style="font-weight:600;">'+text+'</strong>';
        if(run.italic)text='<em>'+text+'</em>';
        if(run.underline)text='<u>'+text+'</u>';
        if(/^#[a-f0-9]{6}$/i.test(run.color||''))text='<span style="color:'+run.color+';">'+text+'</span>';
        return text;
      }).join('');
      return String(value||'').trim()?`<p style="margin:0;font-family:${font};font-size:16px;line-height:26px;color:#292929;overflow-wrap:break-word;">${content}</p>`:'';
    }
    return String(value||'').replace(/\r\n?/g,'\n').trim().split(/\n[ \t]*\n+/).filter(Boolean).map(text=>`<p style="margin:0 0 16px;font-family:${font};font-size:16px;line-height:26px;color:#292929;overflow-wrap:break-word;">${escape(text).replace(/\n/g,'<br>')}</p>`).join('\n');
  }
  function dimensions(state){
    const ratio=Number(state.logoRatio)>0?Number(state.logoRatio):4;
    const wanted=Math.min(64,Math.max(20,Number(state.logoHeight)||32));
    const width=Math.max(1,Math.min(240,Math.round(wanted*ratio)));
    return {width,height:Math.max(1,Math.round(width/ratio))};
  }
  function build(state,options={}){
    const source=options.logoSource||https(state.logoUrl)||png(state.logoData);
    const image=source&&(/^(https:\/\/|data:image\/png;base64,|cid:estratto-logo@local$)/.test(source))?source:'';
    const size=dimensions(state);
    const title=String(state.title||'').trim();
    const body=paragraphs(state.text,state.runs)||(options.placeholder?`<p style="margin:0;font-family:${font};font-size:16px;line-height:26px;color:#999990;">Введите или вставьте текст — здесь появится оформленное письмо.</p>`:'');
    const logo=image?`<tr><td align="left" style="padding:0 0 24px;text-align:left;"><img src="${escape(image)}" alt="${escape(state.logoAlt||'Logo')}" width="${size.width}" height="${size.height}" style="display:block;width:${size.width}px;height:${size.height}px;max-width:100%;border:0;outline:none;text-decoration:none;"></td></tr>`:'';
    const heading=title?`<h1 style="margin:0 0 20px;font-family:${font};font-size:21px;line-height:30px;font-weight:600;color:#202020;">${escape(title)}</h1>`:'';
    const footer=state.footerEnabled?`<tr><td align="center" style="padding:32px 12px 0;text-align:center;font-family:${font};font-size:11px;line-height:20px;color:#8b8b91;">${escape(state.footerLabel||'')} <strong style="font-family:${font};font-size:15px;font-weight:600;color:#7b7b82;">${escape(state.footerCompany||'')}</strong></td></tr>`:'';
    const fragment=`<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f4f4f5" style="width:100%;background-color:#f4f4f5;border-collapse:collapse;margin:0;"><tr><td align="center" class="mail-outer-padding" style="padding:40px 24px 56px;">
<!--[if mso]><table role="presentation" width="560" border="0" cellspacing="0" cellpadding="0"><tr><td><![endif]-->
<table role="presentation" width="560" border="0" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;border-collapse:separate;">${logo}<tr><td class="mail-content-padding" align="left" bgcolor="#ffffff" style="padding:32px;background-color:#ffffff;border:1px solid #e7e7ed;border-radius:12px;text-align:left;word-wrap:break-word;">${heading}${body}</td></tr>${footer}</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>`;
    let base=https(options.fontBase);
    if(!base&&options.preview){
      try{const url=new URL(options.fontBase);if(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname))base=url.href;}catch(_){}
    }
    const faces=base?`@font-face{font-family:Inter;font-style:normal;font-weight:400;src:url('${escape(base)}Inter-Regular.ttf') format('truetype')}@font-face{font-family:Inter;font-style:normal;font-weight:600;src:url('${escape(base)}Inter-SemiBold.ttf') format('truetype')}`:'';
    const html=`<!doctype html>\n<html lang="${/^[a-z]{2}(?:-[A-Z]{2})?$/.test(state.language||'')?state.language:'it'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>${escape(title||'Messaggio')}</title><style>${faces}html,body{margin:0!important;padding:0!important;width:100%!important}table{mso-table-lspace:0pt;mso-table-rspace:0pt}img{-ms-interpolation-mode:bicubic}@media(max-width:600px){.mail-outer-padding{padding:24px 12px 32px!important}.mail-content-padding{padding:24px!important}}</style></head><body style="margin:0;padding:0;background-color:#f4f4f5;font-family:${font};">${fragment}</body></html>`;
    return {html,fragment,plainText:[title,String(state.text||'').trim(),state.footerEnabled?[state.footerLabel,state.footerCompany].filter(Boolean).join(' '):''].filter(Boolean).join('\n\n')};
  }
  function base64(text){
    if(typeof Buffer!=='undefined')return Buffer.from(text,'utf8').toString('base64');
    const bytes=new TextEncoder().encode(text);let binary='';
    for(let index=0;index<bytes.length;index+=0x8000)binary+=String.fromCharCode(...bytes.subarray(index,index+0x8000));
    return btoa(binary);
  }
  const wrap=value=>value.match(/.{1,76}/g)?.join('\r\n')||'';
  function subject(value){
    const chunks=[];let chunk='';
    for(const character of String(value||'Messaggio').replace(/[\r\n]/g,' ')){
      if(new TextEncoder().encode(chunk+character).length>42){chunks.push(chunk);chunk='';}chunk+=character;
    }
    if(chunk)chunks.push(chunk);
    return chunks.map(part=>'=?UTF-8?B?'+base64(part)+'?=').join('\r\n ');
  }
  function eml(state,options={}){
    const token=String(options.token||Date.now().toString(36)).replace(/[^a-z0-9]/gi,'').slice(0,40)||'message';
    const outer='estratto-related-'+token,inner='estratto-alternative-'+token;
    const data=png(state.logoData),embedded=Boolean(data);
    const built=build(state,{...options,logoSource:embedded?'cid:estratto-logo@local':undefined});
    const lines=['MIME-Version: 1.0','X-Unsent: 1','Subject: '+subject(state.title),`Content-Type: multipart/related; boundary="${outer}"`,'',`--${outer}`,`Content-Type: multipart/alternative; boundary="${inner}"`,'',`--${inner}`,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',wrap(base64(built.plainText)),`--${inner}`,'Content-Type: text/html; charset=UTF-8','Content-Transfer-Encoding: base64','',wrap(base64(built.html)),`--${inner}--`];
    if(embedded)lines.push(`--${outer}`,'Content-Type: image/png; name="logo.png"','Content-Transfer-Encoding: base64','Content-ID: <estratto-logo@local>','Content-Disposition: inline; filename="logo.png"','',wrap(data.split(',')[1]));
    lines.push(`--${outer}--`,'');return lines.join('\r\n');
  }
  return {escape,https,png,validate,paragraphs,dimensions,build,eml};
});
