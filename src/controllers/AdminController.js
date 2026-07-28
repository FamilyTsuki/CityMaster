import { I18nService } from '../services/I18nService.js';

export class AdminController {
  #adminView;
  #gameView;
  #selectedCity;
  #currentDistricts;

  constructor(adminView, gameView) {
    this.#adminView = adminView;
    this.#gameView = gameView;
    this.#selectedCity = null;
    this.#currentDistricts = [];

    this.#initEvents();
  }

  #initEvents() {
    const cityInput = document.getElementById('admin-city-search');
    const cityDropdown = document.getElementById('admin-city-dropdown');
    const addBtn = document.getElementById('admin-add-district-btn');
    const saveBtn = document.getElementById('admin-save-district-btn');
    const cancelBtn = document.getElementById('admin-cancel-district-btn');
    const districtList = document.getElementById('admin-district-list');

    if (cityInput && cityDropdown) {
      const lastCityRaw = localStorage.getItem('citymaster_last_city');
      if (lastCityRaw && !cityInput.value) {
        try {
          const lastCity = JSON.parse(lastCityRaw);
          cityInput.value = lastCity.name;
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
        cityDropdown.innerHTML = '';
        if (!cities || cities.length === 0) {
          cityDropdown.classList.add('hidden');
          return;
        }

        cities.forEach((city) => {
          const li = document.createElement('li');
          li.className = 'dropdown-item';
          li.style.cssText = 'padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--border-color);';
          li.innerHTML = `<strong>${city.name}</strong>`;
          li.addEventListener('click', () => {
            cityInput.value = city.name;
            cityDropdown.classList.add('hidden');
            this.selectCity(city);
          });
          cityDropdown.appendChild(li);
        });
        cityDropdown.classList.remove('hidden');
      };

      cityInput.addEventListener('focus', () => {
        searchCities(cityInput.value.trim()).then(renderCityMatches);
      });

      cityInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          const cities = await searchCities(cityInput.value.trim());
          renderCityMatches(cities);
        }, 200);
      });
    }

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        if (!this.#selectedCity) {
          alert('Veuillez d\'abord sélectionner une commune.');
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
          const district = this.#currentDistricts.find(d => d.properties && d.properties.id === id);
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
  }

  async selectCity(city) {
    this.#selectedCity = city;
    const infoBox = document.getElementById('admin-city-info');
    const nameEl = document.getElementById('admin-city-name');

    if (infoBox && nameEl) {
      nameEl.textContent = city.name;
      infoBox.classList.remove('hidden');
    }

    this.#adminView.initMap();
    if (city.center) {
      this.#adminView.setMapCenter(city.center[0], city.center[1], 14);
    }

    await this.loadDistricts();
  }

  async loadDistricts() {
    if (!this.#selectedCity) return;

    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`/api/admin/districts?cityKey=${encodeURIComponent(this.#selectedCity.key)}`, { headers });
      if (!res.ok) {
        this.#currentDistricts = [];
      } else {
        this.#currentDistricts = await res.json();
      }

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
      listEl.innerHTML = `<li style="font-size: 13px; color: var(--text-muted); text-align: center; padding: 12px;">Aucun quartier défini pour le moment.</li>`;
      return;
    }

    this.#currentDistricts.forEach(d => {
      const li = document.createElement('li');
      li.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: var(--bg-main); border-radius: 8px; border: 1px solid var(--border-color);';
      const color = d.properties.color || '#f59e0b';

      li.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 12px; height: 12px; border-radius: 50%; background: ${color}; display: inline-block;"></span>
          <strong style="font-size: 14px; color: var(--text-main);">${d.properties.name}</strong>
        </div>
        <div style="display: flex; gap: 6px;">
          <button type="button" class="btn-edit-district" data-id="${d.properties.id}" style="background: rgba(99,102,241,0.2); color: var(--primary-color); border: 1px solid var(--primary-color); border-radius: 6px; padding: 4px 8px; font-size: 12px; cursor: pointer;">Éditer</button>
          <button type="button" class="btn-delete-district" data-id="${d.properties.id}" style="background: #ef4444; color: #fff; border: none; border-radius: 6px; padding: 4px 8px; font-size: 12px; cursor: pointer;">Supprimer</button>
        </div>
      `;
      listEl.appendChild(li);
    });
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
}
