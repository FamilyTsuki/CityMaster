import { I18nService } from "./I18nService.js";

/**
 * Service de gestion et de surveillance du statut réseau (en ligne / hors-ligne).
 * Gère les écouteurs natifs, met à jour la bannière globale et avertit les composants.
 */
export class NetworkService {
  static #instance = null;

  #isOnline = true;
  #listeners = new Set();
  #bannerElement = null;
  #bannerTextElement = null;
  #restoreTimeout = null;

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
   * Initialise les liaisons DOM avec la bannière réseau globale.
   * @param {HTMLElement} [bannerEl]
   * @param {HTMLElement} [bannerTextEl]
   */
  init(bannerEl = null, bannerTextEl = null) {
    if (typeof document === "undefined") return;

    this.#bannerElement =
      bannerEl || document.getElementById("offline-banner");
    this.#bannerTextElement =
      bannerTextEl || document.getElementById("offline-banner-text");

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

    if (this.#restoreTimeout) {
      clearTimeout(this.#restoreTimeout);
      this.#restoreTimeout = null;
    }

    if (!this.#isOnline) {
      document.body.classList.add("is-offline", "has-offline-banner");
      if (this.#bannerElement) {
        this.#bannerElement.classList.remove("hidden", "online-restored");
        this.#bannerElement.classList.add("active");
      }
      if (this.#bannerTextElement) {
        this.#bannerTextElement.textContent = I18nService.getInstance().t(
          "offline.banner_offline",
          {},
          "Mode hors-ligne : Connexion requise pour jouer et synchroniser.",
        );
      }
    } else {
      document.body.classList.remove("is-offline");
      if (this.#bannerElement && this.#bannerElement.classList.contains("active")) {
        document.body.classList.add("has-offline-banner");
        this.#bannerElement.classList.add("online-restored");
        if (this.#bannerTextElement) {
          this.#bannerTextElement.textContent = I18nService.getInstance().t(
            "offline.banner_online",
            {},
            "Connexion Internet rétablie !",
          );
        }
        this.#restoreTimeout = setTimeout(() => {
          document.body.classList.remove("has-offline-banner");
          if (this.#bannerElement) {
            this.#bannerElement.classList.remove("active", "online-restored");
            this.#bannerElement.classList.add("hidden");
          }
        }, 3000);
      } else {
        document.body.classList.remove("has-offline-banner");
        if (this.#bannerElement) {
          this.#bannerElement.classList.add("hidden");
        }
      }
    }
  }
}
