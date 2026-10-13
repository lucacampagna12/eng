/**
 * Minimal IndexedDB key/value store for file blobs (uploaded media, comment attachments).
 * Mock stand-in for Supabase Storage so uploads survive a refresh and links open in other tabs.
 */
const DB_NAME = 'eng-files'
const STORE = 'blobs'

let dbPromise: Promise<IDBDatabase> | undefined

function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = fn(db.transaction(STORE, mode).objectStore(STORE))
        req.onsuccess = () => resolve(req.result as T)
        req.onerror = () => reject(req.error)
      }),
  )
}

export const blobStore = {
  put: (key: string, blob: Blob) => run<IDBValidKey>('readwrite', (s) => s.put(blob, key)).catch(() => undefined),
  get: (key: string) => run<Blob | undefined>('readonly', (s) => s.get(key)).catch(() => undefined),
  delete: (key: string) => run<undefined>('readwrite', (s) => s.delete(key)).catch(() => undefined),
  clear: () => run<undefined>('readwrite', (s) => s.clear()).catch(() => undefined),
}
