const MINOR_WAY_KEYWORDS = [
  'chemin', 'chemins', 'sentier', 'sentiers', 'ruelle', 'ruelles', 
  'passage', 'passages', 'allée', 'allées', 'impasse', 'impasses', 
  'traverse', 'traverses', 'chemain', 'cour', 'cours', 'villa', 'villas', 
  'cité', 'cités', 'square', 'squares'
];

const MAJOR_WAY_TYPES = [
  'boulevard', 'boulevards', 'avenue', 'avenues', 'place', 'places', 
  'cours', 'quai', 'quais', 'pont', 'ponts'
];

export class AdminController {
  #adminView;
  #gameView;
  #router;
  #selectedCity;
  #currentDistricts;
  #currentRoutes;
  #difficultyMode;
  #routeFilterQuery;
  #reportsSearchQuery;

  constructor(adminView, gameView, router = null) {
    this.#adminView = adminView;
    this.#gameView = gameView;
    this.#router = router;
    this.#selectedCity = null;
    this.#currentDistricts = [];
    this.#currentRoutes = [];
    this.#difficultyMode = 'length';
    this.#routeFilterQuery = '';
    this.#reportsSearchQuery = '';

    this.#initEvents();
  }

  setRouter(router) {
    this.#router = router;
  }

  #initEvents() {
    const goDistrictsBtn = document.getElementById('admin-go-districts-btn');
    const goRoutesBtn = document.getElementById('admin-go-routes-btn');
    const goReportsBtn = document.getElementById('admin-go-reports-btn');

    if (goDistrictsBtn) {
      goDistrictsBtn.addEventListener('click', () => {
        this.#adminView.setEditMode('district');
        this.showDistricts();
      });
    }
    if (goRoutesBtn) {
      goRoutesBtn.addEventListener('click', () => {
        this.#adminView.setEditMode('route');
        this.showRoutes();
      });
    }
    if (goReportsBtn) {
      goReportsBtn.addEventListener('click', () => {
        this.showReports();
      });
    }

    const adminBackBtn = document.getElementById('admin-back-btn');
    if (adminBackBtn) {
      adminBackBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.#router) {
          this.#router.navigate('/setup');
        } else {
          window.location.href = '/#/setup';
        }
      });
    }

    const districtsBackBtn = document.getElementById('admin-districts-back-btn');
    const routesBackBtn = document.getElementById('admin-routes-back-btn');
    const reportsBackBtn = document.getElementById('admin-reports-back-btn');

    if (districtsBackBtn) {
      districtsBackBtn.addEventListener('click', () => {
        this.showDashboard();
      });
    }
    if (routesBackBtn) {
      routesBackBtn.addEventListener('click', () => {
        this.showDashboard();
      });
    }
    if (reportsBackBtn) {
      reportsBackBtn.addEventListener('click', () => {
        this.showDashboard();
      });
    }

    const statusFilterSelect = document.getElementById('admin-reports-status-filter');
    if (statusFilterSelect) {
      statusFilterSelect.addEventListener('change', () => {
        this.loadReports();
      });
    }

    const reportsSearch = document.getElementById('admin-reports-search');
    if (reportsSearch) {
      reportsSearch.addEventListener('input', (e) => {
        this.#reportsSearchQuery = e.target.value.toLowerCase().trim();
        this.loadReports();
      });
    }

    const refreshReportsBtn = document.getElementById('admin-refresh-reports-btn');
    if (refreshReportsBtn) {
      refreshReportsBtn.addEventListener('click', () => {
        this.loadReports();
      });
    }

    const cityInput = document.getElementById('admin-city-search');
    const cityDropdown = document.getElementById('admin-city-dropdown');
    const cityInputRoutes = document.getElementById('admin-city-search-routes');
    const cityDropdownRoutes = document.getElementById('admin-city-dropdown-routes');

    const setupCitySearch = (input, dropdown) => {
      if (!input || !dropdown) return;
      const lastCityRaw = localStorage.getItem('citymaster_last_city');
      if (lastCityRaw && !input.value) {
        try {
          const lastCity = JSON.parse(lastCityRaw);
          input.value = lastCity.name;
        } catch (e) {}
      }

      let debounceTimer = null;

      const searchCities = async (query = '') => {
        try {
          const token = localStorage.getItem('token');
          const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
          const res = await fetch(`/api/cities?q=${encodeURIComponent(query)}`, { headers });
          if (!res.ok) return [];
          return await res.json();
        } catch (e) {
          return [];
        }
      };

      const renderCityMatches = (cities) => {
        dropdown.replaceChildren();
        if (!cities || cities.length === 0) {
          dropdown.classList.add('hidden');
          return;
        }

        cities.forEach(city => {
          const li = document.createElement('li');
          li.className = 'dropdown-item';
          if (city.isVerified) {
            li.classList.add('city-option-verified');
          }
          const strong = document.createElement('strong');
          strong.textContent = city.name || '';
          li.appendChild(strong);

          if (city.isVerified) {
            const badge = document.createElement('span');
            badge.className = 'city-verified-badge';
            badge.textContent = '✓ Validée';
            li.appendChild(badge);
          }

          li.addEventListener('click', async () => {
            input.value = city.name;
            dropdown.classList.add('hidden');
            await this.selectCity(city);
          });
          dropdown.appendChild(li);
        });

        dropdown.classList.remove('hidden');
      };

      input.addEventListener('focus', async () => {
        const cities = await searchCities(input.value.trim());
        renderCityMatches(cities);
      });

      input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          const cities = await searchCities(input.value.trim());
          renderCityMatches(cities);
        }, 200);
      });
    };

    setupCitySearch(cityInput, cityDropdown);
    setupCitySearch(cityInputRoutes, cityDropdownRoutes);

    const verifyBtn = document.getElementById('admin-city-verify-btn');
    if (verifyBtn) {
      verifyBtn.addEventListener('click', async () => {
        if (!this.#selectedCity) return;
        try {
          const token = localStorage.getItem('token');
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const res = await fetch(`/api/cities/${encodeURIComponent(this.#selectedCity.key)}/verify`, {
            method: 'PATCH',
            headers
          });

          if (res.ok) {
            const updatedCity = await res.json();
            this.#selectedCity.isVerified = updatedCity.isVerified;
            localStorage.setItem('citymaster_last_city', JSON.stringify(this.#selectedCity));
            this.updateVerifyButtonState();
            this.#adminView.showToast(
              updatedCity.isVerified
                ? '✓ Commune marquée comme validée avec succès !'
                : 'Validation retirée pour cette commune.',
              updatedCity.isVerified ? 'success' : 'error'
            );
          }
        } catch (err) {
          console.error('Failed to toggle city verification', err);
        }
      });
    }

    const addBtn = document.getElementById('admin-add-district-btn');
    const saveBtn = document.getElementById('admin-save-district-btn');
    const cancelBtn = document.getElementById('admin-cancel-district-btn');
    const districtList = document.getElementById('admin-district-list');

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        if (!this.#selectedCity) {
          this.#adminView.showToast("Veuillez d'abord sélectionner une commune.");
          return;
        }
        this.#adminView.startEditingDistrict(null);
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.#adminView.clearActiveDrawing();
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        if (!this.#selectedCity) return;
        const payload = this.#adminView.getActiveDistrictPayload();
        if (!payload) {
          this.#adminView.showToast('Veuillez saisir un nom et placer au moins 3 points sur la carte.');
          return;
        }
        await this.#saveDistrict(payload);
      });
    }

    if (districtList) {
      districtList.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.btn-edit-district');
        const deleteBtn = e.target.closest('.btn-delete-district');
        if (editBtn) {
          const id = editBtn.dataset.id;
          const name = editBtn.dataset.name;
          const district = this.#currentDistricts.find(d => (d.properties.id === id) || (!d.properties.id && d.properties.name === name));
          if (district) {
            this.#adminView.startEditingDistrict(district);
          }
        } else if (deleteBtn) {
          const id = deleteBtn.dataset.id;
          if (id) {
            this.#deleteDistrict(id);
          }
        }
      });
    }

    const addRouteBtn = document.getElementById('admin-add-route-btn');
    const saveRouteBtn = document.getElementById('admin-save-route-btn');
    const cancelRouteBtn = document.getElementById('admin-cancel-route-btn');
    const routeList = document.getElementById('admin-route-list');

    if (addRouteBtn) {
      addRouteBtn.addEventListener('click', () => {
        if (!this.#selectedCity) {
          this.#adminView.showToast("Veuillez d'abord sélectionner une commune.");
          return;
        }
        this.#adminView.startEditingRoute(null);
      });
    }

    if (cancelRouteBtn) {
      cancelRouteBtn.addEventListener('click', () => {
        this.#adminView.clearActiveRouteDrawing();
      });
    }

    if (saveRouteBtn) {
      saveRouteBtn.addEventListener('click', async () => {
        if (!this.#selectedCity) return;
        const payload = this.#adminView.getActiveRoutePayload();
        if (!payload) {
          this.#adminView.showToast('Veuillez saisir un nom et placer au moins 2 points sur la carte.');
          return;
        }
        await this.#saveRoute(payload);
      });
    }

    if (routeList) {
      routeList.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.btn-edit-route');
        const deleteBtn = e.target.closest('.btn-delete-route');
        const routeItem = e.target.closest('.route-list-item');

        if (editBtn) {
          const id = editBtn.dataset.id;
          const name = editBtn.dataset.name;
          const route = this.#currentRoutes.find(r => (r.properties.id === id) || (!r.properties.id && r.properties.name === name));
          if (route) {
            this.#adminView.startEditingRoute(route);
          }
        } else if (deleteBtn) {
          const id = deleteBtn.dataset.id;
          if (id) {
            this.#deleteRoute(id);
          }
        } else if (routeItem) {
          const name = routeItem.dataset.name;
          const route = this.#currentRoutes.find(r => r.properties.name === name);
          if (route) {
            this.#adminView.startEditingRoute(route);
          }
        }
      });
    }

    const difficultySelect = document.getElementById('admin-difficulty-mode-select');
    if (difficultySelect) {
      difficultySelect.addEventListener('change', async (e) => {
        const mode = e.target.value;
        this.#difficultyMode = mode;
        await this.#saveSetting('difficulty_mode', mode);
        this.#renderRouteList();
      });
    }

    const routeFilter = document.getElementById('admin-route-filter');
    if (routeFilter) {
      routeFilter.addEventListener('input', (e) => {
        this.#routeFilterQuery = e.target.value.toLowerCase().trim();
        this.#renderRouteList();
      });
    }
  }

  async #loadSettings() {
    if (localStorage.getItem('is_admin') !== 'true') return;
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch('/api/admin/settings', { headers });
      if (res.ok) {
        const settings = await res.json();
        if (settings.difficulty_mode) {
          this.#difficultyMode = settings.difficulty_mode;
        }
        const select = document.getElementById('admin-difficulty-mode-select');
        if (select) {
          select.value = this.#difficultyMode;
        }
        const modeTextEl = document.getElementById('admin-route-mode-text');
        if (modeTextEl) {
          const modeLabels = {
            length: 'Par longueur (Longueur >800m / 250m-800m / <250m)',
            nomenclature: 'Par nomenclature (Grands axes vs Voies secondaires)',
            center: 'Par centre-ville (Densité de croisements)'
          };
          modeTextEl.textContent = modeLabels[this.#difficultyMode] || this.#difficultyMode;
        }
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  }

  async #saveSetting(key, value) {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({ key, value })
      });
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }

  updateVerifyButtonState() {
    const verifyBtn = document.getElementById('admin-city-verify-btn');
    if (!verifyBtn) return;

    if (!this.#selectedCity) {
      verifyBtn.classList.add('hidden');
      return;
    }

    verifyBtn.classList.remove('hidden');
    if (this.#selectedCity.isVerified) {
      verifyBtn.classList.add('verified');
      verifyBtn.title = 'Commune validée (clean). Cliquer pour retirer la validation';
    } else {
      verifyBtn.classList.remove('verified');
      verifyBtn.title = 'Cliquer pour valider la qualité des rues de cette commune';
    }
  }

  async selectCity(city) {
    this.#selectedCity = city;
    localStorage.setItem('citymaster_last_city', JSON.stringify(city));
    this.updateVerifyButtonState();

    this.#adminView.initMap();
    if (city.center) {
      this.#adminView.setMapCenter(city.center[0], city.center[1], 14);
    }

    await this.loadDistricts();
    await this.loadRoutes();
  }

  async loadDistricts() {
    if (!this.#selectedCity || localStorage.getItem('is_admin') !== 'true') return;
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const defaultRes = await fetch(`/assets/data/${this.#selectedCity.key}.json`);
      let defaultDistricts = [];
      if (defaultRes.ok) {
        const defaultData = await defaultRes.json();
        if (defaultData && defaultData.features) {
          defaultDistricts = defaultData.features.filter(f => f.properties && f.properties.isLotissement && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'));
        }
      }

      const res = await fetch(`/api/admin/districts?cityKey=${encodeURIComponent(this.#selectedCity.key)}`, { headers });
      let customDistricts = [];
      if (res.ok) {
        customDistricts = await res.json();
      }

      const customNames = new Set(customDistricts.map(d => d.properties.name));
      const filteredDefaultDistricts = defaultDistricts.filter(f => !customNames.has(f.properties.name));

      this.#currentDistricts = [...filteredDefaultDistricts, ...customDistricts];

      this.#adminView.renderSavedDistricts(this.#currentDistricts);
      this.#renderDistrictList();
    } catch (e) {
      console.error('Failed to load districts for admin', e);
    }
  }

  #renderDistrictList() {
    this.#adminView.renderDistrictList(this.#currentDistricts);
  }

  async loadRoutes() {
    if (!this.#selectedCity || localStorage.getItem('is_admin') !== 'true') return;
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const defaultRes = await fetch(`/assets/data/${this.#selectedCity.key}.json`);
      let defaultStreets = [];
      if (defaultRes.ok) {
        const defaultData = await defaultRes.json();
        if (defaultData && defaultData.features) {
          defaultStreets = defaultData.features.filter(f => !f.properties.isLotissement);
        }
      }

      const customRes = await fetch(`/api/admin/routes?cityKey=${encodeURIComponent(this.#selectedCity.key)}`, { headers });
      let customRoutes = [];
      if (customRes.ok) {
        customRoutes = await customRes.json();
      }

      const customNames = new Set(customRoutes.map(r => r.properties.name));
      const filteredDefaultStreets = defaultStreets.filter(f => !customNames.has(f.properties.name));

      this.#currentRoutes = [...filteredDefaultStreets, ...customRoutes];

      this.#adminView.renderSavedRoutes(this.#currentRoutes);
      this.#renderRouteList();
    } catch (e) {
      console.error('Failed to load routes for admin', e);
    }
  }

  #getRouteDifficulty(route) {
    const name = route.properties.name || '';
    const nameLower = name.toLowerCase().trim();
    const isMinorWay = MINOR_WAY_KEYWORDS.some(k => nameLower.includes(k));

    if (this.#difficultyMode === 'nomenclature') {
      const firstWord = nameLower.split(/[\s'-]+/)[0];
      
      if (MAJOR_WAY_TYPES.includes(firstWord) && !isMinorWay) return 'easy';
      if (isMinorWay) return 'hard';
      return 'medium';
    } else {
      let len = 0;
      if (route.geometry.type === 'Point') return 'hard';
      try {
        if (window.turf) {
          len = window.turf.length(route, { units: 'meters' });
        }
      } catch (e) {
        return 'hard';
      }
      if (isMinorWay) return 'hard';
      if (len > 800) return 'easy';
      if (len >= 250) return 'medium';
      return 'hard';
    }
  }

  #renderRouteList() {
    let displayRoutes = this.#currentRoutes;
    if (this.#routeFilterQuery) {
      displayRoutes = displayRoutes.filter(r => r.properties.name && r.properties.name.toLowerCase().includes(this.#routeFilterQuery));
    }

    const grouped = { easy: [], medium: [], hard: [] };
    let centroids = [];
    if (this.#difficultyMode === 'center' && window.turf) {
      centroids = displayRoutes.map(r => {
        if (r.geometry.type === 'Point') return r;
        try { return window.turf.centroid(r); } catch(e) { return null; }
      });
    }

    displayRoutes.forEach((r, i) => {
      let diff = 'hard';
      if (this.#difficultyMode === 'center') {
        const nameLower = (r.properties.name || '').toLowerCase().trim();
        const isMinorWay = MINOR_WAY_KEYWORDS.some(k => nameLower.includes(k));
        const isMediumType = MAJOR_WAY_TYPES.some(w => nameLower.includes(w)) || nameLower.includes('rue') || nameLower.includes('route');
        
        let nearCount = 0;
        if (centroids[i] && window.turf) {
          for (let j = 0; j < centroids.length; j++) {
            if (i === j || !centroids[j]) continue;
            try {
              const dist = window.turf.distance(centroids[i], centroids[j], { units: 'meters' });
              if (dist <= 200) nearCount++;
            } catch(e) {}
          }
        }
        
        const inCenter = nearCount >= 4;
        if (isMinorWay) diff = 'hard';
        else if (inCenter && isMediumType) diff = 'easy';
        else if (isMediumType) diff = 'medium';
      } else {
        diff = this.#getRouteDifficulty(r);
      }
      grouped[diff].push(r);
    });

    this.#adminView.renderRouteList(displayRoutes, this.#difficultyMode, grouped);
  }

  async #saveDistrict(districtPayload) {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } : { 'Content-Type': 'application/json' };
      const res = await fetch('/api/admin/districts', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          cityKey: this.#selectedCity.key,
          district: districtPayload
        })
      });

      if (!res.ok) {
        throw new Error('Erreur lors de la sauvegarde du quartier');
      }

      this.#adminView.clearActiveDrawing();
      await this.loadDistricts();
    } catch (err) {
      this.#adminView.showToast(err.message);
    }
  }

  async #deleteDistrict(id) {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`/api/admin/districts/${encodeURIComponent(this.#selectedCity.key)}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers
      });

      if (!res.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      await this.loadDistricts();
    } catch (err) {
      this.#adminView.showToast(err.message);
    }
  }

  async #saveRoute(routePayload) {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } : { 'Content-Type': 'application/json' };
      const res = await fetch('/api/admin/routes', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          cityKey: this.#selectedCity.key,
          route: routePayload
        })
      });

      if (!res.ok) {
        throw new Error('Erreur lors de la sauvegarde de la route');
      }

      this.#adminView.clearActiveRouteDrawing();
      await this.loadRoutes();
    } catch (err) {
      this.#adminView.showToast(err.message);
    }
  }

  async #deleteRoute(id) {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`/api/admin/routes/${encodeURIComponent(this.#selectedCity.key)}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers
      });

      if (!res.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      await this.loadRoutes();
    } catch (err) {
      this.#adminView.showToast(err.message);
    }
  }

  async showDashboard() {
    if (localStorage.getItem('is_admin') !== 'true') return;

    const dashboard = document.getElementById('admin-dashboard-view');
    const districts = document.getElementById('admin-districts-view');
    const routes = document.getElementById('admin-routes-view');
    const reports = document.getElementById('admin-reports-view');
    if (dashboard) dashboard.classList.remove('hidden');
    if (districts) districts.classList.add('hidden');
    if (routes) routes.classList.add('hidden');
    if (reports) reports.classList.add('hidden');

    this.#loadSettings();
    this.#loadPendingReportsCount();

    if (!this.#selectedCity) {
      const lastCityRaw = localStorage.getItem('citymaster_last_city');
      if (lastCityRaw) {
        try {
          const lastCity = JSON.parse(lastCityRaw);
          await this.selectCity(lastCity);
        } catch (e) {}
      }
    }
  }

  async #loadPendingReportsCount() {
    if (localStorage.getItem('is_admin') !== 'true') return;
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch('/api/reports?status=pending', { headers });
      if (res.ok) {
        const reports = await res.json();
        const badge = document.getElementById('admin-pending-reports-badge');
        if (badge) {
          const count = reports.length;
          badge.textContent = `${count}`;
          badge.classList.remove('hidden');
          if (count > 0) {
            badge.classList.add('badge-has-pending');
            badge.classList.remove('badge-zero');
          } else {
            badge.classList.add('badge-zero');
            badge.classList.remove('badge-has-pending');
          }
        }
      }
    } catch (e) {}
  }

  showDistricts() {
    const dashboard = document.getElementById('admin-dashboard-view');
    const districts = document.getElementById('admin-districts-view');
    const routes = document.getElementById('admin-routes-view');
    const reports = document.getElementById('admin-reports-view');
    if (dashboard) dashboard.classList.add('hidden');
    if (routes) routes.classList.add('hidden');
    if (reports) reports.classList.add('hidden');
    if (districts) districts.classList.remove('hidden');
    this.#adminView.setEditMode('district');
    
    const mapEl = document.getElementById('admin-map');
    const targetContainer = districts ? districts.querySelector('.admin-map-area') : null;
    if (mapEl && targetContainer && mapEl.parentElement !== targetContainer) {
      targetContainer.appendChild(mapEl);
    }
    
    this.#adminView.initMap();
  }

  async showRoutes() {
    const dashboard = document.getElementById('admin-dashboard-view');
    const districts = document.getElementById('admin-districts-view');
    const routes = document.getElementById('admin-routes-view');
    const reports = document.getElementById('admin-reports-view');
    if (dashboard) dashboard.classList.add('hidden');
    if (districts) districts.classList.add('hidden');
    if (reports) reports.classList.add('hidden');
    if (routes) routes.classList.remove('hidden');
    this.#adminView.setEditMode('route');
    
    const mapEl = document.getElementById('admin-map');
    const targetContainer = document.getElementById('admin-map-container-routes');
    if (mapEl && targetContainer && mapEl.parentElement !== targetContainer) {
      targetContainer.appendChild(mapEl);
    }
    
    this.#adminView.initMap();
    await this.#loadSettings();
    this.#renderRouteList();
  }

  showReports() {
    const dashboard = document.getElementById('admin-dashboard-view');
    const districts = document.getElementById('admin-districts-view');
    const routes = document.getElementById('admin-routes-view');
    const reports = document.getElementById('admin-reports-view');
    if (dashboard) dashboard.classList.add('hidden');
    if (districts) districts.classList.add('hidden');
    if (routes) routes.classList.add('hidden');
    if (reports) reports.classList.remove('hidden');

    this.loadReports();
  }

  async loadReports() {
    if (localStorage.getItem('is_admin') !== 'true') return;

    this.#loadPendingReportsCount();

    const filterSelect = document.getElementById('admin-reports-status-filter');
    const status = filterSelect ? filterSelect.value : 'all';

    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`/api/reports?status=${encodeURIComponent(status)}`, { headers });
      if (!res.ok) {
        throw new Error('Failed to load reports');
      }

      const reports = await res.json();
      this.#renderReportsList(reports);
    } catch (err) {
      this.#adminView.showToast('Erreur lors du chargement des signalements.');
    }
  }

  #renderReportsList(reports) {
    if (this.#reportsSearchQuery) {
      const q = this.#reportsSearchQuery;
      reports = reports.filter(r => {
        const target = (r.target_street || '').toLowerCase();
        const clicked = (r.clicked_street || '').toLowerCase();
        const city = (r.city_key || '').toLowerCase();
        const user = (r.username || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        return target.includes(q) || clicked.includes(q) || city.includes(q) || user.includes(q) || desc.includes(q);
      });
    }

    this.#adminView.renderReportsList(
      reports,
      (id) => this.#updateReportStatus(id, 'resolved'),
      (id) => this.#updateReportStatus(id, 'dismissed'),
      (id) => {
        if (id) {
          this.#deleteReport(id);
        }
      },
      (textToCopy) => {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(textToCopy).then(() => {
            this.#adminView.showToast(`Nom "${textToCopy}" copié !`);
          });
        }
      }
    );
  }

  async #updateReportStatus(id, status) {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/reports/${id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status })
      });

      if (!res.ok) {
        throw new Error('Mise à jour échouée');
      }

      this.loadReports();
    } catch (err) {
      this.#adminView.showToast(err.message);
    }
  }

  async #deleteReport(id) {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const res = await fetch(`/api/reports/${id}`, {
        method: 'DELETE',
        headers
      });

      if (!res.ok) {
        throw new Error('Suppression échouée');
      }

      this.loadReports();
    } catch (err) {
      this.#adminView.showToast(err.message);
    }
  }
}
