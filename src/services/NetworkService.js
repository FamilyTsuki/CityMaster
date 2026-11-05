import { I18nService } from "./I18nService.js";
import { FlashMessageService } from "./FlashMessageService.js";

const PROBE_URL = "/api/version";
const PROBE_INTERVAL_MS = 15000;
const PROBE_TIMEOUT_MS = 5000;

/**
 * Service de gestion et de surveillance du statut réseau (en ligne / hors-ligne).
 * L'appareil est considéré hors-ligne quand le navigateur le signale, mais aussi
 * quand le serveur ne répond plus (Wi-Fi sans Internet, réseau trop faible) ;
 * le serveur est alors interrogé régulièrement jusqu'à ce qu'il réponde.
 * Affiche un message flash et avertit les composants.
 */
export class NetworkService {
  static #instance = null;

  #isOnline = true;
  #browserOnline = true;
  #serverReachable = true;
  #listeners = new Set();
  #dismissOfflineFlash = null;
  #probeTimer = null;

  constructor() {
    if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
      this.#browserOnline = navigator.onLine;
    }
    this.#isOnline = this.#browserOnline;
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
   * Signale qu'une requête n'a pas pu joindre le serveur.
   */
  reportUnreachable() {
    if (!this.#serverReachable) return;
    this.#serverReachable = false;
    this.#updateStatus();
    this.#scheduleProbe();
  }

  /**
   * Signale qu'une requête a reçu une réponse du serveur.
   */
  reportReachable() {
    if (this.#serverReachable) return;
    this.#serverReachable = true;
    this.#stopProbe();
    this.#updateStatus();
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
      this.#browserOnline = true;
      if (this.#serverReachable) {
        this.#updateStatus();
      } else {
        this.#probe();
      }
    });

    window.addEventListener("offline", () => {
      this.#browserOnline = false;
      this.#updateStatus();
    });
  }

  #scheduleProbe() {
    if (typeof window === "undefined" || this.#probeTimer) return;
    this.#probeTimer = setInterval(() => this.#probe(), PROBE_INTERVAL_MS);
  }

  #stopProbe() {
    if (this.#probeTimer) {
      clearInterval(this.#probeTimer);
      this.#probeTimer = null;
    }
  }

  async #probe() {
    if (!this.#browserOnline || typeof fetch !== "function") return;
    try {
      // AbortSignal.timeout n'existe pas avant iOS 16 : sans lui, la sonde
      // échouerait toujours et le jeu resterait hors-ligne.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
      const res = await fetch(PROBE_URL, {
        cache: "no-store",
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));
      if (!res.headers.get("X-CityMaster-Offline")) {
        this.reportReachable();
      }
    } catch {
      // Toujours injoignable : nouvel essai au prochain intervalle.
    }
  }

  #updateStatus() {
    const online = this.#browserOnline && this.#serverReachable;
    if (online === this.#isOnline) return;
    this.#isOnline = online;
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
