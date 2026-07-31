import { I18nService } from '../services/I18nService.js';

export class AdminController {
  #adminView;
  #gameView;
  #selectedCity;
  #currentDistricts;
  #currentRoutes;
  #difficultyMode;
  #routeFilterQuery;

  constructor(adminView, gameView) {
    this.#adminView = adminView;
    this.#gameView = gameView;
    this.#selectedCity = null;
    this.#currentDistricts = [];
    this.#currentRoutes = [];
    this.#difficultyMode = 'length';
    this.#routeFilterQuery = '';

    this.#initEvents();
  }

  #initEvents() {
    const goDistrictsBtn = document.getElementById('admin-go-districts-btn');
    const goRoutesBtn = document.getElementById('admin-go-routes-btn');

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
          this.selectCity(lastCity);
        } catch(e) {}
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
        dropdown.innerHTML = '';
        if (!cities || cities.length === 0) {
          dropdown.classList.add('hidden');
          return;
        }

        cities.forEach((city) => {
          const li = document.createElement('li');
          li.className = 'dropdown-item';
          li.style.cssText = 'padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--border-color);';
          li.innerHTML = `<strong>${city.name}</strong>`;
          li.addEventListener('click', () => {
            if (cityInput) cityInput.value = city.name;
            if (cityInputRoutes) cityInputRoutes.value = city.name;
            dropdown.classList.add('hidden');
            this.selectCity(city);
          });
          dropdown.appendChild(li);
        });
        dropdown.classList.remove('hidden');
      };

      input.addEventListener('focus', () => {
        searchCities(input.value.trim()).then(renderCityMatches);
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

    const addBtn = document.getElementById('admin-add-district-btn');
    const saveBtn = document.getElementById('admin-save-district-btn');
    const cancelBtn = document.getElementById('admin-cancel-district-btn');
    const districtList = document.getElementById('admin-district-list');

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        if (!this.#selectedCity) {
          alert("Veuillez d'abord sélectionner une commune.");
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
          alert('Veuillez saisir un nom et placer au moins 3 points sur la carte.');
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
          if (id && confirm('Voulez-vous vraiment supprimer ce quartier ?')) {
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
          alert("Veuillez d'abord sélectionner une commune.");
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
          alert('Veuillez tracer la route avec au moins 2 points et lui donner un nom.');
          return;
        }
        await this.#saveRoute(payload);
      });
    }

    this.#adminView.onRouteMapClick = (routeFeature) => {
      this.#adminView.startEditingRoute(routeFeature);
    };

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
          if (id && confirm('Voulez-vous vraiment supprimer cette route ?')) {
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

    const difficultyToggle = document.getElementById('admin-difficulty-mode-toggle');
    if (difficultyToggle) {
      this.#loadSettings();
      difficultyToggle.addEventListener('change', async (e) => {
        const mode = e.target.checked ? 'nomenclature' : 'length';
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
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch('/api/admin/settings', { headers });
      if (res.ok) {
        const settings = await res.json();
        const toggle = document.getElementById('admin-difficulty-mode-toggle');
        if (settings.difficulty_mode) {
          this.#difficultyMode = settings.difficulty_mode;
        }
        if (toggle && this.#difficultyMode === 'nomenclature') {
          toggle.checked = true;
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
        body: JSON.stringify({ [key]: value })
      });
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }

  async selectCity(city) {
    this.#selectedCity = city;
    localStorage.setItem('citymaster_last_city', JSON.stringify(city));

    this.#adminView.initMap();
    if (city.center) {
      this.#adminView.setMapCenter(city.center[0], city.center[1], 14);
    }

    await this.loadDistricts();
    await this.loadRoutes();
  }

  async loadDistricts() {
    if (!this.#selectedCity) return;
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
    const listEl = document.getElementById('admin-district-list');
    const countEl = document.getElementById('admin-district-count');
    if (countEl) countEl.textContent = this.#currentDistricts.length;
    if (!listEl) return;
    listEl.innerHTML = '';
    if (this.#currentDistricts.length === 0) {
      listEl.innerHTML = `<li class="district-list-empty">Aucun quartier défini.</li>`;
      return;
    }
    this.#currentDistricts.forEach(d => {
      const li = document.createElement('li');
      li.className = 'route-list-item';
      li.innerHTML = `
        <div class="route-list-info">
          <div class="district-color-dot" style="background: ${d.properties.color || '#3b82f6'};"></div>
          <strong class="route-list-name">${d.properties.name}</strong>
        </div>
        <div class="route-list-actions">
          <button type="button" class="btn-edit-item btn-edit-district" data-id="${d.properties.id || d.properties.name}" data-name="${d.properties.name}">Éditer</button>
          <button type="button" class="btn-delete-item btn-delete-district" data-id="${d.properties.id || d.properties.name}">Supprimer</button>
        </div>
      `;
      listEl.appendChild(li);
    });
  }

  async loadRoutes() {
    if (!this.#selectedCity) return;
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
    if (this.#difficultyMode === 'nomenclature') {
      const name = route.properties.name || '';
      const nameLower = name.toLowerCase().trim();
      const firstWord = nameLower.split(/[\s'-]+/)[0];
      const MAJOR_TYPES = ['boulevard', 'avenue', 'place', 'cours', 'quai', 'pont'];
      const MINOR_TYPES = ['impasse', 'allée', 'chemin', 'passage', 'ruelle', 'square', 'cour', 'villa', 'cité', 'sentier', 'traverse'];
      
      if (MAJOR_TYPES.includes(firstWord)) return 'easy';
      if (MINOR_TYPES.includes(firstWord) || nameLower.startsWith('grand chemin')) return 'hard';
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
      if (len > 800) return 'easy';
      if (len >= 250) return 'medium';
      return 'hard';
    }
  }

  #renderRouteList() {
    const listEl = document.getElementById('admin-route-list');
    const countEl = document.getElementById('admin-route-count');

    let displayRoutes = this.#currentRoutes;
    if (this.#routeFilterQuery) {
      displayRoutes = displayRoutes.filter(r => r.properties.name && r.properties.name.toLowerCase().includes(this.#routeFilterQuery));
    }

    if (countEl) countEl.textContent = displayRoutes.length;

    if (!listEl) return;
    listEl.innerHTML = '';

    if (displayRoutes.length === 0) {
      listEl.innerHTML = `<li class="district-list-empty">Aucune route ne correspond.</li>`;
      return;
    }

    const grouped = { easy: [], medium: [], hard: [] };
    displayRoutes.forEach(r => {
      const diff = this.#getRouteDifficulty(r);
      grouped[diff].push(r);
    });

    const renderGroup = (routes, title, color) => {
      if (routes.length === 0) return;
      
      const header = document.createElement('div');
      header.className = 'route-difficulty-header';
      header.style.color = color;
      header.textContent = `${title} (${routes.length})`;
      listEl.appendChild(header);

      routes.forEach(r => {
        const li = document.createElement('li');
        li.className = 'route-list-item';
        li.dataset.name = r.properties.name;

        li.innerHTML = `
          <div class="route-list-info">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="route-list-icon"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"></path></svg>
            <strong class="route-list-name">${r.properties.name}</strong>
          </div>
          <div class="route-list-actions">
            <button type="button" class="btn-edit-item btn-edit-route" data-id="${r.properties.id || r.properties.name}" data-name="${r.properties.name}">Éditer</button>
            <button type="button" class="btn-delete-item btn-delete-route" data-id="${r.properties.id || r.properties.name}">Supprimer</button>
          </div>
        `;
        listEl.appendChild(li);
      });
    };

    renderGroup(grouped.easy, 'Facile', '#10b981');
    renderGroup(grouped.medium, 'Moyen', '#f59e0b');
    renderGroup(grouped.hard, 'Difficile', '#ef4444');
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
      alert(err.message);
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
      alert(err.message);
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
      alert(err.message);
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
      alert(err.message);
    }
  }

  showDashboard() {
    const dashboard = document.getElementById('admin-dashboard-view');
    const districts = document.getElementById('admin-districts-view');
    const routes = document.getElementById('admin-routes-view');
    if (dashboard) dashboard.classList.remove('hidden');
    if (districts) districts.classList.add('hidden');
    if (routes) routes.classList.add('hidden');
  }

  showDistricts() {
    const dashboard = document.getElementById('admin-dashboard-view');
    const districts = document.getElementById('admin-districts-view');
    const routes = document.getElementById('admin-routes-view');
    if (dashboard) dashboard.classList.add('hidden');
    if (routes) routes.classList.add('hidden');
    if (districts) districts.classList.remove('hidden');
    this.#adminView.setEditMode('district');
    
    const mapEl = document.getElementById('admin-map');
    const targetContainer = districts.querySelector('.admin-map-area');
    if (mapEl && targetContainer && mapEl.parentElement !== targetContainer) {
      targetContainer.appendChild(mapEl);
    }
    
    this.#adminView.initMap();
  }

  showRoutes() {
    const dashboard = document.getElementById('admin-dashboard-view');
    const districts = document.getElementById('admin-districts-view');
    const routes = document.getElementById('admin-routes-view');
    if (dashboard) dashboard.classList.add('hidden');
    if (districts) districts.classList.add('hidden');
    if (routes) routes.classList.remove('hidden');
    this.#adminView.setEditMode('route');
    
    const mapEl = document.getElementById('admin-map');
    const targetContainer = document.getElementById('admin-map-container-routes');
    if (mapEl && targetContainer && mapEl.parentElement !== targetContainer) {
      targetContainer.appendChild(mapEl);
    }
    
    this.#adminView.initMap();
  }
}
