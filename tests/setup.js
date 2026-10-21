import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Préchargé avant chaque fichier de test (voir le script "test" de package.json).
 *
 * Chaque fichier de test tourne dans son propre processus avec :
 * - des dossiers de données temporaires (jamais public/assets/data ni config/) ;
 * - PostgreSQL désactivé (mode local), même si le fichier .env pointe vers une base ;
 * - un secret JWT de test et aucune liste d'administrateurs d'environnement.
 */
const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), 'citymaster-test-'));
const dataDir = path.join(sandboxDir, 'data');
const stateDir = path.join(sandboxDir, 'state');
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(stateDir, { recursive: true });

process.env.CITYMASTER_DATA_DIR = dataDir;
process.env.CITYMASTER_STATE_DIR = stateDir;
process.env.DB_DISABLED = 'true';
process.env.JWT_SECRET = 'citymaster-test-secret';
process.env.ADMIN_USERS = '';
process.env.ADMINS = '';

/**
 * Stockage en mémoire équivalent au localStorage d'un navigateur, pour le code
 * client testé (I18nService, HapticService...). Sans lui, Node 25+ expose un
 * localStorage expérimental vide qui affiche un avertissement à chaque lecture.
 * Un test peut le remplacer : global.localStorage = { ... }.
 */
class MemoryStorage {
  #items = new Map();
  get length() {
    return this.#items.size;
  }
  key(index) {
    return [...this.#items.keys()][index] ?? null;
  }
  getItem(key) {
    return this.#items.has(String(key)) ? this.#items.get(String(key)) : null;
  }
  setItem(key, value) {
    this.#items.set(String(key), String(value));
  }
  removeItem(key) {
    this.#items.delete(String(key));
  }
  clear() {
    this.#items.clear();
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  writable: true,
  configurable: true,
  enumerable: true,
});

process.on('exit', () => {
  fs.rmSync(sandboxDir, { recursive: true, force: true });
});
