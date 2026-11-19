/**
 * Droits de la session courante, mis en cache par /api/profile. Ce cache sert
 * seulement à l'affichage : le serveur revérifie chaque droit à chaque appel.
 */
const MODERATOR_CITIES_KEY = 'moderator_cities';
const ROLE_KEY = 'role';
const ROLES = ['player', 'moderator', 'super_moderator', 'admin'];

export function isAdminSession() {
  return localStorage.getItem('is_admin') === 'true';
}

/**
 * @returns {Array<{key: string, name: string}>}
 */
export function getModeratorCities() {
  try {
    const cities = JSON.parse(localStorage.getItem(MODERATOR_CITIES_KEY) || '[]');
    return Array.isArray(cities) ? cities.filter((c) => c && typeof c.key === 'string') : [];
  } catch {
    return [];
  }
}

export function setModeratorCities(cities) {
  if (Array.isArray(cities) && cities.length > 0) {
    localStorage.setItem(MODERATOR_CITIES_KEY, JSON.stringify(cities));
  } else {
    localStorage.removeItem(MODERATOR_CITIES_KEY);
  }
}

/**
 * @returns {'player'|'moderator'|'super_moderator'|'admin'}
 */
export function getSessionRole() {
  if (isAdminSession()) return 'admin';
  const role = localStorage.getItem(ROLE_KEY);
  return ROLES.includes(role) ? role : 'player';
}

export function setSessionRole(role) {
  if (ROLES.includes(role) && role !== 'player') {
    localStorage.setItem(ROLE_KEY, role);
  } else {
    localStorage.removeItem(ROLE_KEY);
  }
}

/** L'éditeur de carte est ouvert aux administrateurs et aux modérateurs. */
export function canOpenEditor() {
  return isAdminSession() || getModeratorCities().length > 0;
}

export function canEditCity(cityKey) {
  if (!cityKey) return false;
  return isAdminSession() || getModeratorCities().some((c) => c.key === cityKey);
}

/** Validation de commune et relecture des propositions : admin, ou super-modérateur dans sa zone. */
export function canValidateCity(cityKey) {
  if (!cityKey) return false;
  if (isAdminSession()) return true;
  return getSessionRole() === 'super_moderator' && getModeratorCities().some((c) => c.key === cityKey);
}

export function canReviewProposals() {
  return isAdminSession() || getSessionRole() === 'super_moderator';
}

/** Un modérateur propose ; super-modérateur et administrateur appliquent directement. */
export function editsNeedReview() {
  return getSessionRole() === 'moderator';
}
