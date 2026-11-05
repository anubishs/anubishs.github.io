const KEY = 'anubis-3d-projects-v1';
let connection;
function database() {
  if (!connection) connection = new Promise((resolve, reject) => {
    const request = indexedDB.open('anubis-3d-drafts', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { connection = null; reject(request.error); };
    request.onblocked = () => reject(new Error('Armazenamento ocupado. Feche outras abas da calculadora.'));
  });
  return connection;
}
export async function loadDraft() {
  try {
    const db = await database();
    const saved = await new Promise((resolve, reject) => {
      const request = db.transaction('drafts').objectStore('drafts').get(KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (saved) return saved;
  } catch { /* Older browsers can still use the existing local draft. */ }
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}
export async function saveDraft(state) {
  try {
    const db = await database();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('drafts', 'readwrite');
      transaction.objectStore('drafts').put(state, KEY);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } catch {
    // Retain the complete draft, including photos, or report that saving failed.
    localStorage.setItem(KEY, JSON.stringify(state));
    // An old IndexedDB copy must not win over a successful fallback on reload.
    try { const db = await database(); const tx = db.transaction('drafts', 'readwrite'); tx.objectStore('drafts').delete(KEY); } catch {}
  }
}
export function normalizeDraft(state) {
  return {...state, projects: state.projects.map(p => ({...p, filamentPrice:p.filamentPrice === '' ? 100 : p.filamentPrice, printingEnabled: p.printingEnabled !== false, depreciationRate:p.depreciationRate ?? 0, roundUnit:p.roundUnit === true, roundTotal:p.roundTotal === true, extras: p.extras ?? [], references: p.references ?? []}))};
}
export function validDraft(s) {
  if (!s || s.version !== 1 || !Array.isArray(s.projects) || !s.projects.length || s.projects.length > 100) return false;
  let imageCount = 0;
  if (!s.projects.every(p => {
    if (!p || typeof p.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(p.id) || typeof p.name !== 'string' || p.name.length > 150 || typeof p.included !== 'boolean') return false;
    if (p.printingEnabled !== undefined && typeof p.printingEnabled !== 'boolean') return false;
    if (['roundUnit','roundTotal'].some(key => p[key] !== undefined && typeof p[key] !== 'boolean')) return false;
    if (p.depreciationRate !== undefined && !['number','string'].includes(typeof p.depreciationRate)) return false;
    if (p.description !== undefined && (typeof p.description !== 'string' || p.description.length > 2000)) return false;
    if (!['filamentPrice','filamentUsed','printHours','printerPower','energyRate','markup','quantity'].every(k => typeof p[k] === 'number' || typeof p[k] === 'string')) return false;
    if (p.extras !== undefined && (!Array.isArray(p.extras) || p.extras.length > 30 || !p.extras.every(e => e && typeof e.id === 'string' && typeof e.name === 'string' && e.name.length <= 150 && ['number','string'].includes(typeof e.amount)))) return false;
    if (p.references !== undefined && (!Array.isArray(p.references) || p.references.length > 4 || !p.references.every(r => r && typeof r.id === 'string' && typeof r.name === 'string' && r.name.length <= 200 && typeof r.caption === 'string' && r.caption.length <= 150 && typeof r.data === 'string' && r.data.length <= 450000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(r.data) && Number.isFinite(r.width) && r.width > 0 && r.width <= 1200 && Number.isFinite(r.height) && r.height > 0 && r.height <= 1200))) return false;
    imageCount += p.references?.length ?? 0;
    return true;
  }) || imageCount > 40 || new Set(s.projects.map(p=>p.id)).size !== s.projects.length) return false;
  return s.meta && ['client','title','issued','payment','notes'].every(k => typeof s.meta[k] === 'string') && Number(s.meta.validity) >= 1 && Number(s.meta.validity) <= 365;
}
