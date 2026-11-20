/* Text-only email design: table layout and inline styles for mail clients. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EstrattoMail=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const font="Inter,Arial,Helvetica,sans-serif";
  // Contact lines in the signature card: a clearer face than Arial where the client has one, Arial elsewhere.
  const contactFont="Inter,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
  // Gold line icons (phone / email / pin) as 48×48 PNG, shown at 16×16. PNG because mail clients ignore inline SVG.
  const ICONS={phone:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAI/UlEQVR4AexZC4xU5RU+587u8lKwUqSKJcijPlKkVndnSjRSa0oiFKnAziDWsrAzFNJoizGNtbXYpo9gANsGgZllXSrszrAsVlL6sA9qUurMIBBNH/gOUUh99EFbYGF37ul37sx/5+48F3YbYrKT+/3n/Oec//z/+d/3jkUf8N9QABd6AIdGYGgEBtgDA5pCbz65dPiBltANqZbQ3clo8JFUNLgO2AxsB56G7NcK5QGVqW5dMhb6ZirWuDgdXfSJAbafzimAF7YsmpiOBlclY8GuVCz4xru93adtoUMktIOZHyXm1cAKYAkwn5lvVygPqEx1q5no20RWu7DvcCoWEuB1x2c09KVk7K4rzyWofgWA3ludjIZeyVi+o8K8kYnvIuKraPB+kx2fTJuY6t5C5xxJx0L39ce9VckoGW1cgIa/id5bx0zTCm1F6F0iSYpIF4msFbG/DnofCzWBX4gyGAG63eEhUx14tYGtdKF8CuXfK/RLxFcL0Q91ZFItjfOpwq9sAOloYyOztQuNmOSWFzklJM8AyzKcGRuIxMf7w4lPBSKJhf5I4muByM7vg/64IRJvA9/V0Bz/rcLhIVMdeLWBbWJhIBIPoPxlPpvHIZjlwB4ROe3WRzSZhHenY0GMuEfqYUsGgMhvEbK2e+xOoqe+KyNrLg+EE/OBJ2c2d/7Dox8Qe9OKjvcRTCtwJ42s+QicfQ9AnUiJGYG1Y40ENFeIkgGgwGPEVKvG4F8d3ntmMnrqG4F7dvxbZf9PaB3+cPxhIZ6CkX7NqYt5GNbIWocvSIoCSG5fMhrTxu/YiZyiWmvOjJVPY647kqrJ87Hgtelo8FH0WCuwV5GKhrZiVL+FzeBjVR3kDALhjndqbOtzIu6UuuVPGxddlFO7pCgAq7vnVldL9Gygqf1VT74s+/ym0CQ09GcW8V+wUz2CHmsC7lBgNJeh4BpifhmbwjO6HSNf9cHUOoLyvzOGJ4f5vG1zxJaTehIRa7rJMtFLhq9E09HFt1o1cpiY5lSyUx1Gdx6240PpaGim5qtBiA4bG7Ht6w1vaFEATPYZo0SDRrt8GeZA692TbbJ/QcSXEH5C8hqJrGeSVSg/1xK60+GFNkD9BqDPWGF6Nt0a+qhmKoIp3wZm7w7lFCsKgMRyF6otPNaxqpBkMvZWZh6RNZEW7FDTsF0+0BBObPI3x/fWR+J7HD4SX43FOQV22wB9RklGYspUAragfBuE3baZMsUBWGR6CR0oNxrDUhTTIMxEswg/XWx1NWceBFvxqavp/gq25LNZI56NNaHrI5stkWKkshsKdBbx6yB9HqtPDplhdbVJzLtusETM16VbQp+hEr9kNBiySdbnVbzxhqaf/iufL82pDYJ+wtWyPI5rQ9DNe5hUtHE2E09VkXbQuNphOLk1l0dRADPufUoPkF3GRIR+g7sJLlxBwS4j2A4dYNp0AGZbOzmy19LDxxSrSHvZ/g4MtB5CAy9Gh8WNX7cuXPKIrV/CznmYqfOqprZsxzqSbFIUQFZ89iEsxvxJixqImFAbYfgBzyNywmJ79vWr2v/pkVZk9RTXMljsJ/oaakWoBxWhxz0qeU+o52GPwGVLBhAI734bh8jV2D00kP1wm1/9mJROaRGdj5u51r6mvnnnfkeWSzCvv4ADrAv3/mOYam8Du4BQTu0QLaNlkdkMZNed8Q0BntPoxP2CC6LPtq7TNkFW9JQMQK1wiLzfEE78ALvKzRi+v6lMYVkyHbsJY6eZCrqyoanT1b2wZfGHU9Hgr2D/E8aVm4muYOYJwAKgA0Ht/WPLokvVj0LLqg9gCsDCPEPlCpQ9rnXr5U/borJSKBuAMZY1a2DD7t1/xGj7FaMrpBmWNmL+bKHc5Jn4DvTmNpMvpBeN6T1iZMI0KVu3kZSmaFxphZGmJv75GsML0dGPN3bmtkAjzVJMl4XE7kn8d2Jeikvg+FqLJmAjWA5k1wjz3APR0Lxsqb5pzvdbKkWwvoOXv1z17lQ1ALbZ66Rs72NBLtCKFZi7D/qbO7bpJfCTy+PHcU1uxYH0kOoUNotrq/m+ELcOYfHW3dcsl6saAOy8TlznkBc87B560sv7CpRETHmZ5G2p+OfWkSHy1l1sCUn1ACQ/AjB2naNsn4dZbCOwajJseEOl1ocZ6OaK9K6GyFvHIARA+QCI2evc1OlQzHH31sjiK7r28tnMbY4hEiE+CFLmyU8hRDnwAMQzjGyVDwBrIGpahLm7NtWy+Isvbvr8ZYe2hq7AubBMLHJPap9lbzG2hbSW8wFAN7AA/rB13sXohfFw5Dz1y9qzB46T65sEVuzch2ATWSmPQ0Bt3TXD3umx6RgzbWViZ/+HzXY9xLJ2xemNzZ3Z10ioYPtfkIoPpnV5fR2PdO74WQtxD6xsvjitsfnL2IF+XqzJSYT22py5P5crS9Dwo6pE4NMOtiyaqnw5VAzA6uFRpiDm+BjDl6N6YuL0nMMi9yCQ3WjIcRE5BuAbkCz2R+Jz9R5UrryRs1Cd4W1idwYYmZdWDKB3lHXcGDNeWhAEm3wl2hBJ7EAgCwLh+IRAJHElgG9AiXilMl4dAh9u8hnx/cfwpWjFAPQTB3rSnZO4t68o5WQwZXpKM9OHjE98naj4Xl4xgKwTfjxLiXA/2YAvCu5Lv5EPFoXviTi82vL+pCXPl+aqBoBpsBGj8FctzkTD8UXhJXzqW6n5wYRuuxnLetH0PqZRNwk9Vq2OqgGoAx/zEqUGQvwE9vYk3tDWa8UHYqFZ5wMti+v3OvjZr9su5b5sEH4WyRJ/JFH24ISJ8/QrgPrm+GGLM36MhLse0FN+YvqqVmwT7TsfkEgbOf8pkPuNSHDjRaM+jXeR3U4LqySwrWKRU9c3d6bH14yYjmHdAKC9OcVgESEbjf+RPSZzbX04/vv+uu13AOpQX6r9+L7jk8yl+Ep2G3rwAWytTyGg584LRNuIaTULz+rxnboE6+3+mY2d+ddXrbQKzikA4+umFZ0n9OrgjyTWByLxe/2R+Kw+6G8+HF+Kj18bGiIdz928fE/F/d7UXUjPK4BCJxcyPxTAhex9rXtoBLQXLiT+BwAA//+IiAu3AAAABklEQVQDAAVM6Y59gAl6AAAAAElFTkSuQmCC',email:'data:image/png;base64,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',pin:'data:image/png;base64,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'};
  const ICON_KEYS=['phone','email','pin'];
  // Hosted copies sit in the site root next to index.html (mail-icon-*.png); Gmail and Outlook load https images, not data: URIs.
  function iconBase(options){
    const own=https(options.iconBase);if(own)return own.replace(/\/?$/,'/');
    const fonts=https(options.fontBase);return fonts&&/fonts\/?$/.test(fonts)?fonts.replace(/fonts\/?$/,''):'';
  }
  function iconSource(key,options){
    const forced=options.iconSources&&options.iconSources[key];
    if(forced&&/^cid:estratto-icon-[a-z]+@local$/.test(forced))return forced;
    const base=!options.preview&&iconBase(options);
    return base?base+'mail-icon-'+key+'.png':ICONS[key];
  }
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
    const displayName=name;
    const signatureLogo=options.signatureLogoSource||png(state.signatureLogoData);
    const logoWidth=Math.min(245,Math.max(80,Number(state.signatureLogoWidth)||175));
    const logoColumnWidth=Math.min(260,logoWidth+20);
    const job=safe(state.signatureRole||'',130);
    const company=safe(state.footerCompany||'',100);
    const phone=safe(state.signaturePhone||'',60);
    const mail=safe(state.signatureEmail||'',130);
    const address=safe(state.signatureAddress||'',200);
    const gold='#c99b58';
    const textStyle='font-family:'+contactFont+';font-size:13px;line-height:20px;font-weight:500;letter-spacing:0.2px;color:#ffffff;';
    const icon=(key,label)=>'<img src="'+escape(iconSource(key,options))+'" width="16" height="16" alt="'+label+'" style="display:block;width:16px;height:16px;border:0;outline:none;text-decoration:none;">';
    const row=(key,label,value,href)=>!value?'':'<tr><td valign="top" width="24" style="width:24px;padding:3px 0 3px 0;">'+icon(key,label)+'</td><td valign="top" style="padding:1px 0 3px;'+textStyle+'word-break:break-word;">'+(href?'<a href="'+escape(href)+'" style="'+textStyle+'text-decoration:none;">'+value+'</a>':value)+'</td></tr>';
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
      +row('phone','Tel',phone,phoneHref)+row('email','Email',mail,emailHref)+row('pin','Indirizzo',address,'')+'</table></td></tr></table>';
    const brand=signatureLogo
      ?'<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;width:100%;"><tr><td align="center" style="text-align:center;padding:0 0 12px;"><img src="'+escape(signatureLogo)+'" width="'+logoWidth+'" alt="'+(company||'Company logo')+'" style="display:block;width:'+logoWidth+'px;max-width:100%;height:auto;max-height:130px;object-fit:contain;margin:0 auto;border:0;"></td></tr></table>'
      :'<div style="border:1px dashed #666;border-radius:5px;padding:12px 4px;text-align:center;color:#aaa;font-size:11px;margin-bottom:12px;">'+(company||'YOUR LOGO')+'</div>';
    return '<tr><td style="padding:0;">'
      +'<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#050505" style="width:100%;max-width:760px;min-height:165px;background-color:#050505;border:1px solid #252525;border-top:0;border-radius:0 0 12px 12px;border-collapse:separate;overflow:hidden;">'
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
    const logo=image?`<tr><td align="center" style="padding:0 0 24px;text-align:center;"><img src="${escape(image)}" alt="${escape(state.logoAlt||'Logo')}" width="${size.width}" height="${size.height}" style="display:block;width:${size.width}px;height:${size.height}px;max-width:100%;margin:0 auto;border:0;outline:none;text-decoration:none;"></td></tr>`:'';
    const heading=title?`<h1 style="margin:0 0 20px;font-family:${font};font-size:21px;line-height:30px;font-weight:600;color:#202020;">${escape(title)}</h1>`:'';
    const footer=signature(state,options);
    const signatureWidth=state.footerEnabled&&state.footerStyle==='card'?760:560;
    const joinedSignature=state.footerEnabled&&state.footerStyle==='card';
    const bodyRadius=joinedSignature?'12px 12px 0 0':'12px';
    const bodyBottomBorder=joinedSignature?'border-bottom:0;':'';
    const fragment=`<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f4f4f5" style="width:100%;background-color:#f4f4f5;border-collapse:collapse;margin:0;"><tr><td align="center" class="mail-outer-padding" style="padding:40px 24px 56px;">
<!--[if mso]><table role="presentation" width="${signatureWidth}" border="0" cellspacing="0" cellpadding="0"><tr><td><![endif]-->
<table role="presentation" width="${signatureWidth}" border="0" cellspacing="0" cellpadding="0" style="width:100%;max-width:${signatureWidth}px;border-collapse:separate;">${logo}<tr><td class="mail-content-padding" align="left" bgcolor="#ffffff" style="padding:32px;background-color:#ffffff;border:1px solid #e7e7ed;${bodyBottomBorder}border-radius:${bodyRadius};text-align:left;word-wrap:break-word;">${heading}${body}</td></tr>${footer}</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>`;
    let base=https(options.fontBase);
    if(!base&&options.preview){
      try{const url=new URL(options.fontBase);if(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname))base=url.href;}catch(_){}
    }
    const faces=base?`@font-face{font-family:Inter;font-style:normal;font-weight:400;src:url('${escape(base)}Inter-Regular.ttf') format('truetype')}@font-face{font-family:Inter;font-style:normal;font-weight:500;src:url('${escape(base)}Inter-Medium.ttf') format('truetype')}@font-face{font-family:Inter;font-style:normal;font-weight:600;src:url('${escape(base)}Inter-SemiBold.ttf') format('truetype')}`:'';
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
    const card=state.footerEnabled&&state.footerStyle==='card';
    const usedIcons=card?ICON_KEYS.filter(key=>String(state[{phone:'signaturePhone',email:'signatureEmail',pin:'signatureAddress'}[key]]||'').trim()):[];
    const iconSources={};usedIcons.forEach(key=>{iconSources[key]='cid:estratto-icon-'+key+'@local';});
    const built=build(state,{...options,iconSources,logoSource:embedded?'cid:estratto-logo@local':undefined,photoSource:embeddedPhoto?'cid:estratto-photo@local':undefined,signatureLogoSource:embeddedFooter?'cid:estratto-signature-logo@local':undefined});
    const lines=['MIME-Version: 1.0','X-Unsent: 1','Subject: '+subject(state.title),`Content-Type: multipart/related; boundary="${outer}"`,'',`--${outer}`,`Content-Type: multipart/alternative; boundary="${inner}"`,'',`--${inner}`,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',wrap(base64(built.plainText)),`--${inner}`,'Content-Type: text/html; charset=UTF-8','Content-Transfer-Encoding: base64','',wrap(base64(built.html)),`--${inner}--`];
    if(embedded)lines.push(`--${outer}`,'Content-Type: image/png; name="logo.png"','Content-Transfer-Encoding: base64','Content-ID: <estratto-logo@local>','Content-Disposition: inline; filename="logo.png"','',wrap(data.split(',')[1]));
    if(embeddedPhoto){const mime=photo.startsWith('data:image/png;')?'image/png':'image/jpeg';lines.push(`--${outer}`,'Content-Type: '+mime+'; name="portrait"','Content-Transfer-Encoding: base64','Content-ID: <estratto-photo@local>','Content-Disposition: inline; filename="portrait"','',wrap(photo.split(',')[1]));}
    if(embeddedFooter)lines.push(`--${outer}`,'Content-Type: image/png; name="signature-logo.png"','Content-Transfer-Encoding: base64','Content-ID: <estratto-signature-logo@local>','Content-Disposition: inline; filename="signature-logo.png"','',wrap(footerLogo.split(',')[1]));
    for(const key of usedIcons)lines.push(`--${outer}`,'Content-Type: image/png; name="icon-'+key+'.png"','Content-Transfer-Encoding: base64','Content-ID: <estratto-icon-'+key+'@local>','Content-Disposition: inline; filename="icon-'+key+'.png"','',wrap(ICONS[key].split(',')[1]));
    lines.push(`--${outer}--`,'');return lines.join('\r\n');
  }
  return {escape,https,png,validate,paragraphs,dimensions,build,eml};
});
