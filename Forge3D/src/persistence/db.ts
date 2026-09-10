import type { ProjectRecord, SceneSnapshot } from '../core/types'

const DB_NAME = 'forge3d'
const DB_VERSION = 1
const STORE = 'projects'
const META = 'meta'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser.'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('updatedAt', 'updatedAt')
      }
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open the local project database.'))
  })
  return dbPromise
}

function tx<T>(store: string, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(store, mode)
        const request = run(transaction.objectStore(store))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error('Local storage request failed.'))
      }),
  )
}

export const newProjectId = () => `prj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

export async function saveProject(record: ProjectRecord): Promise<void> {
  await tx<IDBValidKey>(STORE, 'readwrite', (s) => s.put(record))
}

export async function loadProject(id: string): Promise<ProjectRecord | undefined> {
  return tx<ProjectRecord | undefined>(STORE, 'readonly', (s) => s.get(id))
}

export async function listProjects(): Promise<ProjectRecord[]> {
  const all = await tx<ProjectRecord[]>(STORE, 'readonly', (s) => s.getAll())
  return all.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function deleteProject(id: string): Promise<void> {
  await tx<undefined>(STORE, 'readwrite', (s) => s.delete(id))
}

export async function writeMeta(key: string, value: unknown): Promise<void> {
  await openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(META, 'readwrite')
        const request = transaction.objectStore(META).put(value, key)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      }),
  )
}

export async function readMeta<T>(key: string): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const transaction = db.transaction(META, 'readonly')
        const request = transaction.objectStore(META).get(key)
        request.onsuccess = () => resolve(request.result as T | undefined)
        request.onerror = () => reject(request.error)
      }),
  )
}

export function makeRecord(id: string, name: string, scene: SceneSnapshot, createdAt?: number): ProjectRecord {
  const now = Date.now()
  return { id, name, scene, createdAt: createdAt ?? now, updatedAt: now }
}
