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

  function signature(state,options={}){
    if(!state.footerEnabled)return '';
    if(state.footerStyle!=='card'){
      return '<tr><td align="center" style="padding:32px 12px 0;text-align:center;font-family:'+font+';font-size:11px;line-height:20px;color:#8b8b91;">'
        +escape(state.footerLabel||'')+' <strong style="font-size:15px;font-weight:600;color:#7b7b82;">'+escape(state.footerCompany||'')+'</strong></td></tr>';
    }
    const safe=(v,n)=>escape(String(v||'').trim().slice(0,n));
    // Only explicitly validated image URLs or the photo chosen by the operator.
    const photo=options.photoSource||https(state.signaturePhotoUrl)||
      (/^data:image\/(?:jpeg|png);base64,[a-z0-9+/=]+$/i.test(state.signaturePhoto||'')?state.signaturePhoto:'');
    const name=safe(state.signatureName||'',100);
    const words=name.split(/\s+/).filter(Boolean);
    const displayName=words.length>1?words.slice(0,-1).join(' ')+' <span style="color:#c99b58;">'+words[words.length-1]+'</span>':name;
    const signatureLogo=options.signatureLogoSource||png(state.signatureLogoData);
    const logoWidth=Math.min(245,Math.max(80,Number(state.signatureLogoWidth)||175));
    const logoColumnWidth=Math.min(260,logoWidth+20);
    const job=safe(state.signatureRole||'',130);
    const company=safe(state.footerCompany||'',100);
    const phone=safe(state.signaturePhone||'',60);
    const mail=safe(state.signatureEmail||'',130);
    const address=safe(state.signatureAddress||'',200);
    const gold='#c99b58';
    const icon=(glyph)=>'<span style="color:'+gold+';font-size:13px;line-height:17px;">'+glyph+'</span>';
    const row=(sym,value,href)=>!value?'':'<tr><td valign="top" width="19" style="width:19px;padding:2px 0;font-family:Arial,sans-serif;">'+icon(sym)+'</td><td style="padding:2px 0;color:#eceef0;font-family:Arial,sans-serif;font-size:11px;line-height:16px;word-break:break-word;">'+(href?'<a href="'+escape(href)+'" style="color:#eceef0;text-decoration:none;">'+value+'</a>':value)+'</td></tr>';
    const phoneHref=phone?'tel:'+String(state.signaturePhone).replace(/[^+\d]/g,''):'';
    const emailHref=mail?'mailto:'+encodeURIComponent(String(state.signatureEmail).trim()):'';
    const socials=[
      ['in','signatureLinkedin'],['wa','signatureWhatsapp'],['tg','signatureTelegram'],['ig','signatureInstagram']
    ].filter(([,key])=>https(state[key])).map(([label,key])=>
      '<a href="'+escape(https(state[key]))+'" style="display:inline-block;box-sizing:border-box;border:1px solid #63676c;border-radius:50%;width:25px;height:25px;text-align:center;line-height:23px;font-size:9px;font-weight:600;text-decoration:none;color:#f5f5f5;margin:3px 3px 0 0;font-family:Arial,sans-serif;">'+label+'</a>').join('');
    const head=photo?'<img src="'+escape(photo)+'" width="122" height="122" alt="Profile photo" style="display:block;width:122px;height:122px;object-fit:cover;border-radius:50%;border:3px solid '+gold+';">':
      '<div style="box-sizing:border-box;width:122px;height:122px;border-radius:50%;border:2px solid '+gold+';text-align:center;line-height:116px;color:'+gold+';font-size:38px;">'+escape((state.signatureName||' ').trim().charAt(0)||'•')+'</div>';
    const identity='<table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="border-collapse:collapse;"><tr>'
      +'<td width="142" valign="middle" style="width:142px;padding:0 20px 0 0;">'+head+'</td>'
      +'<td valign="middle" style="padding:0;"><div style="font-family:Arial,sans-serif;font-weight:700;font-size:22px;line-height:27px;color:#fff;">'+displayName+'</div>'
      +'<div style="font-family:Arial,sans-serif;color:#ddd;font-size:13px;line-height:19px;margin-top:2px;">'+job+(company?'<br>'+company:'')+'</div>'
      +'<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;border-collapse:collapse;">'
      +row('☎',phone,phoneHref)+row('✉',mail,emailHref)+row('⌖',address,'')+'</table></td></tr></table>';
    const brand=signatureLogo
      ?'<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;width:100%;"><tr><td align="center" style="text-align:center;padding:0 0 12px;"><img src="'+escape(signatureLogo)+'" width="'+logoWidth+'" alt="'+(company||'Company logo')+'" style="display:block;width:'+logoWidth+'px;max-width:100%;height:auto;max-height:130px;object-fit:contain;margin:0 auto;border:0;"></td></tr></table>'
      :'<div style="border:1px dashed #666;border-radius:5px;padding:12px 4px;text-align:center;color:#aaa;font-size:11px;margin-bottom:12px;">'+(company||'YOUR LOGO')+'</div>';
    return '<tr><td style="padding:24px 0 0;">'
      +'<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#050505" style="width:100%;max-width:760px;min-height:165px;background-color:#050505;border:1px solid #252525;border-radius:12px;border-collapse:separate;overflow:hidden;">'
      +'<tr><td valign="middle" style="padding:17px;">'
      +'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr>'
      +'<td valign="middle" style="padding:0 14px 0 0;">'+identity+'</td>'
      +'<td valign="middle" align="center" width="'+logoColumnWidth+'" style="width:'+logoColumnWidth+'px;border-left:1px solid #555;padding:4px 0 4px 15px;text-align:center;">'+brand+'<div style="text-align:center;white-space:nowrap;">'+socials+'</div></td>'
      +'</tr></table></td></tr></table></td></tr>';
  }
  function build(state,options={}){
    const source=options.logoSource||https(state.logoUrl)||png(state.logoData);
    const image=source&&(/^(https:\/\/|data:image\/png;base64,|cid:estratto-logo@local$)/.test(source))?source:'';
    const size=dimensions(state);
    const title=String(state.title||'').trim();
    const body=paragraphs(state.text,state.runs)||(options.placeholder?`<p style="margin:0;font-family:${font};font-size:16px;line-height:26px;color:#999990;">Введите или вставьте текст — здесь появится оформленное письмо.</p>`:'');
    const logo=image?`<tr><td align="left" style="padding:0 0 24px;text-align:left;"><img src="${escape(image)}" alt="${escape(state.logoAlt||'Logo')}" width="${size.width}" height="${size.height}" style="display:block;width:${size.width}px;height:${size.height}px;max-width:100%;border:0;outline:none;text-decoration:none;"></td></tr>`:'';
    const heading=title?`<h1 style="margin:0 0 20px;font-family:${font};font-size:21px;line-height:30px;font-weight:600;color:#202020;">${escape(title)}</h1>`:'';
    const footer=signature(state,options);
    const signatureWidth=state.footerEnabled&&state.footerStyle==='card'?760:560;
    const fragment=`<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f4f4f5" style="width:100%;background-color:#f4f4f5;border-collapse:collapse;margin:0;"><tr><td align="center" class="mail-outer-padding" style="padding:40px 24px 56px;">
<!--[if mso]><table role="presentation" width="${signatureWidth}" border="0" cellspacing="0" cellpadding="0"><tr><td><![endif]-->
<table role="presentation" width="${signatureWidth}" border="0" cellspacing="0" cellpadding="0" style="width:100%;max-width:${signatureWidth}px;border-collapse:separate;">${logo}<tr><td class="mail-content-padding" align="left" bgcolor="#ffffff" style="padding:32px;background-color:#ffffff;border:1px solid #e7e7ed;border-radius:12px;text-align:left;word-wrap:break-word;">${heading}${body}</td></tr>${footer}</table>
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
    const footerLogo=png(state.signatureLogoData),embeddedFooter=Boolean(footerLogo)&&state.footerEnabled&&state.footerStyle==='card';
    const photo=String(state.signaturePhoto||'');
    const embeddedPhoto=state.footerEnabled&&state.footerStyle==='card'&&/^data:image\/(?:jpeg|png);base64,[a-z0-9+/=]+$/i.test(photo);
    const built=build(state,{...options,logoSource:embedded?'cid:estratto-logo@local':undefined,photoSource:embeddedPhoto?'cid:estratto-photo@local':undefined,signatureLogoSource:embeddedFooter?'cid:estratto-signature-logo@local':undefined});
    const lines=['MIME-Version: 1.0','X-Unsent: 1','Subject: '+subject(state.title),`Content-Type: multipart/related; boundary="${outer}"`,'',`--${outer}`,`Content-Type: multipart/alternative; boundary="${inner}"`,'',`--${inner}`,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',wrap(base64(built.plainText)),`--${inner}`,'Content-Type: text/html; charset=UTF-8','Content-Transfer-Encoding: base64','',wrap(base64(built.html)),`--${inner}--`];
    if(embedded)lines.push(`--${outer}`,'Content-Type: image/png; name="logo.png"','Content-Transfer-Encoding: base64','Content-ID: <estratto-logo@local>','Content-Disposition: inline; filename="logo.png"','',wrap(data.split(',')[1]));
    if(embeddedPhoto){const mime=photo.startsWith('data:image/png;')?'image/png':'image/jpeg';lines.push(`--${outer}`,'Content-Type: '+mime+'; name="portrait"','Content-Transfer-Encoding: base64','Content-ID: <estratto-photo@local>','Content-Disposition: inline; filename="portrait"','',wrap(photo.split(',')[1]));}
    if(embeddedFooter)lines.push(`--${outer}`,'Content-Type: image/png; name="signature-logo.png"','Content-Transfer-Encoding: base64','Content-ID: <estratto-signature-logo@local>','Content-Disposition: inline; filename="signature-logo.png"','',wrap(footerLogo.split(',')[1]));
    lines.push(`--${outer}--`,'');return lines.join('\r\n');
  }
  return {escape,https,png,validate,paragraphs,dimensions,build,eml};
});
