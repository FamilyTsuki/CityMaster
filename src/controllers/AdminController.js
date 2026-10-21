import { ApiService } from "../services/ApiService.js";
import { escapeHTML } from "../utils/security.js";
import { I18nService } from "../services/I18nService.js";
import { RouteDifficultyService } from "../services/RouteDifficultyService.js";
import { mergeCityStreets } from "../services/SpatialService.js";

export class AdminController {
  #adminView;
  #router;
  #selectedCity;
  #currentDistricts;
  #currentRoutes;
  #difficultyMode;
  #disablePlaces;
  #routeFilterQuery;
  #routeDifficultyFilter;
  #routeDifficultyOverrides;
  #reportsSearchQuery;

  constructor(adminView, router = null) {
    this.#adminView = adminView;
    this.#router = router;
    this.#selectedCity = null;
    this.#currentDistricts = [];
    this.#currentRoutes = [];
    this.#difficultyMode = "length";
    this.#disablePlaces = false;
    this.#routeFilterQuery = "";
    this.#routeDifficultyFilter = "all";
    this.#routeDifficultyOverrides = {};
    this.#reportsSearchQuery = "";

    this.#initEvents();
  }

  setRouter(router) {
    this.#router = router;
  }

  #initEvents() {
    const goDistrictsBtn = document.getElementById("admin-go-districts-btn");
    const goRoutesBtn = document.getElementById("admin-go-routes-btn");
    const goReportsBtn = document.getElementById("admin-go-reports-btn");

    if (goDistrictsBtn) {
      goDistrictsBtn.addEventListener("click", () => {
        this.#adminView.setEditMode("district");
        this.showDistricts();
      });
    }
    if (goRoutesBtn) {
      goRoutesBtn.addEventListener("click", () => {
        this.#adminView.setEditMode("route");
        this.showRoutes();
      });
    }
    if (goReportsBtn) {
      goReportsBtn.addEventListener("click", () => {
        this.showReports();
      });
    }

    const adminBackBtn = document.getElementById("admin-back-btn");
    if (adminBackBtn) {
      adminBackBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (this.#router) {
          this.#router.navigate("/setup");
        } else {
          window.location.href = "/#/setup";
        }
      });
    }

    const districtsBackBtn = document.getElementById(
      "admin-districts-back-btn",
    );
    const routesBackBtn = document.getElementById("admin-routes-back-btn");
    const reportsBackBtn = document.getElementById("admin-reports-back-btn");

    if (districtsBackBtn) {
      districtsBackBtn.addEventListener("click", () => {
        this.showDashboard();
      });
    }
    if (routesBackBtn) {
      routesBackBtn.addEventListener("click", () => {
        this.showDashboard();
      });
    }
    if (reportsBackBtn) {
      reportsBackBtn.addEventListener("click", () => {
        this.showDashboard();
      });
    }

    const statusFilterSelect = document.getElementById(
      "admin-reports-status-filter",
    );
    if (statusFilterSelect) {
      statusFilterSelect.addEventListener("change", () => {
        this.loadReports();
      });
    }

    const reportsSearch = document.getElementById("admin-reports-search");
    if (reportsSearch) {
      reportsSearch.addEventListener("input", (e) => {
        this.#reportsSearchQuery = e.target.value.toLowerCase().trim();
        this.loadReports();
      });
    }

    const refreshReportsBtn = document.getElementById(
      "admin-refresh-reports-btn",
    );
    if (refreshReportsBtn) {
      refreshReportsBtn.addEventListener("click", () => {
        this.loadReports();
      });
    }

    const cityInput = document.getElementById("admin-city-search");
    const cityDropdown = document.getElementById("admin-city-dropdown");
    const cityInputRoutes = document.getElementById("admin-city-search-routes");
    const cityDropdownRoutes = document.getElementById(
      "admin-city-dropdown-routes",
    );

    const setupCitySearch = (input, dropdown) => {
      if (!input || !dropdown) return;
      const lastCityRaw = localStorage.getItem("citymaster_last_city");
      if (lastCityRaw && !input.value) {
        try {
          const lastCity = JSON.parse(lastCityRaw);
          input.value = lastCity.name;
        } catch (e) {}
      }

      let debounceTimer = null;
      const citySearchCache = new Map();

      const searchCities = async (query = "") => {
        const cleanQuery = query.trim().toLowerCase();
        if (citySearchCache.has(cleanQuery)) {
          return citySearchCache.get(cleanQuery);
        }
        const loader = input.parentElement.querySelector('.search-loader');
        if (loader && query.length > 0) loader.classList.add("active");
        try {
          const res = await ApiService.get(
            `/cities?q=${encodeURIComponent(query)}`,
          );
          if (loader) loader.classList.remove("active");
          if (!res.ok || !Array.isArray(res.data)) return [];
          citySearchCache.set(cleanQuery, res.data);
          return res.data;
        } catch (e) {
          if (loader) loader.classList.remove("active");
          return [];
        }
      };

      const renderCityMatches = (cities) => {
        dropdown.replaceChildren();
        if (!cities || cities.length === 0) {
          dropdown.classList.add("hidden");
          return;
        }

        cities.forEach((city) => {
          const li = document.createElement("li");
          li.className = "dropdown-item";
          if (city.isVerified) {
            li.classList.add("city-option-verified");
          }
          const strong = document.createElement("strong");
          strong.textContent = city.name || "";
          li.appendChild(strong);

          if (city.isVerified) {
            const badge = document.createElement("span");
            badge.className = "city-verified-badge";
            badge.textContent = "✓ Validée";
            li.appendChild(badge);
          }

          li.addEventListener("click", async () => {
            input.value = city.name;
            dropdown.classList.add("hidden");
            await this.selectCity(city);
          });
          dropdown.appendChild(li);
        });

        dropdown.classList.remove("hidden");
      };

      input.addEventListener("focus", async () => {
        const cities = await searchCities(input.value.trim());
        renderCityMatches(cities);
      });

      input.addEventListener("input", () => {
        const loader = input.parentElement.querySelector('.search-loader');
        if (loader && input.value.trim().length > 0) loader.classList.add("active");
        
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          const cities = await searchCities(input.value.trim());
          renderCityMatches(cities);
        }, 400);
      });
    };

    setupCitySearch(cityInput, cityDropdown);
    setupCitySearch(cityInputRoutes, cityDropdownRoutes);

    const verifyBtn = document.getElementById("admin-city-verify-btn");
    if (verifyBtn) {
      verifyBtn.addEventListener("click", async () => {
        if (!this.#selectedCity) return;
        try {
          const res = await ApiService.patch(
            `/cities/${encodeURIComponent(this.#selectedCity.key)}/verify`,
          );

          if (res.ok && res.data) {
            const updatedCity = res.data;
            this.#selectedCity.isVerified = updatedCity.isVerified;
            localStorage.setItem(
              "citymaster_last_city",
              JSON.stringify(this.#selectedCity),
            );
            this.updateVerifyButtonState();
            this.#adminView.showToast(
              updatedCity.isVerified
                ? I18nService.getInstance().t(
                    "admin.city_verified_success",
                    {},
                    "✓ Commune marquée comme validée avec succès !",
                  )
                : I18nService.getInstance().t(
                    "admin.city_verification_removed",
                    {},
                    "Validation retirée pour cette commune.",
                  ),
              updatedCity.isVerified ? "success" : "error",
            );
          }
        } catch (err) {
          console.error("Failed to toggle city verification", err);
        }
      });
    }

    const addBtn = document.getElementById("admin-add-district-btn");
    const saveBtn = document.getElementById("admin-save-district-btn");
    const cancelBtn = document.getElementById("admin-cancel-district-btn");
    const districtList = document.getElementById("admin-district-list");

    if (addBtn) {
      addBtn.addEventListener("click", () => {
        if (!this.#selectedCity) {
          this.#adminView.showToast(
            I18nService.getInstance().t(
              "admin.select_city_first",
              {},
              "Veuillez d'abord sélectionner une commune.",
            ),
          );
          return;
        }
        this.#adminView.startEditingDistrict(null);
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        this.#adminView.clearActiveDrawing();
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        if (!this.#selectedCity) return;
        const payload = this.#adminView.getActiveDistrictPayload();
        if (!payload) {
          this.#adminView.showToast(
            I18nService.getInstance().t(
              "admin.district_draw_error",
              {},
              "Veuillez saisir un nom et placer au moins 3 points sur la carte.",
            ),
          );
          return;
        }
        await this.#saveDistrict(payload);
      });
    }

    if (districtList) {
      districtList.addEventListener("click", (e) => {
        const editBtn = e.target.closest(".btn-edit-district");
        const deleteBtn = e.target.closest(".btn-delete-district");
        const districtItem = e.target.closest(".route-list-item");

        if (editBtn) {
          const id = editBtn.dataset.id;
          const name = editBtn.dataset.name;
          const district = this.#currentDistricts.find(
            (d) =>
              (d.properties?.id !== undefined && String(d.properties.id) === String(id)) ||
              (d.id !== undefined && String(d.id) === String(id)) ||
              (d.properties?.name && (d.properties.name === name || d.properties.name === id)) ||
              (d.properties?.originalName && (d.properties.originalName === name || d.properties.originalName === id)),
          );
          if (district) {
            this.#adminView.startEditingDistrict(district);
          }
        } else if (deleteBtn) {
          const id = deleteBtn.dataset.id;
          const name = deleteBtn.dataset.name;
          if (id || name) {
            this.#deleteDistrict(id || name);
          }
        } else if (districtItem) {
          const name = districtItem.dataset.name;
          const district = this.#currentDistricts.find(
            (d) => d.properties.name === name,
          );
          if (district) {
            districtList
              .querySelectorAll(".route-list-item")
              .forEach((item) => item.classList.remove("selected"));
            districtItem.classList.add("selected");
            this.#adminView.highlightDistrict(district);
          }
        }
      });
    }

    const addRouteBtn = document.getElementById("admin-add-route-btn");
    const saveRouteBtn = document.getElementById("admin-save-route-btn");
    const cancelRouteBtn = document.getElementById("admin-cancel-route-btn");
    const routeList = document.getElementById("admin-route-list");

    if (addRouteBtn) {
      addRouteBtn.addEventListener("click", () => {
        if (!this.#selectedCity) {
          this.#adminView.showToast(
            "Veuillez d'abord sélectionner une commune.",
          );
          return;
        }
        this.#adminView.startEditingRoute(null);
      });
    }

    if (cancelRouteBtn) {
      cancelRouteBtn.addEventListener("click", () => {
        this.#adminView.clearActiveRouteDrawing();
      });
    }

    if (saveRouteBtn) {
      saveRouteBtn.addEventListener("click", async () => {
        if (!this.#selectedCity) return;
        const payload = this.#adminView.getActiveRoutePayload();
        if (!payload) {
          this.#adminView.showToast(
            "Veuillez saisir un nom et placer au moins 2 points sur la carte.",
          );
          return;
        }
        await this.#saveRoute(payload);
      });
    }

    const addSegmentBtn = document.getElementById(
      "admin-add-route-segment-btn",
    );
    if (addSegmentBtn) {
      addSegmentBtn.addEventListener("click", () => {
        this.#adminView.addNewRouteSegment();
      });
    }

    const toggleLabelsBtn = document.getElementById(
      "admin-toggle-route-labels-btn",
    );
    if (toggleLabelsBtn) {
      toggleLabelsBtn.addEventListener("click", () => {
        this.#adminView.toggleRouteLabels();
      });
    }

    if (routeList) {
      routeList.addEventListener("click", (e) => {
        const editBtn = e.target.closest(".btn-edit-route");
        const deleteBtn = e.target.closest(".btn-delete-route");
        const routeItem = e.target.closest(".route-list-item");

        if (editBtn) {
          const id = editBtn.dataset.id;
          const name = editBtn.dataset.name;
          const route = this.#currentRoutes.find(
            (r) =>
              (r.properties?.id !== undefined && String(r.properties.id) === String(id)) ||
              (r.id !== undefined && String(r.id) === String(id)) ||
              (r.properties?.name && (r.properties.name === name || r.properties.name === id)) ||
              (r.properties?.originalName && (r.properties.originalName === name || r.properties.originalName === id)),
          );
          if (route) {
            const nameLower = (route.properties?.name || "")
              .toLowerCase()
              .trim();
            const origNameLower = (route.properties?.originalName || "")
              .toLowerCase()
              .trim();
            const currentDiff =
              this.#routeDifficultyOverrides[nameLower] ||
              (origNameLower &&
                this.#routeDifficultyOverrides[origNameLower]) ||
              route.properties?.difficulty ||
              "auto";
            this.#adminView.startEditingRoute(route, currentDiff);
          }
        } else if (deleteBtn) {
          const id = deleteBtn.dataset.id;
          const name = deleteBtn.dataset.name;
          if (id || name) {
            this.#deleteRoute(id || name);
          }
        } else if (routeItem) {
          const name = routeItem.dataset.name;
          const route = this.#currentRoutes.find(
            (r) => r.properties.name === name,
          );
          if (route) {
            routeList
              .querySelectorAll(".route-list-item")
              .forEach((item) => item.classList.remove("selected"));
            routeItem.classList.add("selected");
            this.#adminView.highlightRoute(route);
          }
        }
      });
    }

    const difficultySelect = document.getElementById(
      "admin-difficulty-mode-select",
    );
    if (difficultySelect) {
      difficultySelect.addEventListener("change", async (e) => {
        const mode = e.target.value;
        this.#difficultyMode = mode;
        await this.#saveSetting("difficulty_mode", mode);
        this.#renderRouteList();
      });
    }

    const disablePlacesSelect = document.getElementById(
      "admin-disable-places-select",
    );
    if (disablePlacesSelect) {
      disablePlacesSelect.addEventListener("change", async (e) => {
        const disabled = e.target.value === "true";
        this.#disablePlaces = disabled;
        localStorage.setItem("citymaster_disable_places", String(disabled));
        await this.#saveSetting("disable_places", String(disabled));
        this.#renderRouteList();
      });
    }

    const routeFilter = document.getElementById("admin-route-filter");
    if (routeFilter) {
      routeFilter.addEventListener("input", (e) => {
        this.#routeFilterQuery = e.target.value.toLowerCase().trim();
        this.#renderRouteList();
      });
    }

    const filterTabs = document.querySelectorAll(
      ".admin-route-filter-tabs .btn-filter-tab",
    );
    filterTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        filterTabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        this.#routeDifficultyFilter = tab.dataset.filter || "all";
        this.#renderRouteList();
      });
    });

    this.#adminView.onRouteMapClick = (feature, layer, e) => {
      const name = feature?.properties?.name;
      if (!name) return;
      const nameLower = name.toLowerCase().trim();
      const isManual = Boolean(
        this.#routeDifficultyOverrides &&
        this.#routeDifficultyOverrides[nameLower],
      );
      const currentDiff =
        feature._difficulty ||
        (this.#routeDifficultyOverrides &&
          this.#routeDifficultyOverrides[nameLower]) ||
        this.#getRouteDifficulty(feature);
      const diffLabels = { easy: "Facile", medium: "Moyen", hard: "Difficile" };
      const diffLabel = diffLabels[currentDiff] || currentDiff;

      const popupContent = document.createElement("div");
      popupContent.className = "admin-route-popup";
      popupContent.innerHTML = `
        <h4>${escapeHTML(name)}</h4>
        <div class="admin-route-popup-diff">
          <span>Difficulté :</span>
          <strong class="diff-tag diff-${escapeHTML(currentDiff)}">${escapeHTML(diffLabel)}</strong>
          ${isManual ? '<span class="badge-manual-diff">Manuel</span>' : ""}
        </div>
        <div class="admin-popup-actions">
          <button type="button" class="btn-popup-diff diff-easy" data-diff="easy">Facile</button>
          <button type="button" class="btn-popup-diff diff-medium" data-diff="medium">Moyen</button>
          <button type="button" class="btn-popup-diff diff-hard" data-diff="hard">Difficile</button>
          <button type="button" class="btn-popup-diff diff-auto" data-diff="auto">Auto</button>
          <button type="button" class="btn-popup-diff btn-popup-edit">✏️ Éditer</button>
        </div>
      `;

      popupContent.querySelectorAll(".btn-popup-diff:not(.btn-popup-edit)").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const diff = btn.dataset.diff;
          await this.setRouteDifficulty(name, diff);
          if (layer && layer.closePopup) layer.closePopup();
        });
      });

      const editPopupBtn = popupContent.querySelector(".btn-popup-edit");
      if (editPopupBtn) {
        editPopupBtn.addEventListener("click", () => {
          if (layer && layer.closePopup) layer.closePopup();
          this.#adminView.startEditingRoute(feature, currentDiff);
        });
      }

      if (layer && layer.bindPopup) {
        layer.bindPopup(popupContent).openPopup(e ? e.latlng : undefined);
      }
    };
  }

  async #loadSettings() {
    if (localStorage.getItem("is_admin") !== "true") return;
    try {
      const res = await ApiService.get("/admin/settings");
      if (res.ok && res.data) {
        const settings = res.data;
        if (settings.difficulty_mode) {
          this.#difficultyMode = settings.difficulty_mode;
        }
        const select = document.getElementById("admin-difficulty-mode-select");
        if (select) {
          select.value = this.#difficultyMode;
        }
        if (settings.disable_places !== undefined) {
          this.#disablePlaces = String(settings.disable_places) === "true";
          localStorage.setItem(
            "citymaster_disable_places",
            String(this.#disablePlaces),
          );
        }
        const disablePlacesSelect = document.getElementById(
          "admin-disable-places-select",
        );
        if (disablePlacesSelect) {
          disablePlacesSelect.value = this.#disablePlaces ? "true" : "false";
        }
        const modeTextEl = document.getElementById("admin-route-mode-text");
        if (modeTextEl) {
          const modeLabels = {
            length: "Longueur",
            nomenclature: "Nomenclature",
            center: "Centre-ville",
          };
          modeTextEl.textContent =
            modeLabels[this.#difficultyMode] || this.#difficultyMode;
        }
      }
    } catch (e) {
      console.error("Failed to load settings", e);
    }
  }

  async #saveSetting(key, value) {
    const res = await ApiService.post("/admin/settings", { key, value });
    if (!res.ok) {
      console.error("Failed to save setting", key, res.status, res.data?.error);
      this.#adminView.showToast(
        res.data?.error || "Le réglage n'a pas pu être enregistré",
        "error",
      );
    }
    return res.ok;
  }

  updateVerifyButtonState() {
    const verifyBtn = document.getElementById("admin-city-verify-btn");
    if (!verifyBtn) return;

    if (!this.#selectedCity) {
      verifyBtn.classList.add("hidden");
      return;
    }

    verifyBtn.classList.remove("hidden");
    if (this.#selectedCity.isVerified) {
      verifyBtn.classList.add("verified");
      verifyBtn.title = I18nService.getInstance().t(
        "admin.unvalidate_city_title",
        {},
        "Commune validée. Cliquer pour retirer la validation",
      );
    } else {
      verifyBtn.classList.remove("verified");
      verifyBtn.title = I18nService.getInstance().t(
        "admin.validate_city_title",
        {},
        "Cliquer pour valider la qualité des rues de cette commune",
      );
    }
  }

  async selectCity(city) {
    this.#selectedCity = city;
    localStorage.setItem("citymaster_last_city", JSON.stringify(city));
    this.updateVerifyButtonState();

    this.#adminView.initMap();
    if (city.center) {
      this.#adminView.setMapCenter(city.center[0], city.center[1], 14);
    }

    await this.loadDistricts();
    await this.loadRoutes();
  }

  async loadDistricts() {
    if (!this.#selectedCity || localStorage.getItem("is_admin") !== "true")
      return;
    try {
      const defaultRes = await ApiService.get(
        `/assets/data/${this.#selectedCity.key}.json`,
      );
      let defaultDistricts = [];
      if (defaultRes.ok && defaultRes.data?.features) {
        defaultDistricts = defaultRes.data.features.filter(
          (f) =>
            f.properties &&
            f.properties.isLotissement &&
            (f.geometry.type === "Polygon" ||
              f.geometry.type === "MultiPolygon"),
        );
      }

      const { ok, data: customDistricts } = await ApiService.get(
        `/admin/districts?cityKey=${encodeURIComponent(this.#selectedCity.key)}`,
      );

      this.#currentDistricts = mergeCityStreets(
        defaultDistricts,
        ok && Array.isArray(customDistricts) ? customDistricts : [],
        [],
      );

      this.#adminView.renderSavedDistricts(this.#currentDistricts);
      this.#renderDistrictList();
    } catch (e) {
      console.error("Failed to load districts for admin", e);
    }
  }

  #renderDistrictList() {
    this.#adminView.renderDistrictList(this.#currentDistricts);
  }

  async loadRoutes() {
    if (!this.#selectedCity || localStorage.getItem("is_admin") !== "true")
      return;
    try {
      const defaultRes = await ApiService.get(
        `/assets/data/${this.#selectedCity.key}.json`,
      );
      let defaultStreets = [];
      if (defaultRes.ok && defaultRes.data?.features) {
        defaultStreets = defaultRes.data.features.filter(
          (f) => !f.properties.isLotissement,
        );
      }

      const { ok, data: customRoutes } = await ApiService.get(
        `/admin/routes?cityKey=${encodeURIComponent(this.#selectedCity.key)}`,
      );

      this.#currentRoutes = mergeCityStreets(
        defaultStreets,
        [],
        ok && Array.isArray(customRoutes) ? customRoutes : [],
      );

      await this.#loadRouteDifficultyOverrides();
      this.#adminView.renderSavedRoutes(this.#currentRoutes);
      this.#renderRouteList();
    } catch (e) {
      console.error("Failed to load routes for admin", e);
    }
  }

  async #loadRouteDifficultyOverrides() {
    if (!this.#selectedCity) return;
    try {
      const res = await ApiService.get(
        `/admin/routes/difficulties?cityKey=${encodeURIComponent(this.#selectedCity.key)}`,
      );
      this.#routeDifficultyOverrides = res.ok && res.data ? res.data : {};
    } catch (e) {
      console.error("Failed to load difficulty overrides", e);
      this.#routeDifficultyOverrides = {};
    }
  }

  async setRouteDifficulty(streetName, difficulty, showToast = true) {
    if (!this.#selectedCity || !streetName) return;
    try {
      const res = await ApiService.post("/admin/routes/difficulty", {
        cityKey: this.#selectedCity.key,
        streetName,
        difficulty,
      });

      if (res.ok) {
        const lower = streetName.toLowerCase().trim();
        if (difficulty === "auto") {
          delete this.#routeDifficultyOverrides[lower];
        } else {
          this.#routeDifficultyOverrides[lower] = difficulty;
        }
        this.#renderRouteList();
        if (showToast) {
          const diffLabels = {
            easy: "Facile",
            medium: "Moyen",
            hard: "Difficile",
            auto: "Automatique",
          };
          const label = diffLabels[difficulty] || difficulty;
          this.#adminView.showToast(
            `Difficulté mise à jour pour "${streetName}" : ${label}`,
            "success",
          );
        }
      } else {
        const err = res.data || {};
        this.#adminView.showToast(
          err.error || "Erreur lors de la mise à jour",
          "error",
        );
      }
    } catch (e) {
      console.error("Failed to set route difficulty", e);
      this.#adminView.showToast("Erreur de connexion", "error");
    }
  }

  #getRouteDifficulty(route, nearCount = undefined) {
    return RouteDifficultyService.getRouteDifficulty(route, {
      diffMode: this.#difficultyMode,
      overrides: this.#routeDifficultyOverrides,
      nearCount,
    });
  }

  #renderRouteList() {
    const allRoutes = this.#currentRoutes;
    const counts = { all: 0, easy: 0, medium: 0, hard: 0, manual: 0 };
    const routeMeta = new Map();

    const neighbourCounts =
      this.#difficultyMode === "center"
        ? RouteDifficultyService.computeNeighbourCounts(allRoutes)
        : null;

    allRoutes.forEach((r, i) => {
      const nameLower = (r.properties?.name || "").toLowerCase().trim();
      const origNameLower = (r.properties?.originalName || "")
        .toLowerCase()
        .trim();
      const manualDiff =
        (this.#routeDifficultyOverrides &&
          (this.#routeDifficultyOverrides[nameLower] ||
            (origNameLower &&
              this.#routeDifficultyOverrides[origNameLower]))) ||
        (r.properties?.difficulty &&
        ["easy", "medium", "hard"].includes(r.properties.difficulty)
          ? r.properties.difficulty
          : null);
      const isManual = Boolean(manualDiff);

      const diff = this.#getRouteDifficulty(
        r,
        neighbourCounts ? neighbourCounts[i] : undefined,
      );

      r._difficulty = diff;
      routeMeta.set(r, { diff, isManual });

      counts.all++;
      if (isManual) counts.manual++;
      if (counts[diff] !== undefined) counts[diff]++;
    });

    let displayRoutes = allRoutes;
    if (this.#routeFilterQuery) {
      displayRoutes = displayRoutes.filter(
        (r) =>
          r.properties?.name &&
          r.properties.name.toLowerCase().includes(this.#routeFilterQuery),
      );
    }

    if (this.#routeDifficultyFilter === "manual") {
      displayRoutes = displayRoutes.filter((r) => routeMeta.get(r)?.isManual);
    } else if (
      this.#routeDifficultyFilter &&
      this.#routeDifficultyFilter !== "all"
    ) {
      displayRoutes = displayRoutes.filter(
        (r) => routeMeta.get(r)?.diff === this.#routeDifficultyFilter,
      );
    }

    const grouped = { easy: [], medium: [], hard: [] };
    displayRoutes.forEach((r) => {
      const meta = routeMeta.get(r);
      const diff = meta?.diff || "hard";
      if (grouped[diff]) {
        grouped[diff].push(r);
      }
    });

    this.#adminView.renderRouteList(
      displayRoutes,
      this.#difficultyMode,
      grouped,
      {
        currentFilter: this.#routeDifficultyFilter,
        counts,
        overrides: this.#routeDifficultyOverrides,
        disablePlaces: this.#disablePlaces,
        onDifficultyChange: (streetName, newDiff) =>
          this.setRouteDifficulty(streetName, newDiff),
      },
    );
  }

  async #saveDistrict(districtPayload) {
    try {
      const res = await ApiService.post("/admin/districts", {
        cityKey: this.#selectedCity.key,
        district: districtPayload,
      });

      if (!res.ok) {
        throw new Error(
          res.data?.error || "Erreur lors de la sauvegarde du quartier",
        );
      }

      this.#adminView.clearActiveDrawing();
      await this.loadDistricts();
    } catch (err) {
      this.#adminView.showToast(err.message);
    }
  }

  async #deleteDistrict(id) {
    try {
      const res = await ApiService.delete(
        `/admin/districts/${encodeURIComponent(this.#selectedCity.key)}/${encodeURIComponent(id)}`,
      );

      if (!res.ok) {
        throw new Error(res.data?.error || "Erreur lors de la suppression");
      }

      await this.loadDistricts();
    } catch (err) {
      this.#adminView.showToast(err.message);
    }
  }

  async #saveRoute(routePayload) {
    if (!this.#selectedCity) {
      this.#adminView.showToast(
        I18nService.getInstance().t(
          "admin.select_city_first",
          {},
          "Veuillez d'abord sélectionner une commune.",
        ),
        "error",
      );
      return;
    }

    try {
      const res = await ApiService.post("/admin/routes", {
        cityKey: this.#selectedCity.key,
        route: routePayload,
      });

      if (!res.ok) {
        const errorData = res.data || {};
        throw new Error(
          errorData.error ||
            `Erreur lors de la sauvegarde de la route (${res.status})`,
        );
      }

      this.#adminView.clearActiveRouteDrawing();
      await this.loadRoutes();
      this.#adminView.showToast(
        I18nService.getInstance().t(
          "admin.route_saved_success",
          {},
          "Route sauvegardée avec succès !",
        ),
        "success",
      );
    } catch (err) {
      console.error("Failed to save route:", err);
      this.#adminView.showToast(err.message, "error");
    }
  }

  async #deleteRoute(id) {
    try {
      const res = await ApiService.delete(
        `/admin/routes/${encodeURIComponent(this.#selectedCity.key)}/${encodeURIComponent(id)}`,
      );

      if (!res.ok) {
        throw new Error(res.data?.error || "Erreur lors de la suppression");
      }

      await this.loadRoutes();
    } catch (err) {
      this.#adminView.showToast(err.message);
    }
  }

  async showDashboard() {
    if (localStorage.getItem("is_admin") !== "true") return;

    const dashboard = document.getElementById("admin-dashboard-view");
    const districts = document.getElementById("admin-districts-view");
    const routes = document.getElementById("admin-routes-view");
    const reports = document.getElementById("admin-reports-view");
    if (dashboard) dashboard.classList.remove("hidden");
    if (districts) districts.classList.add("hidden");
    if (routes) routes.classList.add("hidden");
    if (reports) reports.classList.add("hidden");

    this.#loadSettings();
    this.#loadPendingReportsCount();

    if (!this.#selectedCity) {
      const lastCityRaw = localStorage.getItem("citymaster_last_city");
      if (lastCityRaw) {
        try {
          const lastCity = JSON.parse(lastCityRaw);
          await this.selectCity(lastCity);
        } catch (e) {}
      }
    }
  }

  async #loadPendingReportsCount() {
    if (localStorage.getItem("is_admin") !== "true") return;
    try {
      const res = await ApiService.get("/reports?status=pending");
      if (res.ok && Array.isArray(res.data)) {
        const reports = res.data;
        const badge = document.getElementById("admin-pending-reports-badge");
        if (badge) {
          const count = reports.length;
          badge.textContent = `${count}`;
          badge.classList.remove("hidden");
          if (count > 0) {
            badge.classList.add("badge-has-pending");
            badge.classList.remove("badge-zero");
          } else {
            badge.classList.add("badge-zero");
            badge.classList.remove("badge-has-pending");
          }
        }
      }
    } catch (e) {}
  }

  async showDistricts() {
    const dashboard = document.getElementById("admin-dashboard-view");
    const districts = document.getElementById("admin-districts-view");
    const routes = document.getElementById("admin-routes-view");
    const reports = document.getElementById("admin-reports-view");
    if (dashboard) dashboard.classList.add("hidden");
    if (routes) routes.classList.add("hidden");
    if (reports) reports.classList.add("hidden");
    if (districts) districts.classList.remove("hidden");
    this.#adminView.setEditMode("district");

    const mapEl = document.getElementById("admin-map");
    const targetContainer = districts
      ? districts.querySelector(".admin-map-area")
      : null;
    if (mapEl && targetContainer && mapEl.parentElement !== targetContainer) {
      targetContainer.appendChild(mapEl);
    }

    this.#adminView.initMap();
    if (!this.#selectedCity) {
      const lastCityRaw = localStorage.getItem("citymaster_last_city");
      if (lastCityRaw) {
        try {
          const lastCity = JSON.parse(lastCityRaw);
          await this.selectCity(lastCity);
        } catch (e) {}
      }
    }
  }

  async showRoutes() {
    const dashboard = document.getElementById("admin-dashboard-view");
    const districts = document.getElementById("admin-districts-view");
    const routes = document.getElementById("admin-routes-view");
    const reports = document.getElementById("admin-reports-view");
    if (dashboard) dashboard.classList.add("hidden");
    if (districts) districts.classList.add("hidden");
    if (reports) reports.classList.add("hidden");
    if (routes) routes.classList.remove("hidden");
    this.#adminView.setEditMode("route");

    const mapEl = document.getElementById("admin-map");
    const targetContainer = document.getElementById(
      "admin-map-container-routes",
    );
    if (mapEl && targetContainer && mapEl.parentElement !== targetContainer) {
      targetContainer.appendChild(mapEl);
    }

    this.#adminView.initMap();

    if (!this.#selectedCity) {
      const lastCityRaw = localStorage.getItem("citymaster_last_city");
      if (lastCityRaw) {
        try {
          const lastCity = JSON.parse(lastCityRaw);
          await this.selectCity(lastCity);
        } catch (e) {}
      }
    }

    await this.#loadSettings();
    this.#renderRouteList();
  }

  showReports() {
    const dashboard = document.getElementById("admin-dashboard-view");
    const districts = document.getElementById("admin-districts-view");
    const routes = document.getElementById("admin-routes-view");
    const reports = document.getElementById("admin-reports-view");
    if (dashboard) dashboard.classList.add("hidden");
    if (districts) districts.classList.add("hidden");
    if (routes) routes.classList.add("hidden");
    if (reports) reports.classList.remove("hidden");

    this.loadReports();
  }

  async loadReports() {
    if (localStorage.getItem("is_admin") !== "true") return;

    this.#loadPendingReportsCount();

    const filterSelect = document.getElementById("admin-reports-status-filter");
    const status = filterSelect ? filterSelect.value : "all";

    try {
      const res = await ApiService.get(
        `/reports?status=${encodeURIComponent(status)}`,
      );
      if (!res.ok || !Array.isArray(res.data)) {
        throw new Error("Failed to load reports");
      }

      this.#renderReportsList(res.data);
    } catch (err) {
      this.#adminView.showToast(
        I18nService.getInstance().t(
          "admin.reports_load_error",
          {},
          "Erreur lors du chargement des signalements.",
        ),
      );
    }
  }

  #renderReportsList(reports) {
    if (this.#reportsSearchQuery) {
      const q = this.#reportsSearchQuery;
      reports = reports.filter((r) => {
        const target = (r.target_street || "").toLowerCase();
        const clicked = (r.clicked_street || "").toLowerCase();
        const city = (r.city_key || "").toLowerCase();
        const user = (r.username || "").toLowerCase();
        const desc = (r.description || "").toLowerCase();
        return (
          target.includes(q) ||
          clicked.includes(q) ||
          city.includes(q) ||
          user.includes(q) ||
          desc.includes(q)
        );
      });
    }

    this.#adminView.renderReportsList(
      reports,
      (id) => this.#updateReportStatus(id, "resolved"),
      (id) => this.#updateReportStatus(id, "dismissed"),
      (id) => {
        if (id) {
          this.#deleteReport(id);
        }
      },
      (textToCopy) => {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(textToCopy).then(() => {
            this.#adminView.showToast(
              I18nService.getInstance().t(
                "admin.copied_name",
                { name: textToCopy },
                `Nom "${textToCopy}" copié !`,
              ),
            );
          });
        }
      },
    );
  }

  async #updateReportStatus(id, status) {
    try {
      const res = await ApiService.patch(`/reports/${id}/status`, { status });

      if (!res.ok) {
        throw new Error(res.data?.error || "Mise à jour échouée");
      }

      this.loadReports();
    } catch (err) {
      this.#adminView.showToast(err.message);
    }
  }

  async #deleteReport(id) {
    try {
      const res = await ApiService.delete(`/reports/${id}`);

      if (!res.ok) {
        throw new Error(res.data?.error || "Suppression échouée");
      }

      this.loadReports();
    } catch (err) {
      this.#adminView.showToast(err.message);
    }
  }
}
