/**
 * StorageService - Service de cache persistant haute performance basé sur IndexedDB.
 * Permet de stocker les GeoJSON des communes (parfois de plusieurs dizaines de Mo)
 * sans saturation du quota restreint de 5 Mo de localStorage.
 */
export class StorageService {
  static #DB_NAME = 'citymaster_storage';
  static #DB_VERSION = 1;
  static #STORE_CITIES = 'cached_cities';
  static #dbInstance = null;

  static async #getDB() {
    if (typeof indexedDB === 'undefined') {
      return null;
    }

    if (this.#dbInstance) {
      return this.#dbInstance;
    }

    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(this.#DB_NAME, this.#DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(this.#STORE_CITIES)) {
            db.createObjectStore(this.#STORE_CITIES, { keyPath: 'key' });
          }
        };

        request.onsuccess = (event) => {
          this.#dbInstance = event.target.result;
          resolve(this.#dbInstance);
        };

        request.onerror = (err) => {
          console.warn('IndexedDB access error:', err);
          resolve(null);
        };
      } catch (err) {
        console.warn('IndexedDB initialization error:', err);
        resolve(null);
      }
    });
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
   * Enregistre les données GeoJSON d'une commune dans IndexedDB avec ses métadonnées.
   * @param {string} cityKey
   * @param {any} data
   * @param {any} [cityData]
   * @returns {Promise<boolean>}
   */
  static async setCity(cityKey, data, cityData = null) {
    if (!cityKey || !data) return false;
    const db = await this.#getDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction([this.#STORE_CITIES], 'readwrite');
        const store = tx.objectStore(this.#STORE_CITIES);
        const resolvedCityData = cityData || {
          key: cityKey,
          name: cityKey.charAt(0).toUpperCase() + cityKey.slice(1),
        };
        const req = store.put({
          key: cityKey,
          name: resolvedCityData.name || cityKey,
          cityData: resolvedCityData,
          data,
          updatedAt: Date.now(),
        });

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
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

