// Mapa: minimalisticky key-value pristup k IndexedDB (bez zavislosti).
// Slouzi k ulozeni privatnich klicu zarizeni - priznane riziko PWA
// (33 §1, 26 limit 4). Hodnoty se nikdy neserializuji do logu.
const DB_NAME = "minuta";
const STORE = "kv";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = run(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
    });
  } finally {
    db.close();
  }
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  return withStore("readonly", (s) => s.get(key) as IDBRequest<T | undefined>);
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  await withStore("readwrite", (s) => s.put(value, key));
}

export async function idbDelete(key: string): Promise<void> {
  await withStore("readwrite", (s) => s.delete(key));
}
