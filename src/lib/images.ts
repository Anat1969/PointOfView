// אחסון תמונות ב-IndexedDB: localStorage מוגבל לכ-5MB ולא מחזיק 99 תמונות
const DB = 'faces-images';
const STORE = 'blobs';

let dbPromise: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const t = d.transaction(STORE, mode);
        const r = fn(t.objectStore(STORE));
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      })
  );
}

const urls = new Map<string, string>();

export async function putImage(id: string, blob: Blob) {
  await tx('readwrite', (s) => s.put(blob, id));
  urls.set(id, URL.createObjectURL(blob));
}

export async function deleteImage(id: string) {
  await tx('readwrite', (s) => s.delete(id));
  const u = urls.get(id);
  if (u) URL.revokeObjectURL(u);
  urls.delete(id);
}

export async function loadImageUrls(ids: string[]): Promise<Map<string, string>> {
  await Promise.all(
    ids
      .filter((id) => !urls.has(id))
      .map(async (id) => {
        const blob = await tx<Blob | undefined>('readonly', (s) => s.get(id));
        if (blob) urls.set(id, URL.createObjectURL(blob));
      })
  );
  return urls;
}

export const imageUrl = (id: string) => urls.get(id);

export const ACCEPTED = ['image/jpeg', 'image/png'];
export const MAX_FILE_MB = 15;

/** מקטין את התמונה ל-1000 פיקסלים לכל היותר ושומר כ-JPEG */
export async function prepareImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', 0.86)
  );
}
