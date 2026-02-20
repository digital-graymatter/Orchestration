/* ── Knowledge Bank Store ──
   IndexedDB CRUD operations for persisting approved outputs. */

const DB_NAME = 'orchestrator-kb';
const DB_VERSION = 1;
const STORE_NAME = 'entries';

/**
 * Open (or create) the IndexedDB database.
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('agent', 'agent', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Add an entry to the Knowledge Bank.
 * @param {Object} entry — { agent, category, tag, content, channel, runbook, persona, sector, campaignContext, specialist? }
 * @returns {Object} The saved entry with generated id and timestamp.
 */
export async function addEntry(entry) {
  const db = await openDB();
  const record = {
    id: crypto.randomUUID(),
    ...entry,
    timestamp: new Date().toISOString(),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve(record);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get all entries, sorted by timestamp descending (most recent first).
 * @returns {Array}
 */
export async function getAllEntries() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => {
      const entries = req.result || [];
      entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      resolve(entries);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Get entries filtered by category.
 * @param {string} category
 * @returns {Array}
 */
export async function getEntriesByCategory(category) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const idx = tx.objectStore(STORE_NAME).index('category');
    const req = idx.getAll(category);
    req.onsuccess = () => {
      const entries = req.result || [];
      entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      resolve(entries);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Get entries filtered by agent ID.
 * @param {string} agentId
 * @returns {Array}
 */
export async function getEntriesByAgent(agentId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const idx = tx.objectStore(STORE_NAME).index('agent');
    const req = idx.getAll(agentId);
    req.onsuccess = () => {
      const entries = req.result || [];
      entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      resolve(entries);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Delete an entry by ID.
 * @param {string} id
 */
export async function deleteEntry(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Clear all entries.
 */
export async function clearAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get count of entries.
 * @returns {number}
 */
export async function getEntryCount() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
