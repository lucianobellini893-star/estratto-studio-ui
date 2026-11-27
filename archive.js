/* Local PDF archive: every downloaded PDF is kept in this browser (IndexedDB) so it can be downloaded again. */
(() => {
 'use strict';
 const DB = 'estratto-archive', STORE = 'files', LIMIT = 300;
 let dbPromise = null;
 function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
   if (!('indexedDB' in window)) { reject(new Error('Браузер не поддерживает локальный архив.')); return; }
   const req = indexedDB.open(DB, 1);
   req.onupgradeneeded = () => { const s = req.result.createObjectStore(STORE, { keyPath: 'id' }); s.createIndex('createdAt', 'createdAt'); };
   req.onsuccess = () => resolve(req.result);
   req.onerror = () => reject(req.error || new Error('Архив недоступен.'));
  }).catch(err => { dbPromise = null; throw err; });
  return dbPromise;
 }
 function tx(mode, fn) {
  return open().then(db => new Promise((resolve, reject) => {
   const t = db.transaction(STORE, mode), store = t.objectStore(STORE); let out;
   Promise.resolve(fn(store, v => { out = v; })).catch(reject);
   t.oncomplete = () => resolve(out); t.onerror = () => reject(t.error); t.onabort = () => reject(t.error || new Error('Операция отменена.'));
  }));
 }
 const all = () => tx('readonly', (s, set) => { const r = s.getAll(); r.onsuccess = () => set((r.result || []).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))); });
 const meta = row => { const { blob, ...rest } = row; return { ...rest, size: blob ? blob.size : 0 }; };
 const changed = () => document.dispatchEvent(new CustomEvent('estratto:archive'));

 async function add(entry) {
  try {
   if (!entry || !(entry.blob instanceof Blob)) return null;
   const row = {
    id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)),
    type: String(entry.type || 'other'), name: String(entry.name || entry.filename || 'Документ').slice(0, 200),
    client: String(entry.client || '').slice(0, 200), publicId: String(entry.publicId || '').slice(0, 80),
    filename: String(entry.filename || 'documento.pdf').slice(0, 200), historyId: entry.historyId ? String(entry.historyId) : '',
    note: String(entry.note || '').slice(0, 200), createdAt: new Date().toISOString(), blob: entry.blob
   };
   await tx('readwrite', s => { s.put(row); });
   const rows = await all();
   if (rows.length > LIMIT) await tx('readwrite', s => { for (const r of rows.slice(LIMIT)) s.delete(r.id); });
   changed();
   return row.id;
  } catch (_) { return null; }
 }
 async function list() { try { return (await all()).map(meta); } catch (_) { return []; } }
 async function get(id) { return tx('readonly', (s, set) => { const r = s.get(id); r.onsuccess = () => set(r.result || null); }); }
 async function download(id) {
  const row = await get(id); if (!row) throw new Error('Файл не найден в архиве.');
  const url = URL.createObjectURL(row.blob), a = document.createElement('a');
  a.href = url; a.download = row.filename; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 20000);
 }
 async function preview(id) {
  const row = await get(id); if (!row) throw new Error('Файл не найден в архиве.');
  const url = URL.createObjectURL(row.blob); window.open(url, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(url), 60000);
 }
 async function remove(id) { await tx('readwrite', s => { s.delete(id); }); changed(); }
 async function usage() { const rows = await list(); return { count: rows.length, bytes: rows.reduce((n, r) => n + (r.size || 0), 0) }; }
 window.EstrattoArchive = { add, list, get, download, preview, remove, usage };
})();
