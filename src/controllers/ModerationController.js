import { ApiService } from "../services/ApiService.js";
import { I18nService } from "../services/I18nService.js";
import { getModeratorCities, isAdminSession, setModeratorCities } from "../utils/roles.js";

const STATUS_KEYS = {
  pending: ["moderation.status_pending", "En attente"],
  approved: ["moderation.status_approved", "Acceptée"],
  rejected: ["moderation.status_rejected", "Refusée"],
  revoked: ["moderation.status_revoked", "Droits retirés"],
};

/**
 * Page « Modérer une commune » : dépôt d'une candidature et suivi de ses
 * candidatures. Les éléments sont lus au premier affichage, une fois les
 * gabarits d'écran insérés dans la page.
 */
export class ModerationController {
  #router = null;
  #bound = false;
  #selectedCity = null;
  #searchTimer = null;

  setRouter(router) {
    this.#router = router;
  }

  #el(id) {
    return document.getElementById(id);
  }

  #t(key, fallback, params = {}) {
    return I18nService.getInstance().t(key, params, fallback);
  }

  #isPlayerSession() {
    return Boolean(ApiService.getToken()) && localStorage.getItem("is_guest") !== "true";
  }

  async load() {
    this.#bindOnce();
    const loggedIn = this.#isPlayerSession();
    this.#el("moderation-guest")?.classList.toggle("hidden", loggedIn);
    this.#el("moderation-form")?.classList.toggle("hidden", !loggedIn);
    this.#el("moderation-mine")?.classList.add("hidden");
    this.#renderEditorAccess();
    if (loggedIn) await this.#loadMine();
  }

  #bindOnce() {
    if (this.#bound) return;
    this.#bound = true;

    this.#el("moderation-login-btn")?.addEventListener("click", () => this.#router?.navigate("/login"));
    this.#el("moderation-open-editor-btn")?.addEventListener("click", () => this.#router?.navigate("/admin"));
    this.#el("moderation-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.#submit();
    });

    const input = this.#el("moderation-city-input");
    const results = this.#el("moderation-city-results");
    if (!input || !results) return;

    input.addEventListener("input", () => {
      this.#selectedCity = null;
      clearTimeout(this.#searchTimer);
      const query = input.value.trim();
      if (!query) {
        results.classList.add("hidden");
        return;
      }
      this.#searchTimer = setTimeout(() => this.#searchCities(query), 300);
    });

    document.addEventListener("click", (e) => {
      if (!input.contains(e.target) && !results.contains(e.target)) {
        results.classList.add("hidden");
      }
    });
  }

  async #searchCities(query) {
    const results = this.#el("moderation-city-results");
    const res = await ApiService.get(`/cities?q=${encodeURIComponent(query)}`);
    if (!results) return;
    results.replaceChildren();
    const cities = res.ok && Array.isArray(res.data) ? res.data.slice(0, 8) : [];
    if (cities.length === 0) {
      results.classList.add("hidden");
      return;
    }
    cities.forEach((city) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      li.tabIndex = 0;
      li.textContent = city.name;
      const choose = () => {
        this.#selectedCity = { key: city.key, name: city.name };
        this.#el("moderation-city-input").value = city.name;
        results.classList.add("hidden");
      };
      li.addEventListener("click", choose);
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          choose();
        }
      });
      results.appendChild(li);
    });
    results.classList.remove("hidden");
  }

  #setMessage(text, isError = false) {
    const message = this.#el("moderation-form-message");
    if (!message) return;
    message.textContent = text;
    message.classList.toggle("is-error", isError);
  }

  async #submit() {
    if (!this.#selectedCity) {
      this.#setMessage(this.#t("moderation.error_city", "Choisissez une commune dans la liste"), true);
      return;
    }
    const button = this.#el("moderation-submit-btn");
    if (button) button.disabled = true;

    const res = await ApiService.post("/moderation/applications", {
      cityKey: this.#selectedCity.key,
      motivation: this.#el("moderation-motivation")?.value || "",
    });
    if (button) button.disabled = false;

    if (res.status === 409) {
      this.#setMessage(this.#t("moderation.error_duplicate", "Vous avez déjà une candidature pour cette commune"), true);
      return;
    }
    if (res.status === 429) {
      this.#setMessage(this.#t("moderation.error_limit", "Vous avez déjà 5 candidatures en attente"), true);
      return;
    }
    if (!res.ok) {
      this.#setMessage(this.#t("moderation.error_generic", "La candidature n'a pas pu être envoyée"), true);
      return;
    }

    this.#setMessage(
      this.#t("moderation.sent", "Candidature envoyée pour {city}", { city: this.#selectedCity.name }),
    );
    this.#selectedCity = null;
    this.#el("moderation-city-input").value = "";
    this.#el("moderation-motivation").value = "";
    await this.#loadMine();
  }

  async #loadMine() {
    const res = await ApiService.get("/moderation/applications/mine");
    if (!res.ok || !res.data) return;
    setModeratorCities(res.data.cities);
    this.#renderEditorAccess();

    const section = this.#el("moderation-mine");
    const list = this.#el("moderation-mine-list");
    const applications = Array.isArray(res.data.applications) ? res.data.applications : [];
    if (!section || !list) return;
    section.classList.toggle("hidden", applications.length === 0);
    list.replaceChildren();

    applications.forEach((application) => {
      const li = document.createElement("li");
      li.className = "moderation-mine-item";
      const city = document.createElement("span");
      city.textContent = application.city_name;
      const status = document.createElement("span");
      status.className = `moderation-status moderation-status-${application.status}`;
      const [key, fallback] = STATUS_KEYS[application.status] || [null, application.status];
      status.textContent = key ? this.#t(key, fallback) : fallback;
      li.append(city, status);
      list.appendChild(li);
    });
  }

  #renderEditorAccess() {
    const section = this.#el("moderation-editor-access");
    const cities = getModeratorCities();
    const hasAccess = isAdminSession() || cities.length > 0;
    section?.classList.toggle("hidden", !hasAccess);
    const label = this.#el("moderation-editor-cities");
    if (label) {
      label.textContent = isAdminSession()
        ? this.#t("moderation.editor_admin", "Administrateur : toutes les communes")
        : cities.map((c) => c.name).join(", ");
    }
  }
}
