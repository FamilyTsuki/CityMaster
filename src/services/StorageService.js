/**
 * StorageService - Service de cache persistant haute performance basé sur IndexedDB.
 * Permet de stocker les GeoJSON des communes (parfois de plusieurs dizaines de Mo)
 * sans saturation du quota restreint de 5 Mo de localStorage.
 */
export class StorageService {
  static #DB_NAME = 'citymaster_storage';
  static #DB_VERSION = 1;
  static #STORE_CITIES = 'cached_cities';
  static #dbPromise = null;

  /**
   * Ouvre la base une seule fois, même si plusieurs appels arrivent en même temps.
   * @returns {Promise<IDBDatabase|null>}
   */
  static #getDB() {
    if (typeof indexedDB === 'undefined') {
      return Promise.resolve(null);
    }
    if (!this.#dbPromise) {
      this.#dbPromise = new Promise((resolve) => {
        try {
          const request = indexedDB.open(this.#DB_NAME, this.#DB_VERSION);

          request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(this.#STORE_CITIES)) {
              db.createObjectStore(this.#STORE_CITIES, { keyPath: 'key' });
            }
          };
          request.onsuccess = (event) => resolve(event.target.result);
          request.onerror = (err) => {
            console.warn('IndexedDB access error:', err);
            resolve(null);
          };
        } catch (err) {
          console.warn('IndexedDB initialization error:', err);
          resolve(null);
        }
      }).then((db) => {
        if (!db) this.#dbPromise = null;
        return db;
      });
    }
    return this.#dbPromise;
  }

  /**
   * Récupère les données GeoJSON d'une commune depuis le cache IndexedDB.
   * @param {string} cityKey
   * @returns {Promise<any|null>}
   */
  static async getCity(cityKey) {
    if (!cityKey) return null;
    const db = await this.#getDB();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction([this.#STORE_CITIES], 'readonly');
        const store = tx.objectStore(this.#STORE_CITIES);
        const req = store.get(cityKey);

        req.onsuccess = () => {
          const record = req.result;
          resolve(record ? record.data : null);
        };

        req.onerror = () => {
          resolve(null);
        };
      } catch (err) {
        console.warn(`Error reading city ${cityKey} from IndexedDB:`, err);
        resolve(null);
      }
    });
  }

  /**
   * Enregistre les données GeoJSON d'une commune avec ses métadonnées.
   * Les métadonnées déjà enregistrées sont conservées si `cityData` n'est pas fourni.
   * @param {string} cityKey
   * @param {any} data
   * @param {any} [cityData] Métadonnées affichées hors-ligne (nom, bbox, centre...).
   * @param {string|null} [etag] ETag HTTP du fichier, pour revalider le cache.
   * @returns {Promise<boolean>} true une fois la transaction terminée.
   */
  static async setCity(cityKey, data, cityData = null, etag = null) {
    if (!cityKey || !data) return false;
    const db = await this.#getDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction([this.#STORE_CITIES], 'readwrite');
        const store = tx.objectStore(this.#STORE_CITIES);
        const existingRequest = store.get(cityKey);

        existingRequest.onsuccess = () => {
          const existing = existingRequest.result || {};
          const resolvedCityData = cityData ||
            existing.cityData || {
              key: cityKey,
              name: cityKey.charAt(0).toUpperCase() + cityKey.slice(1),
            };
          store.put({
            key: cityKey,
            name: resolvedCityData.name || cityKey,
            cityData: resolvedCityData,
            data,
            etag: etag || null,
            updatedAt: Date.now(),
          });
        };

        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      } catch (err) {
        console.warn(`Error storing city ${cityKey} in IndexedDB:`, err);
        resolve(false);
      }
    });
  }

  /**
   * Récupère l'enregistrement complet d'une ville (données GeoJSON + métadonnées).
   * @param {string} cityKey
   * @returns {Promise<{ key: string, data: any, cityData: any, name: string }|null>}
   */
  static async getCityRecord(cityKey) {
    if (!cityKey) return null;
    const db = await this.#getDB();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction([this.#STORE_CITIES], 'readonly');
        const store = tx.objectStore(this.#STORE_CITIES);
        const req = store.get(cityKey);

        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (err) {
        console.warn(`Error reading city record ${cityKey} from IndexedDB:`, err);
        resolve(null);
      }
    });
  }

  /**
   * Retourne la liste de toutes les villes sauvegardées dans le cache IndexedDB.
   * @returns {Promise<Array<{ key: string, name: string, isOfflineCached: boolean }>>}
   */
  static async getAllCachedCities() {
    const db = await this.#getDB();
    if (!db) return [];

    return new Promise((resolve) => {
      try {
        const tx = db.transaction([this.#STORE_CITIES], 'readonly');
        const store = tx.objectStore(this.#STORE_CITIES);
        const req = store.getAll();

        req.onsuccess = () => {
          const records = req.result || [];
          const cities = records.map((r) => {
            const base = r.cityData || { key: r.key, name: r.name || r.key };
            return {
              ...base,
              key: r.key,
              name: base.name || r.name || r.key,
              isOfflineCached: true,
            };
          });
          resolve(cities);
        };
        req.onerror = () => resolve([]);
      } catch (err) {
        console.warn('Error fetching all cached cities:', err);
        resolve([]);
      }
    });
  }

  /**
   * Vérifie si une commune est présente dans le cache IndexedDB.
   * @param {string} cityKey
   * @returns {Promise<boolean>}
   */
  static async hasCity(cityKey) {
    const data = await this.getCity(cityKey);
    return data !== null;
  }

  /**
   * Supprime une commune du cache.
   * @param {string} cityKey
   * @returns {Promise<boolean>}
   */
  static async deleteCity(cityKey) {
    if (!cityKey) return false;
    const db = await this.#getDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction([this.#STORE_CITIES], 'readwrite');
        const store = tx.objectStore(this.#STORE_CITIES);
        const req = store.delete(cityKey);

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Vide l'intégralité du cache des communes stockées.
   * @returns {Promise<boolean>}
   */
  static async clear() {
    const db = await this.#getDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction([this.#STORE_CITIES], 'readwrite');
        const store = tx.objectStore(this.#STORE_CITIES);
        const req = store.clear();

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }
}

