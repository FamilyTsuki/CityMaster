import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

/**
 * Accès aux fichiers JSON utilisés comme stockage (personnalisations admin,
 * comptes du mode local, villes découvertes...).
 *
 * - Les lectures distinguent « fichier absent » (valeur par défaut) et
 *   « fichier illisible » (erreur), pour ne jamais écraser un fichier corrompu
 *   avec des données vides.
 * - Les écritures passent par un fichier temporaire puis un renommage :
 *   un arrêt brutal ne laisse jamais un fichier à moitié écrit.
 * - Les mises à jour d'un même fichier sont exécutées l'une après l'autre,
 *   ce qui évite qu'une requête écrase les modifications d'une autre.
 */
const fileQueues = new Map();

function runExclusive(filePath, task) {
  const previous = fileQueues.get(filePath) || Promise.resolve();
  const run = previous.then(task, task);
  const tail = run.catch(() => {});
  fileQueues.set(filePath, tail);
  tail.then(() => {
    if (fileQueues.get(filePath) === tail) {
      fileQueues.delete(filePath);
    }
  });
  return run;
}

/**
 * Lit un fichier JSON.
 * @template T
 * @param {string} filePath
 * @param {T} fallback Valeur renvoyée (copiée) si le fichier n'existe pas ou est vide.
 * @returns {Promise<T>}
 */
export async function readJsonFile(filePath, fallback) {
  let content;
  try {
    content = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return structuredClone(fallback);
    throw error;
  }
  if (!content.trim()) return structuredClone(fallback);
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
  }
}

const DIRECTORY_NOT_WRITABLE = new Set(['EACCES', 'EPERM', 'EROFS']);
let directWriteWarned = false;

/** Suit un éventuel lien symbolique pour écrire dans le vrai fichier. */
async function resolveWriteTarget(filePath) {
  try {
    return await fs.realpath(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') return filePath;
    throw error;
  }
}

/**
 * Écrit un fichier JSON de façon atomique (fichier temporaire + renommage).
 * - Un lien symbolique est suivi : c'est le fichier pointé qui est remplacé.
 * - Les droits d'un fichier existant sont conservés.
 * - Si le serveur peut modifier le fichier mais pas créer de fichier dans son
 *   dossier, le fichier est réécrit directement (comme avant la v2.19.0).
 * @param {string} filePath
 * @param {unknown} data
 * @returns {Promise<void>}
 */
export async function writeJsonFile(filePath, data) {
  const content = JSON.stringify(data, null, 2);
  const target = await resolveWriteTarget(filePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const existingMode = await fs.stat(target).then(
    (stats) => stats.mode & 0o777,
    () => null,
  );

  const tmpPath = `${target}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  try {
    await fs.writeFile(tmpPath, content, { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    if (existingMode === null || !DIRECTORY_NOT_WRITABLE.has(error.code)) throw error;
    if (!directWriteWarned) {
      directWriteWarned = true;
      console.warn(
        `[jsonStore] Dossier ${path.dirname(target)} non modifiable par le serveur : ` +
          'écriture directe des fichiers JSON (non atomique).',
      );
    }
    await fs.writeFile(target, content, 'utf8');
    return;
  }

  try {
    if (existingMode !== null) await fs.chmod(tmpPath, existingMode);
    await fs.rename(tmpPath, target);
  } catch (error) {
    await fs.rm(tmpPath, { force: true });
    throw error;
  }
}

/**
 * Lit, modifie puis réécrit un fichier JSON sans qu'une autre mise à jour
 * du même fichier puisse s'intercaler.
 * Le `mutator` modifie l'objet reçu en place ; sa valeur de retour est renvoyée.
 * S'il lève une erreur, le fichier n'est pas modifié.
 * @template T, R
 * @param {string} filePath
 * @param {T} fallback
 * @param {(data: T) => R | Promise<R>} mutator
 * @returns {Promise<R>}
 */
export function updateJsonFile(filePath, fallback, mutator) {
  return runExclusive(filePath, async () => {
    const data = await readJsonFile(filePath, fallback);
    const result = await mutator(data);
    await writeJsonFile(filePath, data);
    return result;
  });
}

/**
 * Écrit un fichier JSON en respectant l'ordre des autres mises à jour du même fichier.
 * @param {string} filePath
 * @param {unknown} data
 * @returns {Promise<void>}
 */
export function replaceJsonFile(filePath, data) {
  return runExclusive(filePath, () => writeJsonFile(filePath, data));
}
