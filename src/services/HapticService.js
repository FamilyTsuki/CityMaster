/**
 * Service gérant le retour haptique (vibrations) sur les appareils compatibles (smartphones).
 * Utilise l'API standard navigator.vibrate avec détection de support et gestion de préférences utilisateur.
 */
export class HapticService {
  /**
   * Vérifie si le retour haptique est supporté par le navigateur
   * @returns {boolean}
   */
  static isSupported() {
    return typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function';
  }

  /**
   * Vérifie si le retour haptique est activé par l'utilisateur
   * @returns {boolean}
   */
  static isEnabled() {
    if (typeof localStorage === 'undefined') return true;
    return localStorage.getItem('haptic_enabled') !== 'false';
  }

  /**
   * Active ou désactive le retour haptique
   * @param {boolean} enabled
   */
  static setEnabled(enabled) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('haptic_enabled', enabled ? 'true' : 'false');
    }
  }

  /**
   * Bascule l'état d'activation du retour haptique
   * @returns {boolean}
   */
  static toggle() {
    const next = !this.isEnabled();
    this.setEnabled(next);
    return next;
  }

  /**
   * Déclenche une vibration selon le motif spécifié
   * @param {number|number[]} pattern
   * @returns {boolean}
   */
  static vibrate(pattern) {
    if (!this.isEnabled() || !this.isSupported()) return false;
    try {
      return navigator.vibrate(pattern);
    } catch {
      return false;
    }
  }

  /**
   * Micro-pulsation lors de la sélection / clic d'une rue sur la carte
   */
  static tap() {
    return this.vibrate(15);
  }

  /**
   * Vibration agréable pour une bonne réponse
   */
  static success() {
    return this.vibrate([35, 30, 45]);
  }

  /**
   * Vibration festive pour les combos (séries de victoires)
   * @param {number} multiplier
   */
  static combo(multiplier = 2) {
    if (multiplier >= 3) {
      return this.vibrate([40, 30, 40, 30, 75]);
    }
    return this.vibrate([40, 35, 55]);
  }

  /**
   * Double pulsation plus lourde en cas d'erreur ou de temps écoulé
   */
  static error() {
    return this.vibrate([70, 50, 90]);
  }

  /**
   * Avertissement court (ex: 3 dernières secondes au chrono)
   */
  static warning() {
    return this.vibrate(25);
  }
}

