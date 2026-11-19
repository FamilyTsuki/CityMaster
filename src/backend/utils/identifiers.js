/**
 * Comparaison et lecture des identifiants reçus ou stockés.
 */

/** Deux pseudos désignent le même compte (casse et espaces ignorés). */
export function sameUsername(a, b) {
  return (a || '').toLowerCase().trim() === (b || '').toLowerCase().trim();
}

/**
 * Identifiant numérique d'un paramètre de route.
 * @returns {number|null} null si ce n'est pas un entier strictement positif.
 */
export function parsePositiveId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}
