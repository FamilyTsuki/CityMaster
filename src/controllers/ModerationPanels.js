import { ApiService } from "../services/ApiService.js";
import { I18nService } from "../services/I18nService.js";
import { canReviewProposals, isAdminSession } from "../utils/roles.js";

const ROLE_KEYS = ["player", "moderator", "super_moderator", "admin"];
const DIFFICULTY_KEYS = { easy: "admin.diff_easy", medium: "admin.diff_medium", hard: "admin.diff_hard" };
const PREVIEW_TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const t = (key, fallback, params = {}) => I18nService.getInstance().t(key, params, fallback);

function el(tag, className = "", text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null && text !== undefined) node.textContent = text;
  return node;
}

function button(label, variant, onClick) {
  const btn = el("button", variant === "primary" ? "btn btn-small" : `btn btn-small ${variant}`, label);
  btn.type = "button";
  btn.addEventListener("click", onClick);
  return btn;
}

function formatDate(value) {
  const lang = I18nService.getInstance().currentLang === "en" ? "en-US" : "fr-FR";
  return new Date(value).toLocaleString(lang, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function roleLabel(role) {
  return t(`admin.role_${role}`, role);
}

function difficultyLabel(value) {
  return value ? t(DIFFICULTY_KEYS[value] || "", value) : t("admin.diff_auto", "Automatique");
}

/** Résumé lisible d'une modification : « Rue X : ajout ou modification ». */
function describeChange(record) {
  const types = {
    route: t("admin.item_route", "Rue"),
    district: t("admin.item_district", "Quartier"),
    difficulty: t("admin.item_difficulty", "Difficulté"),
  };
  const actions = {
    save: t("admin.action_save", "ajout ou modification"),
    delete: t("admin.action_delete", "suppression"),
  };
  if (record.item_type === "difficulty") {
    const before = difficultyLabel(record.before_state?.difficulty ?? null);
    const after = difficultyLabel(record.payload?.difficulty ?? null);
    return `${types.difficulty} · ${record.label} : ${before} → ${after}`;
  }
  return `${types[record.item_type] || record.item_type} · ${record.label} : ${actions[record.action] || record.action}`;
}

function metaLine(label, value) {
  const span = el("span");
  span.append(el("strong", "", label), `${value}`);
  return span;
}

/**
 * Écrans de modération du tableau de bord : propositions (avec aperçu avant /
 * après sur une carte), historique avec annulation, et gestion de l'équipe.
 */
export class ModerationPanels {
  #adminView;
  #showView;
  #previewMaps = new Map();
  #cityFeatures = new Map();

  /**
   * @param {object} adminView AdminView (showToast).
   * @param {(viewId: string) => void} showView Affiche une vue du tableau de bord.
   */
  constructor(adminView, showView) {
    this.#adminView = adminView;
    this.#showView = showView;
    this.#initEvents();
  }

  #initEvents() {
    const on = (id, event, handler) => document.getElementById(id)?.addEventListener(event, handler);
    on("admin-go-proposals-btn", "click", () => this.showProposals());
    on("admin-go-history-btn", "click", () => this.showHistory());
    on("admin-proposals-status-filter", "change", () => this.loadProposals());
    on("admin-refresh-proposals-btn", "click", () => this.loadProposals());
    on("admin-history-filters", "submit", (e) => {
      e.preventDefault();
      this.loadHistory();
    });
    on("admin-staff-form", "submit", (e) => {
      e.preventDefault();
      this.#addStaffMember();
    });
  }

  #toast(message, type = "error") {
    this.#adminView.showToast(message, type);
  }

  /** Badges et listes du tableau de bord. */
  refreshDashboard() {
    this.#loadProposalsBadge();
    if (isAdminSession()) this.loadStaff();
  }

  async #loadProposalsBadge() {
    const badge = document.getElementById("admin-pending-proposals-badge");
    if (!badge) return;
    const res = await ApiService.get("/edits/proposals?status=pending");
    const count = res.ok && Array.isArray(res.data) ? res.data.length : 0;
    badge.textContent = `${count}`;
    badge.classList.toggle("badge-has-pending", count > 0);
    badge.classList.toggle("badge-zero", count === 0);
  }

  // ---- Propositions ----------------------------------------------------

  showProposals() {
    this.#showView("admin-proposals-view");
    this.loadProposals();
  }

  async loadProposals() {
    const status = document.getElementById("admin-proposals-status-filter")?.value || "";
    const res = await ApiService.get(`/edits/proposals${status ? `?status=${encodeURIComponent(status)}` : ""}`);
    if (!res.ok || !Array.isArray(res.data)) {
      this.#toast(res.data?.error || t("admin.proposals_load_error", "Impossible de charger les propositions"));
      return;
    }
    this.#renderProposals(res.data);
    this.#loadProposalsBadge();
  }

  #renderProposals(proposals) {
    const grid = document.getElementById("admin-proposals-grid");
    const empty = document.getElementById("admin-proposals-empty");
    if (!grid) return;
    this.#clearPreviews();
    grid.replaceChildren();
    empty?.classList.toggle("hidden", proposals.length > 0);
    const me = (localStorage.getItem("username") || "").toLowerCase();

    proposals.forEach((proposal) => {
      const card = el("div", "report-card");
      const header = el("div", "report-card-header");
      header.append(
        el("span", "report-category-tag", proposal.city_key),
        el("span", `report-status-badge status-${proposal.status}`, t(`admin.proposal_${proposal.status}`, proposal.status)),
      );

      const meta = el("div", "report-meta-list");
      meta.append(
        metaLine(t("admin.date_label", "Date : "), formatDate(proposal.created_at)),
        metaLine(t("admin.author_label", "Auteur : "), proposal.author),
      );
      if (proposal.reviewer) meta.append(metaLine(t("admin.reviewer_label", "Relecteur : "), proposal.reviewer));
      if (proposal.report_id) meta.append(metaLine(t("admin.report_label", "Signalement : "), `#${proposal.report_id}`));

      const description = el("div", "report-description-text", describeChange(proposal));
      card.append(header, meta, description);
      if (proposal.reject_reason) {
        card.append(el("p", "proposal-reject-reason", `${t("admin.reject_reason_label", "Motif du refus : ")}${proposal.reject_reason}`));
      }

      const preview = el("div", "proposal-preview hidden");
      const actions = el("div", "report-card-actions");
      if (proposal.item_type !== "difficulty") {
        actions.append(button(t("admin.preview", "Aperçu"), "btn-secondary", () => this.#togglePreview(proposal, preview)));
      }
      const isOwn = proposal.author.toLowerCase() === me;
      if (proposal.status === "pending" && canReviewProposals() && (!isOwn || isAdminSession())) {
        actions.append(
          button(t("admin.application_approve", "Accepter"), "primary", () => this.#acceptProposal(proposal)),
          button(t("admin.application_reject", "Refuser"), "btn-secondary", () => this.#rejectProposal(proposal, card)),
        );
      }
      card.append(actions, preview);
      grid.appendChild(card);
    });
  }

  async #acceptProposal(proposal) {
    const res = await ApiService.post(`/edits/proposals/${proposal.id}/accept`);
    if (res.status === 409 && res.data?.code === "CONFLICT") {
      this.#toast(t("admin.proposal_conflict", "L'élément a changé depuis la proposition : refusez-la ou demandez une nouvelle proposition."));
      return;
    }
    if (!res.ok) {
      this.#toast(res.data?.error || t("admin.application_error", "Action impossible"));
      return;
    }
    this.#toast(t("admin.proposal_accepted_toast", "Proposition appliquée"), "success");
    this.loadProposals();
  }

  /** Le refus demande un motif, saisi dans la carte de la proposition. */
  #rejectProposal(proposal, card) {
    if (card.querySelector(".proposal-reject-form")) return;
    const form = el("form", "proposal-reject-form");
    const input = el("input", "input admin-input-small");
    input.required = true;
    input.maxLength = 1000;
    input.placeholder = t("admin.reject_reason_placeholder", "Motif du refus (visible par l'auteur)");
    input.setAttribute("aria-label", input.placeholder);
    const submit = el("button", "btn btn-small btn-secondary", t("admin.application_reject", "Refuser"));
    submit.type = "submit";
    form.append(input, submit);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const res = await ApiService.post(`/edits/proposals/${proposal.id}/reject`, { reason: input.value });
      if (!res.ok) {
        this.#toast(res.data?.error || t("admin.application_error", "Action impossible"));
        return;
      }
      this.loadProposals();
    });
    card.querySelector(".report-card-actions")?.after(form);
    input.focus();
  }

  // ---- Aperçu avant / après ---------------------------------------------

  #clearPreviews() {
    this.#previewMaps.forEach((map) => map.remove());
    this.#previewMaps.clear();
  }

  /** Élément d'origine de la ville (fichier généré), à défaut de version enregistrée. */
  async #baseFeature(cityKey, names) {
    if (!this.#cityFeatures.has(cityKey)) {
      const res = await ApiService.get(`/assets/data/${encodeURIComponent(cityKey)}.json`);
      this.#cityFeatures.set(cityKey, res.ok && Array.isArray(res.data?.features) ? res.data.features : []);
    }
    const wanted = names.filter(Boolean);
    return this.#cityFeatures.get(cityKey).find((f) => wanted.includes(f.properties?.name)) || null;
  }

  async #togglePreview(proposal, container) {
    if (!container.classList.contains("hidden")) {
      container.classList.add("hidden");
      return;
    }
    container.classList.remove("hidden");
    if (this.#previewMaps.has(proposal.id) || typeof L === "undefined") return;

    const proposed = proposal.action === "save" ? proposal.payload.feature : null;
    const storedBefore = proposal.before_state?.feature;
    const before =
      storedBefore && !storedBefore.properties?.isDeleted && storedBefore.geometry
        ? storedBefore
        : await this.#baseFeature(proposal.city_key, [
          proposal.payload.originalName,
          proposal.payload.feature?.properties?.name,
          proposal.payload.id,
        ]);

    const legend = el("div", "proposal-preview-legend");
    legend.append(
      el("span", "legend-before", t("admin.preview_before", "Avant")),
      el("span", "legend-after", proposal.action === "delete" ? t("admin.preview_deleted", "Supprimé") : t("admin.preview_after", "Après")),
    );
    const mapEl = el("div", "proposal-preview-map");
    container.replaceChildren(legend, mapEl);

    const map = L.map(mapEl, { zoomControl: true, attributionControl: false });
    L.tileLayer(PREVIEW_TILES, { maxZoom: 20, maxNativeZoom: 18 }).addTo(map);
    this.#previewMaps.set(proposal.id, map);

    const group = L.featureGroup().addTo(map);
    if (before?.geometry) {
      L.geoJSON(before, {
        style: { color: proposal.action === "delete" ? "#ef4444" : "#e5e7eb", weight: 6, opacity: 0.9, dashArray: "6 8", fillOpacity: 0.15 },
      }).addTo(group);
    }
    if (proposed?.geometry) {
      L.geoJSON(proposed, { style: { color: "#22c55e", weight: 5, opacity: 1, fillOpacity: 0.3 } }).addTo(group);
    }
    const bounds = group.getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { maxZoom: 18, padding: [24, 24] });
    else map.setView([46.6, 2.4], 5);
    setTimeout(() => map.invalidateSize(), 0);
  }

  // ---- Historique ---------------------------------------------------------

  showHistory() {
    this.#showView("admin-history-view");
    this.loadHistory();
  }

  async loadHistory() {
    const params = new URLSearchParams();
    const city = document.getElementById("admin-history-city")?.value.trim();
    const author = document.getElementById("admin-history-author")?.value.trim();
    if (city) params.set("cityKey", city.toLowerCase());
    if (author) params.set("author", author);
    const query = params.toString();
    const res = await ApiService.get(`/edits/history${query ? `?${query}` : ""}`);
    if (!res.ok || !Array.isArray(res.data)) {
      this.#toast(res.data?.error || t("admin.history_load_error", "Impossible de charger l'historique"));
      return;
    }
    this.#renderHistory(res.data);
  }

  #renderHistory(entries) {
    const grid = document.getElementById("admin-history-grid");
    const empty = document.getElementById("admin-history-empty");
    if (!grid) return;
    grid.replaceChildren();
    empty?.classList.toggle("hidden", entries.length > 0);

    entries.forEach((entry) => {
      const card = el("div", "report-card");
      const header = el("div", "report-card-header");
      header.append(el("span", "report-category-tag", entry.city_key));
      if (entry.undone_at) {
        header.append(el("span", "report-status-badge status-dismissed", t("admin.history_undone", "Annulée")));
      }
      const meta = el("div", "report-meta-list");
      meta.append(
        metaLine(t("admin.date_label", "Date : "), formatDate(entry.created_at)),
        metaLine(t("admin.author_label", "Auteur : "), entry.author),
      );
      if (entry.validator) meta.append(metaLine(t("admin.validator_label", "Validée par : "), entry.validator));
      if (entry.undone_at) {
        meta.append(metaLine(t("admin.undone_label", "Annulée par : "), `${entry.undone_by} (${formatDate(entry.undone_at)})`));
      }
      card.append(header, meta, el("div", "report-description-text", describeChange(entry)));

      if (!entry.undone_at) {
        const actions = el("div", "report-card-actions");
        actions.append(button(t("admin.undo", "Annuler"), "btn-secondary", () => this.#undo(entry, actions)));
        card.append(actions);
      }
      grid.appendChild(card);
    });
  }

  /**
   * Annule une modification. En cas de modification plus récente du même
   * élément, demande une seconde confirmation dans la carte.
   */
  async #undo(entry, actions, force = false) {
    const res = await ApiService.post(`/edits/history/${entry.id}/undo`, { force });
    if (res.status === 409 && res.data?.code === "CONFLICT") {
      const later = res.data.later || [];
      const warning = later.length
        ? t("admin.undo_conflict_later", "Modifié depuis par : {authors}. Annuler quand même ?", {
          authors: later.map((e) => e.author).join(", "),
        })
        : t("admin.undo_conflict_changed", "L'élément a changé depuis cette modification. Annuler quand même ?");
      actions.replaceChildren(
        el("p", "proposal-reject-reason", warning),
        button(t("admin.undo_force", "Annuler quand même"), "btn-delete-item", () => this.#undo(entry, actions, true)),
      );
      return;
    }
    if (!res.ok) {
      this.#toast(res.data?.error || t("admin.application_error", "Action impossible"));
      return;
    }
    this.#toast(t("admin.undo_done", "Modification annulée"), "success");
    this.loadHistory();
  }

  // ---- Équipe ---------------------------------------------------------------

  async loadStaff() {
    const list = document.getElementById("admin-staff-list");
    if (!list) return;
    const res = await ApiService.get("/moderation/staff");
    if (!res.ok || !Array.isArray(res.data)) return;
    list.replaceChildren();
    res.data.forEach((member) => list.appendChild(this.#staffRow(member)));
  }

  #staffRow(member) {
    const li = el("li", "admin-application admin-staff-member");
    const who = el("div", "admin-application-who");
    who.append(el("strong", "", member.username));

    const roleSelect = el("select", "input admin-input-small");
    roleSelect.setAttribute("aria-label", t("admin.staff_role_label", "Rôle"));
    ROLE_KEYS.forEach((role) => {
      const option = el("option", "", roleLabel(role));
      option.value = role;
      option.selected = role === member.role;
      roleSelect.appendChild(option);
    });
    roleSelect.addEventListener("change", () => this.#setRole(member.username, roleSelect.value));
    who.appendChild(roleSelect);

    const cities = el("div", "admin-staff-cities");
    if (member.role === "moderator" || member.role === "super_moderator") {
      member.cities.forEach((city) => {
        const chip = el("span", "admin-staff-city", city.name);
        const remove = el("button", "admin-staff-city-remove", "×");
        remove.type = "button";
        remove.setAttribute("aria-label", t("admin.staff_remove_city", "Retirer {city}", { city: city.name }));
        remove.addEventListener("click", () => this.#revokeCity(member.username, city.key));
        chip.appendChild(remove);
        cities.appendChild(chip);
      });
      const form = el("form", "admin-staff-city-form");
      const input = el("input", "input admin-input-small");
      input.placeholder = t("admin.staff_city_placeholder", "Clé de commune (ex. paris)");
      input.setAttribute("aria-label", input.placeholder);
      input.required = true;
      const add = el("button", "btn btn-small btn-secondary", t("admin.staff_add_city", "Ajouter la commune"));
      add.type = "submit";
      form.append(input, add);
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.#grantCity(member.username, input.value.trim().toLowerCase());
      });
      cities.appendChild(form);
    }
    li.append(who, cities);
    return li;
  }

  async #staffRequest(request) {
    const res = await request;
    if (!res.ok) {
      this.#toast(res.data?.error || t("admin.application_error", "Action impossible"));
      return false;
    }
    this.loadStaff();
    return true;
  }

  #setRole(username, role) {
    return this.#staffRequest(ApiService.patch(`/moderation/staff/${encodeURIComponent(username)}/role`, { role }));
  }

  #grantCity(username, cityKey) {
    return this.#staffRequest(ApiService.post(`/moderation/staff/${encodeURIComponent(username)}/cities`, { cityKey }));
  }

  #revokeCity(username, cityKey) {
    return this.#staffRequest(
      ApiService.delete(`/moderation/staff/${encodeURIComponent(username)}/cities/${encodeURIComponent(cityKey)}`),
    );
  }

  async #addStaffMember() {
    const username = document.getElementById("admin-staff-username")?.value.trim();
    const role = document.getElementById("admin-staff-role")?.value;
    if (!username || !role) return;
    if (await this.#setRole(username, role)) {
      document.getElementById("admin-staff-username").value = "";
    }
  }
}
