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
let dbInitPromise: Promise<void> | null = null
let stores: Record<string, any> = {}

const isClient = typeof window !== "undefined"
const DB_NAME = "zola-db"
const DB_VERSION = 2

let storesReady = false
let storesReadyResolve: () => void = () => {}
const storesReadyPromise = new Promise<void>((resolve) => {
  storesReadyResolve = resolve
})

function initDatabase() {
  if (!isClient) return Promise.resolve()

  return new Promise<void>((resolve, reject) => {
    console.log("⏳ Opening database with version", DB_VERSION)
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      console.log("🔄 Database upgrade needed, creating object stores", event)
      const db = request.result
      if (!db.objectStoreNames.contains("chats")) {
        console.log("📦 Creating 'chats' object store")
        db.createObjectStore("chats")
      }
      if (!db.objectStoreNames.contains("messages")) {
        console.log("📦 Creating 'messages' object store")
        db.createObjectStore("messages")
      }
      if (!db.objectStoreNames.contains("sync")) {
        console.log("📦 Creating 'sync' object store")
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
  })
}

if (isClient) {
  console.log("🔍 Starting database check")
  const checkRequest = indexedDB.open(DB_NAME)

  checkRequest.onsuccess = () => {
    console.log("✅ Initial DB check successful")
    const db = checkRequest.result
    console.log(
      `📊 DB Version check: current=${db.version}, required=${DB_VERSION}`
    )
    if (db.version > DB_VERSION) {
      console.warn(
        `⚠️ Database version mismatch: ${db.version} > ${DB_VERSION}, deleting database`
      )
      db.close()
      const deleteRequest = indexedDB.deleteDatabase(DB_NAME)
      deleteRequest.onsuccess = () => {
        console.log("🗑️ Database deleted successfully")
        initDatabaseAndStores()
      }
      deleteRequest.onerror = (event) => {
        console.error("❌ Database deletion failed:", event)
        initDatabaseAndStores()
      }
    } else {
      console.log("✅ Database version is compatible")
      db.close()
      initDatabaseAndStores()
    }
  }

  checkRequest.onerror = (event) => {
    console.warn("⚠️ Initial DB check failed:", event)
    initDatabaseAndStores()
  }
}

function initDatabaseAndStores(): void {
  console.log("🚀 Initializing database and stores")
  dbInitPromise = initDatabase()
  console.log("📝 Database initialization promise created")

  dbInitPromise
    .then(() => {
      console.log("✅ Database initialized successfully")
      const openRequest = indexedDB.open(DB_NAME)
      console.log("🔓 Opening database to create stores")

      openRequest.onsuccess = () => {
        console.log("✅ Database opened successfully for store creation")
        const objectStores = Array.from(openRequest.result.objectStoreNames)
        console.log("📋 Available object stores:", objectStores)

        if (objectStores.length === 0) {
          console.warn(
            "⚠️ No object stores found in database, forcing DB recreation"
          )
          openRequest.result.close()

          // Delete and recreate the database to force onupgradeneeded
          const deleteRequest = indexedDB.deleteDatabase(DB_NAME)
          deleteRequest.onsuccess = () => {
            console.log(
              "🗑️ Empty database deleted, recreating with proper stores"
            )
            dbInitPromise = initDatabase() // Reinitialize with proper stores
            dbInitPromise.then(() => {
              // Try opening again to create stores
              const reopenRequest = indexedDB.open(DB_NAME)
              reopenRequest.onsuccess = () => {
                const newObjectStores = Array.from(
                  reopenRequest.result.objectStoreNames
                )
                console.log("📋 New available object stores:", newObjectStores)

                let storeCount = 0
                if (newObjectStores.includes("chats")) {
                  console.log("🔧 Creating store: chats")
                  stores.chats = createStore(DB_NAME, "chats")
                  storeCount++
                }
                if (newObjectStores.includes("messages")) {
                  console.log("🔧 Creating store: messages")
                  stores.messages = createStore(DB_NAME, "messages")
                  storeCount++
                }
                if (newObjectStores.includes("sync")) {
                  console.log("🔧 Creating store: sync")
                  stores.sync = createStore(DB_NAME, "sync")
                  storeCount++
                }

                console.log(
                  `📦 Created ${storeCount} stores`,
                  Object.keys(stores)
                )
                console.log("🏁 Setting storesReady flag to true")
                storesReady = true
                console.log("🔔 Resolving storesReadyPromise")
                storesReadyResolve()
                reopenRequest.result.close()
              }

              reopenRequest.onerror = (event) => {
                console.error(
                  "❌ Failed to reopen database after recreation:",
                  event
                )
                storesReady = true
                storesReadyResolve()
              }
            })
          }

          return // Skip the rest of this function
        }

        // Continue with existing logic for when stores are found
        let storeCount = 0
        if (objectStores.includes("chats")) {
          console.log("🔧 Creating store: chats")
          stores.chats = createStore(DB_NAME, "chats")
          storeCount++
        }
        if (objectStores.includes("messages")) {
          console.log("🔧 Creating store: messages")
          stores.messages = createStore(DB_NAME, "messages")
          storeCount++
        }
        if (objectStores.includes("sync")) {
          console.log("🔧 Creating store: sync")
          stores.sync = createStore(DB_NAME, "sync")
          storeCount++
        }

        console.log(`📦 Created ${storeCount} stores`, Object.keys(stores))
        console.log("🏁 Setting storesReady flag to true")
        storesReady = true
        console.log("🔔 Resolving storesReadyPromise")
        storesReadyResolve()
        console.log("🔒 Closing database connection")
        openRequest.result.close()
      }

      openRequest.onerror = (event) => {
        console.error(
          "❌ Failed to open database for store creation:",
          event,
          openRequest.error
        )
        console.warn("⚠️ Resolving stores promise despite error")
        storesReady = true
        storesReadyResolve()
      }
    })
    .catch((error) => {
      console.error("❌ Database initialization failed:", error)
      console.warn("⚠️ Resolving stores promise despite initialization failure")
      storesReady = true
      storesReadyResolve()
    })
}

export async function ensureDbReady() {
  console.log("🔍 Ensuring database is ready")
  if (!isClient) {
    console.warn("⚠️ ensureDbReady: not client")
    return
  }

  if (dbInitPromise) {
    console.log("⏳ Waiting for database initialization")
    await dbInitPromise
    console.log("✅ Database initialization complete")
  } else {
    console.warn("⚠️ No database initialization promise found")
  }

  if (!storesReady) {
    console.log("⏳ Waiting for stores to be ready")
    await storesReadyPromise
    console.log("✅ Stores ready")
  } else {
    console.log("✅ Stores already ready")
  }

  console.log("🏁 Database and stores are ready")
}

export async function readFromIndexedDB<T>(
  table: "chats" | "messages" | "sync",
  key?: string
): Promise<T | T[]> {
  await ensureDbReady()
  console.log("✅ stores ready", Object.keys(stores))

  if (!isClient) {
    console.warn("readFromIndexedDB: not client")
    return key ? (null as any) : []
  }

  if (!stores[table]) {
    console.warn("readFromIndexedDB: store not initialized")
    return key ? (null as any) : []
  }

  try {
    const store = stores[table]
    if (key) {
      console.log(`🔍 Reading from ${table} cache with key "${key}"`)
      const result = await get<T>(key, store)
      console.log(
        `📦 Cache result for "${key}":`,
        result ? JSON.stringify(result).substring(0, 100) + "..." : "not found"
      )

      return result as T
    }

    console.log(`🔍 Reading all keys from ${table} cache`)
    const allKeys = await keys(store)
    console.log(`📦 Found ${allKeys.length} keys in ${table} cache:`, allKeys)

    if (allKeys.length > 0) {
      const results = await getMany<T>(allKeys as string[], store)
      console.log(
        `📦 Retrieved ${results.filter(Boolean).length} items from ${table} cache`
      )
      return results.filter(Boolean)
    }

    console.log(`📦 No items found in ${table} cache`)
    return []
  } catch (error) {
    console.warn(`📦 readFromIndexedDB failed (${table}):`, error)
    return key ? (null as any) : []
  }
}

export async function writeToIndexedDB<T extends { id: string | number }>(
  table: "chats" | "messages" | "sync",
  data: T | T[]
): Promise<void> {
  await ensureDbReady()

  if (!isClient) {
    console.warn("writeToIndexedDB: not client")
    return
  }

  if (!stores[table]) {
    console.warn("writeToIndexedDB: store not initialized")
    return
  }

  try {
    const store = stores[table]
    const entries: [IDBValidKey, T][] = Array.isArray(data)
      ? data.map((item) => [item.id, item])
      : [[data.id, data]]

    console.log(`💾 Writing to ${table} cache:`, entries.length, "items")
    await setMany(entries, store)
    console.log(`✅ Successfully wrote to ${table} cache`)
  } catch (error) {
    console.warn(`📦 writeToIndexedDB failed (${table}):`, error)
  }
}

export async function deleteFromIndexedDB(
  table: "chats" | "messages" | "sync",
  key?: string
): Promise<void> {
  await ensureDbReady()

  if (!isClient) {
    console.warn("deleteFromIndexedDB: not client")
    return
  }

  const store = stores[table]
  if (!store) {
    console.warn(`Store '${table}' not initialized.`)
    return
  }

  try {
    if (key) {
      await del(key, store)
    } else {
      const allKeys = await keys(store)
      await delMany(allKeys as string[], store)
    }
  } catch (error) {
    console.error(`Error deleting from IndexedDB store '${table}':`, error)
  }
}

export async function clearAllIndexedDBStores() {
  if (!isClient) {
    console.warn("clearAllIndexedDBStores: not client")
    return
  }

  await ensureDbReady()
  await deleteFromIndexedDB("chats")
  await deleteFromIndexedDB("messages")
  await deleteFromIndexedDB("sync")
}
