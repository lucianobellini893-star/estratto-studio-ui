/* Overview dashboard: reads the local library (drafts, history, clients). No network. */
(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 if (!$('page-overview') || !$('dl-rows')) return;
 const names = { editor: 'Выписка по сделкам', account: 'Выписка по счёту', mail: 'Письмо' };
 const typePage = { editor: 'editor', account: 'account', mail: 'mail' };
 const tones = ['#F4D3C6', '#C9DBF8', '#DCD0F5', '#F6E3B0', '#CDEBD8', '#F5CADB'];
 const filters = { client: '', type: '', from: '', to: '', kind: '', q: '' };
 let selected = '';

 const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
 const initials = name => String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
 const tone = name => { let h = 0; for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) | 0; return tones[Math.abs(h) % tones.length]; };
 const pad = n => String(n).padStart(2, '0');
 const fmtDate = d => pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
 const fmtTime = d => pad(d.getHours()) + ':' + pad(d.getMinutes());
 const parseIt = v => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(v).trim()); if (!m) return null; const d = new Date(+m[3], +m[2] - 1, +m[1]); return d.getDate() === +m[1] && d.getMonth() === +m[2] - 1 ? d : null; };
 const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
 const avatar = (name, size) => { const a = el('span', 'av', initials(name)); a.style.background = tone(name); if (size) { a.style.width = a.style.height = size + 'px'; } a.title = name; return a; };

 function library() {
  try { return window.EstrattoLibraryView ? window.EstrattoLibraryView.get() : null; } catch (_) { return null; }
 }
 function clientOf(row) { return String(row.data?.clientName || '').trim(); }
 function rowsFrom(lib) {
  const out = [];
  for (const r of lib.history || []) out.push({ key: 'h:' + r.id, kind: 'history', id: r.id, type: r.type, name: r.name || names[r.type], client: clientOf(r), action: r.action || 'Создан', at: new Date(r.createdAt), data: r.data || {} });
  for (const r of lib.drafts || []) out.push({ key: 'd:' + r.id, kind: 'drafts', id: r.id, type: r.type, name: r.name || names[r.type], client: clientOf(r), action: 'Черновик', at: new Date(r.updatedAt || r.createdAt), data: r.data || {} });
  return out.filter(r => names[r.type]).sort((a, b) => (b.at.getTime() || 0) - (a.at.getTime() || 0));
 }

 function bar(host, parts) {
  host.replaceChildren();
  const total = parts.reduce((s, p) => s + p.v, 0);
  if (!total) { const e = el('i'); e.style.flex = '1'; e.className = 'empty'; host.append(e); return; }
  for (const p of parts) if (p.v) { const i = el('i'); i.style.flex = String(p.v); i.style.background = p.c; i.title = (p.t || '') + ' ' + p.v; host.append(i); }
 }

 function renderKpis(lib, rows) {
  const now = new Date(), m0 = new Date(now.getFullYear(), now.getMonth(), 1), p0 = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const hist = rows.filter(r => r.kind === 'history');
  const month = hist.filter(r => r.at >= m0), prev = hist.filter(r => r.at >= p0 && r.at < m0);
  $('kpi-month').textContent = month.length;
  const delta = $('kpi-month-delta');
  if (prev.length) { const pct = Math.round((month.length - prev.length) / prev.length * 100); delta.textContent = (pct > 0 ? '+' : '') + pct + '%'; delta.className = pct >= 0 ? 'up' : 'down'; } else { delta.textContent = ''; }
  const weeks = [0, 0, 0, 0];
  for (const r of month) weeks[Math.min(3, Math.floor((r.at.getDate() - 1) / 7))]++;
  const cur = Math.min(3, Math.floor((now.getDate() - 1) / 7));
  bar($('kpi-month-bar'), weeks.map((v, i) => ({ v: v || (i <= cur ? 0 : 0), c: i === cur ? 'var(--blue)' : '#0B0D12', t: 'Нед ' + (i + 1) })));
  if (!month.length) bar($('kpi-month-bar'), []);
  const people = [...new Set(month.map(r => r.client).filter(Boolean))];
  const stack = $('kpi-month-people'); stack.replaceChildren(...people.slice(0, 6).map(n => avatar(n)));
  if (people.length > 6) stack.append(el('span', 'av more', '+' + (people.length - 6)));

  const drafts = lib.drafts || [];
  $('kpi-drafts').textContent = drafts.length;
  const by = t => drafts.filter(d => d.type === t).length;
  const parts = [{ v: by('editor'), c: '#0B0D12', t: 'Сделки' }, { v: by('account'), c: 'var(--blue)', t: 'Счёт' }, { v: by('mail'), c: '#B9C6E8', t: 'Письма' }];
  bar($('kpi-drafts-bar'), parts);
  const legend = $('kpi-drafts-legend'); legend.replaceChildren();
  for (const p of parts) { const s = el('span'); const dot = el('i'); dot.style.background = p.c; s.append(dot, document.createTextNode(p.t + ' ' + p.v)); legend.append(s); }

  const clients = lib.clients || [];
  $('kpi-clients').textContent = clients.length;
  const active = new Set(month.map(r => r.client.toLocaleLowerCase()));
  const withDocs = clients.filter(c => active.has(String(c.name).toLocaleLowerCase())).length;
  bar($('kpi-clients-bar'), [{ v: withDocs, c: 'var(--blue)', t: 'С документами в этом месяце' }, { v: clients.length - withDocs, c: '#E3E6EC', t: 'Без документов' }]);
  $('kpi-clients-note').textContent = clients.length ? withDocs + ' с документами в этом месяце' : 'Добавьте первого клиента';
  $('kpi-clients-people').replaceChildren(...clients.slice(-6).reverse().map(c => avatar(c.name)));

  // Last 7 days of activity: exports + draft updates.
  const host = $('act-bars'); host.replaceChildren();
  const days = [], today = startOfDay(now), labels = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  for (let i = 6; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); days.push({ d, n: 0 }); }
  for (const r of rows) { const t = startOfDay(r.at).getTime(); const day = days.find(x => x.d.getTime() === t); if (day) day.n++; }
  const max = Math.max(1, ...days.map(d => d.n)), total = days.reduce((s, d) => s + d.n, 0);
  $('act-total').textContent = total;
  for (const [i, day] of days.entries()) {
   const col = el('div', 'act-col'), b = el('div', 'act-bar' + (i === 6 ? ' today' : ''));
   b.style.height = day.n ? Math.max(18, Math.round(day.n / max * 100)) : 8 + '%';
   b.title = fmtDate(day.d) + ': ' + day.n;
   if (i === 6 && day.n) b.append(el('span', 'act-tip', day.n + ' сегодня'));
   col.append(b, el('span', 'act-day', labels[day.d.getDay()]));
   host.append(col);
  }
 }

 function filtered(rows) {
  const from = parseIt(filters.from), to = parseIt(filters.to), q = filters.q.toLocaleLowerCase();
  return rows.filter(r => (!filters.client || r.client === filters.client) && (!filters.type || r.type === filters.type) && (!filters.kind || r.kind === filters.kind) &&
   (!from || r.at >= from) && (!to || r.at < new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1)) &&
   (!q || [r.name, r.client, names[r.type], r.action, r.data.publicId, r.data.clientId, r.data.title].some(v => String(v || '').toLocaleLowerCase().includes(q))));
 }

 function status(r) { return r.kind === 'drafts' ? ['Черновик', 'st-draft'] : /скоп|скач|html|eml/i.test(r.action) && r.type === 'mail' ? ['Отправка', 'st-sent'] : ['Готов', 'st-ready']; }

 function renderList(rows) {
  const list = filtered(rows), host = $('dl-rows');
  $('dl-count').textContent = list.length ? Math.min(list.length, 8) + ' из ' + list.length : '';
  host.replaceChildren();
  if (!list.length) {
   const e = el('div', 'dl-empty');
   e.append(el('strong', '', rows.length ? 'Ничего не найдено' : 'Здесь появятся ваши документы'), el('p', '', rows.length ? 'Измените фильтры или очистите поиск.' : 'Создайте выписку или письмо — после скачивания PDF документ появится в этом списке.'));
   if (!rows.length) { const b = el('button', 'pill-btn blue', 'Создать выписку'); b.type = 'button'; b.addEventListener('click', () => window.EstrattoNavigate('editor')); e.append(b); }
   host.append(e); selected = ''; renderDetail(null); return;
  }
  if (!list.some(r => r.key === selected)) selected = list[0].key;
  for (const r of list.slice(0, 8)) {
   const b = el('button', 'dl-row' + (r.key === selected ? ' sel' : '')); b.type = 'button';
   const [st, cls] = status(r);
   const info = el('span', 'dl-info'); info.append(el('strong', '', r.name), el('small', '', [r.client, names[r.type]].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i && v !== r.name).join(' · ') || names[r.type]));
   b.append(avatar(r.client || r.name, 34), info, el('span', 'st ' + cls, st), el('span', 'dl-date', isFinite(r.at) ? fmtDate(r.at) : '—'));
   b.addEventListener('click', () => { selected = r.key; renderList(rows); });
   host.append(b);
  }
  renderDetail(list.find(r => r.key === selected));
 }

 function mini(label, value, sub) { const m = el('div', 'mini'); m.append(el('span', 'mini-l', label), el('strong', '', value || '—'), el('small', '', sub || '')); return m; }

 function renderDetail(r) {
  const host = $('dash-detail'); host.replaceChildren();
  if (!r) { const e = el('div', 'dd-empty'); e.append(el('strong', '', 'Выберите документ'), el('p', '', 'Подробности и быстрые действия появятся здесь.')); host.append(e); return; }
  const main = el('div', 'dd-main');
  const head = el('div', 'dd-head');
  const c1 = el('div'); c1.append(el('span', 'mini-l', r.kind === 'drafts' ? 'Черновик' : 'Документ'), el('div', 'dd-title', r.name)); const [st, cls] = status(r); c1.append(el('span', 'st ' + cls, r.kind === 'drafts' ? st : r.action));
  const c2 = el('div'); c2.append(el('span', 'mini-l', 'Тип'), el('strong', '', names[r.type]), el('small', '', r.type === 'editor' ? (r.data.mode === 'chiuse' || r.data.mode === 'closed' ? 'Закрытые сделки' : 'Сделки · PDF') : r.type === 'account' ? 'Conto di trading · PDF' : 'Email · HTML'));
  const c3 = el('div', 'dd-client'); c3.append(el('span', 'mini-l', 'Клиент'));
  const who = el('div', 'dd-who'); const t = el('div'); t.append(el('strong', '', r.client || '—'), el('small', '', r.data.publicId || r.data.clientId || '')); who.append(avatar(r.client || r.name, 32), t); c3.append(who);
  head.append(c1, c2, c3);
  const minis = el('div', 'dd-minis');
  const when = isFinite(r.at) ? fmtDate(r.at) : '—', time = isFinite(r.at) ? fmtTime(r.at) : '';
  if (r.type === 'editor') {
   const lines = String(r.data.trades || '').split(/\n/).filter(l => l.trim()).length;
   minis.append(mini('Период', r.data.from && r.data.to ? r.data.from.split('-').reverse().join('/') : 'Авто', r.data.to ? 'по ' + r.data.to.split('-').reverse().join('/') : 'по датам сделок'), mini('Сделок', String(lines), 'строк из CRM'), mini(r.kind === 'drafts' ? 'Обновлён' : 'Создан', when, time));
  } else if (r.type === 'account') {
   minis.append(mini('Счёт', r.data.accountId || '—', r.data.currency || ''), mini('Операций', String((r.data.transactions || []).length), 'в выписке'), mini(r.kind === 'drafts' ? 'Обновлён' : 'Создан', when, time));
  } else {
   minis.append(mini('Тема', r.data.title || '—', ''), mini('Действие', r.action, ''), mini(r.kind === 'drafts' ? 'Обновлён' : 'Создан', when, time));
  }
  const foot = el('div', 'dd-foot');
  foot.append(el('span', 'dd-foot-l', r.kind === 'drafts' ? 'Продолжить с того же места' : 'Открыть копию с теми же данными'));
  const go = el('button', 'pill-btn ghost', 'Раздел'); go.type = 'button'; go.addEventListener('click', () => window.EstrattoNavigate(typePage[r.type]));
  const open = el('button', 'pill-btn blue', r.kind === 'drafts' ? 'Продолжить' : 'Открыть копию'); open.type = 'button';
  open.addEventListener('click', () => window.EstrattoLibraryView && window.EstrattoLibraryView.open(r.kind, r.id));
  const btns = el('div', 'dd-btns'); btns.append(go, open); foot.append(btns);
  main.append(head, minis, foot);
  const paper = el('div', 'dd-paper'); paper.setAttribute('aria-hidden', 'true');
  paper.append(el('i', 'pp-logo'), el('b', '', r.type === 'mail' ? 'Messaggio' : r.type === 'account' ? 'Estratto conto' : 'Operazioni'));
  for (let i = 0; i < 9; i++) { const l = el('i', 'pp-line' + (i === 0 ? ' head' : '')); l.style.width = (100 - (i % 4) * 9) + '%'; paper.append(l); }
  host.append(main, paper);
 }

 function fillClients(rows) {
  const sel = $('df-client'), cur = sel.value;
  const set = [...new Set(rows.map(r => r.client).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  sel.replaceChildren(new Option('Все клиенты', ''), ...set.map(n => new Option(n, n)));
  sel.value = set.includes(cur) ? cur : ''; filters.client = sel.value;
 }

 let cache = [];
 function render() {
  const lib = library() || { drafts: [], history: [], clients: [] };
  cache = rowsFrom(lib);
  const h = new Date().getHours();
  $('dash-greet').textContent = (h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер') + '. Ваши документы, черновики и клиенты в одном месте.';
  fillClients(cache); renderKpis(lib, cache); renderList(cache);
 }

 // Filters
 $('df-client').addEventListener('change', e => { filters.client = e.target.value; renderList(cache); });
 $('df-type').addEventListener('change', e => { filters.type = e.target.value; renderList(cache); });
 $('df-search').addEventListener('input', e => { filters.q = e.target.value.trim(); renderList(cache); });
 for (const id of ['df-from', 'df-to']) {
  const input = $(id);
  input.addEventListener('input', () => {
   let v = input.value.replace(/[^\d]/g, '').slice(0, 8);
   if (v.length > 4) v = v.slice(0, 2) + '/' + v.slice(2, 4) + '/' + v.slice(4); else if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
   input.value = v;
   const ok = !v || parseIt(v);
   input.closest('.pill-field').classList.toggle('bad', v.length === 10 && !ok);
   if (!v || (v.length === 10 && ok)) { filters[id === 'df-from' ? 'from' : 'to'] = v; renderList(cache); }
  });
 }
 for (const b of $('df-kind').querySelectorAll('button')) b.addEventListener('click', () => {
  for (const x of $('df-kind').querySelectorAll('button')) x.setAttribute('aria-pressed', String(x === b));
  filters.kind = b.dataset.kind; renderList(cache);
 });

 // "New document" menu
 const newBtn = $('dash-new'), list = $('dash-new-list');
 const closeMenu = () => { list.hidden = true; newBtn.setAttribute('aria-expanded', 'false'); };
 newBtn.addEventListener('click', e => { e.stopPropagation(); list.hidden = !list.hidden; newBtn.setAttribute('aria-expanded', String(!list.hidden)); if (!list.hidden) list.querySelector('button')?.focus(); });
 list.addEventListener('click', closeMenu);
 document.addEventListener('click', e => { if (!list.hidden && !list.contains(e.target)) closeMenu(); });
 document.addEventListener('keydown', e => { if (e.key === 'Escape' && !list.hidden) { closeMenu(); newBtn.focus(); } });

 // Top-nav groups: keep "Документы"/"Письма" highlighted on their sub pages.
 function syncGroups(page) {
  for (const b of document.querySelectorAll('[data-nav-group]')) b.classList.toggle('active', b.dataset.navGroup.split(' ').includes(page));
  const active = document.querySelector('.top-tabs .top-tab.active');
  if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
 }
 document.addEventListener('estratto:navigate', e => syncGroups(e.detail));
 document.addEventListener('estratto:library', render);
 syncGroups((document.querySelector('.studio-page.active')?.id || 'page-overview').slice(5));
 render();
})();
