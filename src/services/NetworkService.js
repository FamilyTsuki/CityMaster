import { I18nService } from "./I18nService.js";
import { FlashMessageService } from "./FlashMessageService.js";

/**
 * Service de gestion et de surveillance du statut réseau (en ligne / hors-ligne).
 * Gère les écouteurs natifs, affiche un message flash et avertit les composants.
 */
export class NetworkService {
  static #instance = null;

  #isOnline = true;
  #listeners = new Set();
  #dismissOfflineFlash = null;

  constructor() {
    if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
      this.#isOnline = navigator.onLine;
    } else {
      this.#isOnline = true;
    }
    this.#setupListeners();
  }

  /**
   * Retourne l'instance unique du NetworkService.
   * @returns {NetworkService}
   */
  static getInstance() {
    if (!this.#instance) {
      this.#instance = new NetworkService();
    }
    return this.#instance;
  }

  /**
   * Indique si l'appareil est actuellement connecté à Internet.
   * @returns {boolean}
   */
  isOnline() {
    return this.#isOnline;
  }

  /**
   * Affiche l'état réseau initial (message flash si l'appareil est hors-ligne).
   */
  init() {
    this.#renderState();
  }

  /**
   * S'abonne aux changements d'état réseau.
   * @param {(isOnline: boolean) => void} callback
   * @returns {() => void} Fonction de désinscription
   */
  onStatusChange(callback) {
    if (typeof callback === "function") {
      this.#listeners.add(callback);
    }
    return () => {
      this.#listeners.delete(callback);
    };
  }

  #setupListeners() {
    if (typeof window === "undefined") return;

    window.addEventListener("online", () => {
      this.#handleStatusChange(true);
    });

    window.addEventListener("offline", () => {
      this.#handleStatusChange(false);
    });
  }

  #handleStatusChange(online) {
    this.#isOnline = Boolean(online);
    this.#renderState();
    for (const callback of this.#listeners) {
      try {
        callback(this.#isOnline);
      } catch (err) {
        console.error("NetworkService listener error:", err);
      }
    }
  }

  #renderState() {
    if (typeof document === "undefined") return;

    const i18n = I18nService.getInstance();
    if (!this.#isOnline) {
      document.body.classList.add("is-offline");
      if (!this.#dismissOfflineFlash) {
        this.#dismissOfflineFlash = FlashMessageService.error(
          i18n.t(
            "offline.banner_offline",
            {},
            "Mode hors-ligne : Connexion requise pour jouer et synchroniser.",
          ),
          0,
        );
      }
      return;
    }

    document.body.classList.remove("is-offline");
    if (this.#dismissOfflineFlash) {
      this.#dismissOfflineFlash();
      this.#dismissOfflineFlash = null;
      FlashMessageService.success(
        i18n.t("offline.banner_online", {}, "Connexion Internet rétablie !"),
        3000,
      );
    }
  }
}
