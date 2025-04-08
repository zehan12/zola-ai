import {
  createStore,
  del,
  delMany,
  get,
  getMany,
  keys,
  set,
  setMany,
} from "idb-keyval"

let dbReady = false

// Initialize the database with proper versioning
function initDatabase() {
  return new Promise<void>((resolve, reject) => {
    // Open with a new version to force an upgrade
    const request = indexedDB.deleteDatabase("zola-db")

    request.onsuccess = () => {
      console.log("Database deleted successfully")

      // Now create a fresh database
      const openRequest = indexedDB.open("zola-db", 1)

      openRequest.onupgradeneeded = (event) => {
        const db = openRequest.result
        // Create all stores
        db.createObjectStore("chats")
        db.createObjectStore("messages")
        db.createObjectStore("sync")
      }

      openRequest.onsuccess = () => {
        dbReady = true
        resolve()
      }

      openRequest.onerror = () => {
        reject(openRequest.error)
      }
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

// Call initialization function
const dbInitPromise = initDatabase()

// Modify your existing functions to wait for DB initialization
async function ensureDbReady() {
  if (!dbReady) {
    await dbInitPromise
  }
}

// Define stores AFTER DB is initialized
let stores: Record<string, any> = {}

dbInitPromise.then(() => {
  stores = {
    chats: createStore("zola-db", "chats"),
    messages: createStore("zola-db", "messages"),
    sync: createStore("zola-db", "sync"),
  }
})

// read one or all items from a store
export async function readFromIndexedDB<T>(
  table: "chats" | "messages" | "sync",
  key?: string
): Promise<T | T[]> {
  await ensureDbReady()
  try {
    const store = stores[table]
    if (key) {
      const item = await get<T>(key, store)
      return item as T
    }

    const allKeys = await keys(store)
    const values = await getMany<T>(allKeys as string[], store)
    return values
  } catch (error) {
    console.log(`Error reading from IndexedDB store '${table}':`, error)
    return key ? (null as any) : []
  }
}

// write one or multiple items to a store
export async function writeToIndexedDB<T extends { id: string | number }>(
  table: "chats" | "messages" | "sync",
  data: T | T[]
): Promise<void> {
  await ensureDbReady()
  try {
    const store = stores[table]
    const entries: [IDBValidKey, T][] = Array.isArray(data)
      ? data.map((item) => [item.id, item])
      : [[data.id, data]]

    await setMany(entries, store)
  } catch (error) {
    console.error(`Error writing to IndexedDB store '${table}':`, error)
  }
}

// delete one or all items from a store
export async function deleteFromIndexedDB(
  table: keyof typeof stores,
  key?: string
): Promise<void> {
  const store = stores[table]

  if (key) {
    await del(key, store)
  } else {
    const allKeys = await keys(store)
    await delMany(allKeys as string[], store)
  }
}

export async function clearAllIndexedDBStores() {
  await deleteFromIndexedDB("chats")
  await deleteFromIndexedDB("messages")
  await deleteFromIndexedDB("sync")
}
