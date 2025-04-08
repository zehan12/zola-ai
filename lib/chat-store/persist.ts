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
    // Check current version first
    const checkRequest = indexedDB.open("zola-db")
    let newVersion = 1

    checkRequest.onsuccess = () => {
      const db = checkRequest.result
      newVersion = db.version + 1
      db.close()

      // Open with a proper version upgrade
      const request = indexedDB.open("zola-db", newVersion)

      request.onupgradeneeded = (event) => {
        const db = request.result

        // Create missing stores only if they don't exist
        if (!db.objectStoreNames.contains("chats")) {
          db.createObjectStore("chats")
        }
        if (!db.objectStoreNames.contains("messages")) {
          db.createObjectStore("messages")
        }
        if (!db.objectStoreNames.contains("sync")) {
          db.createObjectStore("sync")
        }
      }

      request.onsuccess = () => {
        dbReady = true
        request.result.close()
        resolve()
      }

      request.onerror = () => {
        reject(request.error)
      }
    }

    checkRequest.onerror = () => {
      reject(checkRequest.error)
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
