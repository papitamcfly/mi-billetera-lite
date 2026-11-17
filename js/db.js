/**
 * db.js — Capa de persistencia con IndexedDB.
 * Los gastos se guardan sólo en el navegador (sin servidor externo).
 */
const BilleteraDB = (() => {
  const DB_NAME = 'mi-billetera-lite';
  const DB_VERSION = 1;
  const STORE = 'gastos';
  let dbPromise = null;

  function abrir() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      // Se ejecuta la primera vez o cuando cambia DB_VERSION
      req.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
          store.createIndex('fecha', 'fecha', { unique: false });
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  // Ejecuta una operación dentro de una transacción y resuelve con su resultado
  async function tx(modo, operacion) {
    const db = await abrir();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, modo);
      const store = t.objectStore(STORE);
      const req = operacion(store);
      t.oncomplete = () => resolve(req ? req.result : undefined);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  }

  return {
    /** Agrega un gasto y devuelve su id */
    agregar(gasto) {
      return tx('readwrite', (store) => store.add(gasto));
    },

    /** Devuelve todos los gastos, del más reciente al más antiguo */
    async obtenerTodos() {
      const gastos = await tx('readonly', (store) => store.index('fecha').getAll());
      return gastos.reverse();
    },

    /** Elimina un gasto por id */
    eliminar(id) {
      return tx('readwrite', (store) => store.delete(id));
    },

    /** Elimina todos los gastos */
    limpiar() {
      return tx('readwrite', (store) => store.clear());
    },
  };
})();
