// "The Rider PWA stores location updates and status changes locally in
// IndexedDB. Once connectivity returns, accumulated status events sync
// back to the backend in sequence."
//
// Minimal IndexedDB queue: enqueue() while offline, flush() replays
// everything through POST /deliveries/:id/sync once the browser reports
// it's back online (or on manual retry).

const DB_NAME = "reflex-offline";
const STORE = "queue";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "localId", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueue(deliveryId, type, payload) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add({
      deliveryId,
      type,
      payload,
      clientTimestamp: Date.now(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueueForDelivery(deliveryId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result.filter((e) => e.deliveryId === deliveryId));
    req.onerror = () => reject(req.error);
  });
}

export async function clearQueueForDelivery(deliveryId) {
  const db = await openDb();
  const items = await getQueueForDelivery(deliveryId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    items.forEach((item) => store.delete(item.localId));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function queueLength(deliveryId) {
  const items = await getQueueForDelivery(deliveryId);
  return items.length;
}
