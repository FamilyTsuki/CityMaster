import { CustomLotissementService } from '../services/CustomLotissementService.js';

export class GameView {
  #screens;
  #citySelect;
  #startBtn;
  #instruction;
  #identifyContainer;
  #streetInput;
  #submitBtn;
  #nextModeBtn;
  #quitBtn;
  #gameError;
  #restartBtn;
  #validateBtn;
  #nextBtn;
  #topBanner;
  #bottomActions;
  #comboBadge;
  #comboText;
  #autocompleteList;

  constructor() {
    this.#screens = {
      landing: document.getElementById('landing-screen'),
      auth: document.getElementById('auth-screen'),
      welcome: document.getElementById('welcome-screen'),
      game: document.getElementById('game-screen'),
      certificate: document.getElementById('certificate-screen'),
      loading: document.getElementById('loading-screen'),
      profile: document.getElementById('profile-screen'),
      legal: document.getElementById('legal-screen'),
      admin: document.getElementById('admin-screen')
    };

    this.#citySelect = document.getElementById('city-select');
    this.#startBtn = document.getElementById('start-btn');
    this.#instruction = document.getElementById('game-instruction');

    this.#identifyContainer = document.getElementById('identify-input-container');
    this.#streetInput = document.getElementById('street-name-input');
    this.#submitBtn = document.getElementById('submit-answer-btn');
    this.#autocompleteList = document.getElementById('autocomplete-suggestions');

    this.#quitBtn = document.getElementById('quit-btn');
    this.#gameError = document.getElementById('game-error');
    this.#restartBtn = document.getElementById('restart-btn');

    this.#validateBtn = document.getElementById('validate-btn');
    this.#nextBtn = document.getElementById('next-btn');
    this.#topBanner = document.getElementById('top-banner');
    this.#bottomActions = document.getElementById('bottom-actions');

    this.#comboBadge = document.getElementById('combo-badge');
    this.#comboText = document.getElementById('combo-text');

    this.#setupKeyboardShortcuts();
    this.#setupWelcomeForm();
    this.#initCustomLotissementModal();
  }

  #setupWelcomeForm() {
    const cityInput = document.getElementById('city-search');
    const cityDropdown = document.getElementById('city-dropdown-list');
    const modeInput = document.getElementById('mode-search');
    const modeDropdown = document.getElementById('mode-dropdown-list');
    const difficultyInput = document.getElementById('difficulty-search');
    const difficultyDropdown = document.getElementById('difficulty-dropdown-list');

    if (modeInput) {
      const firstMode = modeDropdown ? modeDropdown.querySelector('li') : null;
      if (firstMode && (!modeInput.value || !modeInput.dataset.value)) {
        modeInput.value = firstMode.textContent.trim();
        modeInput.dataset.value = firstMode.getAttribute('data-value') || 'target';
      }
    }
    if (difficultyInput) {
      const hardDiff = difficultyDropdown ? (difficultyDropdown.querySelector('li[data-value="hard"]') || difficultyDropdown.querySelector('li')) : null;
      if (hardDiff && (!difficultyInput.value || !difficultyInput.dataset.value)) {
        difficultyInput.value = hardDiff.textContent.trim();
        difficultyInput.dataset.value = hardDiff.getAttribute('data-value') || 'hard';
      }
    }

    if (cityInput && cityDropdown) {
      let debounceTimer = null;

      const searchCities = async (query = '') => {
        try {
          const token = localStorage.getItem('token');
          const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
          const res = await fetch(`/api/cities?q=${encodeURIComponent(query)}`, { headers });
          if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            localStorage.removeItem('citymaster_session');
            window.location.hash = '#/login';
            return [];
          }
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
          cityInput.setAttribute('aria-expanded', 'false');
          return;
        }

        cities.forEach((city) => {
          const li = document.createElement('li');
          li.setAttribute('role', 'option');
          li.className = 'dropdown-item';
          li.style.padding = '8px 12px';
          li.style.cursor = 'pointer';
          li.innerHTML = `<strong>${city.name}</strong>`;
          li.addEventListener('click', () => {
            cityInput.value = city.name;
            cityInput.dataset.value = city.key;
            window.citymaster_selected_city_data = city;
            cityDropdown.classList.add('hidden');
            cityInput.setAttribute('aria-expanded', 'false');
            this.hideError();
            this.checkCityDistricts(city.key);
          });
          cityDropdown.appendChild(li);
        });

        cityDropdown.classList.remove('hidden');
        cityInput.setAttribute('aria-expanded', 'true');
      };

      cityInput.addEventListener('focus', () => {
        const query = cityInput.value.trim();
        searchCities(query).then(renderCityMatches);
      });

      cityInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          const query = cityInput.value.trim();
          const cities = await searchCities(query);
          renderCityMatches(cities);
        }, 200);
      });
    }

    if (modeInput && modeDropdown) {
      modeInput.addEventListener('click', (e) => {
        e.stopPropagation();
        modeDropdown.classList.toggle('hidden');
        const isExpanded = !modeDropdown.classList.contains('hidden');
        modeInput.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
      });

      modeDropdown.querySelectorAll('li').forEach((item) => {
        item.addEventListener('click', () => {
          modeInput.value = item.textContent.trim();
          modeInput.dataset.value = item.getAttribute('data-value');
          modeDropdown.classList.add('hidden');
          modeInput.setAttribute('aria-expanded', 'false');
        });
      });
    }

    if (difficultyInput && difficultyDropdown) {
      difficultyInput.addEventListener('click', (e) => {
        e.stopPropagation();
        difficultyDropdown.classList.toggle('hidden');
        const isExpanded = !difficultyDropdown.classList.contains('hidden');
        difficultyInput.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
      });

      difficultyDropdown.querySelectorAll('li').forEach((item) => {
        item.addEventListener('click', () => {
          difficultyInput.value = item.textContent.trim();
          difficultyInput.dataset.value = item.getAttribute('data-value');
          difficultyDropdown.classList.add('hidden');
          difficultyInput.setAttribute('aria-expanded', 'false');
          localStorage.setItem('citymaster_last_difficulty', item.getAttribute('data-value'));
        });
      });
    }

    document.addEventListener('click', (e) => {
      if (cityDropdown && cityInput && !cityInput.contains(e.target) && !cityDropdown.contains(e.target)) {
        cityDropdown.classList.add('hidden');
        cityInput.setAttribute('aria-expanded', 'false');
      }
      if (modeDropdown && modeInput && !modeInput.contains(e.target) && !modeDropdown.contains(e.target)) {
        modeDropdown.classList.add('hidden');
        modeInput.setAttribute('aria-expanded', 'false');
      }
      if (difficultyDropdown && difficultyInput && !difficultyInput.contains(e.target) && !difficultyDropdown.contains(e.target)) {
        difficultyDropdown.classList.add('hidden');
        difficultyInput.setAttribute('aria-expanded', 'false');
      }
    });
  }

  async checkCityDistricts(cityKey) {
    const lotissementOption = document.querySelector('#difficulty-dropdown-list li[data-value="lotissement"]');
    const difficultySearch = document.getElementById('difficulty-search');
    if (!lotissementOption) return;

    if (!cityKey) {
      lotissementOption.classList.add('hidden');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`/api/admin/districts?cityKey=${encodeURIComponent(cityKey)}`, { headers });
      let districts = [];
      if (res.ok) {
        districts = await res.json();
      }

      if (districts.length >= 5) {
        lotissementOption.classList.remove('hidden');
      } else {
        lotissementOption.classList.add('hidden');
        if (difficultySearch && difficultySearch.dataset.value === 'lotissement') {
          difficultySearch.dataset.value = 'hard';
          const { I18nService } = await import('../services/I18nService.js');
          const i18n = I18nService.getInstance();
          difficultySearch.value = i18n.t('welcome.diff_hard');
        }
      }
    } catch (e) {
      lotissementOption.classList.add('hidden');
    }
  }

  refreshWelcomeDefaults() {
    const modeInput = document.getElementById('mode-search');
    const modeDropdown = document.getElementById('mode-dropdown-list');
    const difficultyInput = document.getElementById('difficulty-search');
    const difficultyDropdown = document.getElementById('difficulty-dropdown-list');

    this.checkCityDistricts(window.citymaster_selected_city_data?.key);

    if (modeInput && modeDropdown) {
      const firstMode = modeDropdown.querySelector('li');
      if (firstMode && (!modeInput.value || !modeInput.dataset.value)) {
        modeInput.value = firstMode.textContent.trim();
        modeInput.dataset.value = firstMode.getAttribute('data-value') || 'target';
      }
    }

    if (difficultyInput && difficultyDropdown) {
      const hardDiff = difficultyDropdown.querySelector('li[data-value="hard"]') || difficultyDropdown.querySelector('li');
      if (hardDiff && (!difficultyInput.value || !difficultyInput.dataset.value)) {
        difficultyInput.value = hardDiff.textContent.trim();
        difficultyInput.dataset.value = hardDiff.getAttribute('data-value') || 'hard';
      }
    }
  }

  #setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const gameScreen = document.getElementById('game-screen');
      if (!gameScreen || !gameScreen.classList.contains('active')) return;

      const activeEl = document.activeElement;
      const isInputFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      if (e.key === 'Escape') {
        e.preventDefault();
        if (this.#quitBtn) this.#quitBtn.click();
        return;
      }

      if (isInputFocused) return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (this.#validateBtn && !this.#validateBtn.classList.contains('hidden')) {
          this.#validateBtn.click();
        } else if (this.#nextBtn && !this.#nextBtn.classList.contains('hidden')) {
          this.#nextBtn.click();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (this.#nextBtn && !this.#nextBtn.classList.contains('hidden')) {
          this.#nextBtn.click();
        }
      }
    });
  }

  #initCustomLotissementModal() {
    const btn = document.getElementById('custom-lotissement-btn');
    const modal = document.getElementById('custom-lotissement-modal');
    const closeBtn = document.getElementById('close-lotissement-modal-btn');
    const form = document.getElementById('custom-lotissement-form');
    const list = document.getElementById('custom-lotissement-list');
    const latInput = document.getElementById('custom-lotissement-lat');
    const lngInput = document.getElementById('custom-lotissement-lng');

    if (!btn || !modal) return;

    const renderList = () => {
      const cityData = window.citymaster_selected_city_data;
      if (!cityData || !cityData.key) {
        list.innerHTML = `<li style="color: var(--text-muted); font-size: 13px;">Veuillez d'abord sélectionner une commune.</li>`;
        return;
      }
      const items = CustomLotissementService.getCustomLotissements(cityData.key);
      if (items.length === 0) {
        const { I18nService } = import('../services/I18nService.js');
        list.innerHTML = `<li style="color: var(--text-muted); font-size: 13px;" data-i18n="welcome.custom_lotissement_empty">Aucun lotissement manuel ajouté pour cette commune.</li>`;
        return;
      }
      list.innerHTML = '';
      items.forEach(item => {
        const li = document.createElement('li');
        li.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--bg-main); border-radius: 8px; border: 1px solid var(--border-color);';
        li.innerHTML = `
          <div>
            <strong style="color: var(--text-main); font-size: 14px;">${item.properties.name}</strong>
            <span style="font-size: 12px; color: var(--text-muted); display: block;">📍 ${item.geometry.coordinates[0][0][1].toFixed(4)}, ${item.geometry.coordinates[0][0][0].toFixed(4)}</span>
          </div>
          <button type="button" class="btn-delete-lotissement" data-id="${item.properties.id}" style="background: #ef4444; color: #fff; border: none; border-radius: 6px; padding: 4px 8px; font-size: 12px; cursor: pointer;">Supprimer</button>
        `;
        list.appendChild(li);
      });
    };

    btn.addEventListener('click', () => {
      const cityData = window.citymaster_selected_city_data;
      if (cityData && cityData.center) {
        if (latInput) latInput.value = cityData.center[0];
        if (lngInput) lngInput.value = cityData.center[1];
      }
      renderList();
      modal.classList.remove('hidden');
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
      });
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });

    list.addEventListener('click', (e) => {
      const delBtn = e.target.closest('.btn-delete-lotissement');
      if (delBtn) {
        const id = delBtn.dataset.id;
        const cityData = window.citymaster_selected_city_data;
        if (cityData && cityData.key && id) {
          CustomLotissementService.deleteCustomLotissement(cityData.key, id);
          renderList();
        }
      }
    });

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const cityData = window.citymaster_selected_city_data;
        if (!cityData || !cityData.key) {
          return;
        }
        const nameInput = document.getElementById('custom-lotissement-name');
        const name = nameInput ? nameInput.value.trim() : '';
        const lat = parseFloat(latInput ? latInput.value : '');
        const lng = parseFloat(lngInput ? lngInput.value : '');

        if (name && !isNaN(lat) && !isNaN(lng)) {
          CustomLotissementService.addCustomLotissement(cityData.key, name, lat, lng);
          if (nameInput) nameInput.value = '';
          renderList();
        }
      });
    }
  }

  showScreen(screenName) {
    Object.values(this.#screens).forEach((screen) => {
      if (screen) screen.classList.remove('active');
    });
    if (!this.#screens[screenName]) {
      this.#screens[screenName] = document.getElementById(`${screenName}-screen`);
    }
    if (this.#screens[screenName]) {
      this.#screens[screenName].classList.add('active');
    }
    if (screenName === 'welcome') {
      this.refreshWelcomeDefaults();
    }
  }

  setPlayerName(name) {
    const loggedInUser = document.getElementById('logged-in-user');
    if (loggedInUser) loggedInUser.textContent = name;
  }

  populateCities(cities) {
    if (!this.#citySelect) return;
    this.#citySelect.innerHTML = '';
    cities.forEach((city) => {
      const option = document.createElement('option');
      option.value = city.id;
      option.textContent = city.name;
      this.#citySelect.appendChild(option);
    });
  }

  onHeroPlay(callback) {
    const heroPlayBtn = document.getElementById('hero-play-btn') || document.getElementById('landing-play-btn');
    if (heroPlayBtn) {
      heroPlayBtn.addEventListener('click', callback);
    }
  }

  onStart(callback) {
    if (this.#startBtn) {
      this.#startBtn.addEventListener('click', async () => {
        const cityKeyInput = document.getElementById('city-search');
        const modeInput = document.getElementById('mode-search');
        const difficultyInput = document.getElementById('difficulty-search');

        const cityKey = cityKeyInput ? cityKeyInput.dataset.value : null;
        const mode = modeInput ? modeInput.dataset.value : 'target';
        const difficulty = difficultyInput ? difficultyInput.dataset.value : 'hard';

        const { I18nService } = await import('../services/I18nService.js');
        const i18n = I18nService.getInstance();

        if (!cityKey) {
          this.showError(i18n.t('errors.select_city_first'));
          return;
        }

        const selectedCityData = window.citymaster_selected_city_data;
        if (!selectedCityData) {
          this.showError(i18n.t('errors.select_city_valid'));
          return;
        }

        const playerName = localStorage.getItem('username') || 'Joueur';
        callback(playerName, selectedCityData, mode, difficulty);
      });
    }
  }

  showError(message) {
    if (this.#gameError) {
      this.#gameError.textContent = message;
      this.#gameError.classList.remove('hidden');
    }
  }

  hideError() {
    if (this.#gameError) {
      this.#gameError.classList.add('hidden');
    }
  }

  setInstruction(text) {
    if (this.#instruction) {
      this.#instruction.textContent = text;
    }
  }

  updateComboBadge(multiplier) {
    if (!this.#comboBadge || !this.#comboText) return;

    if (multiplier > 1) {
      this.#comboText.textContent = `Combo x${multiplier}`;
      this.#comboBadge.classList.remove('hidden');
    } else {
      this.#comboBadge.classList.add('hidden');
    }
  }

  showLoading(message = 'Chargement...') {
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
      loadingMessage.textContent = message;
    }
    this.showScreen('loading');
  }

  setMode(mode) {
    if (this.#identifyContainer) this.#identifyContainer.classList.add('hidden');

    if (mode === 'identify') {
      if (this.#identifyContainer) this.#identifyContainer.classList.remove('hidden');
      if (this.#streetInput) {
        this.#streetInput.value = '';
        this.#streetInput.focus();
      }
    }
  }

  setModeLayout(mode) {
    this.setMode(mode);
  }

  showBanner(visible) {
    this.setOverlaysVisible(visible);
  }

  updateRoundProgress(currentRound, totalRounds = 5, history = []) {
    this.updateRoundIndicators(currentRound, totalRounds, history);
  }

  updateHUD(mode, score) {
    const scoreElement = document.getElementById('current-score') || document.getElementById('game-score');
    if (scoreElement) {
      scoreElement.textContent = score;
    }
  }

  showTimer() {
    const timerContainer = document.getElementById('timer-container');
    if (timerContainer) timerContainer.classList.remove('hidden');
  }

  hideTimer() {
    const timerContainer = document.getElementById('timer-container');
    if (timerContainer) timerContainer.classList.add('hidden');
  }

  updateTimer(remainingTime, totalTime) {
    const timerBar = document.getElementById('timer-bar');
    if (!timerBar) return;
    const percentage = Math.max(0, Math.min(100, (remainingTime / totalTime) * 100));
    timerBar.style.width = `${percentage}%`;
    if (percentage < 25) {
      timerBar.style.backgroundColor = 'var(--danger)';
    } else if (percentage < 50) {
      timerBar.style.backgroundColor = '#f59e0b';
    } else {
      timerBar.style.backgroundColor = 'var(--primary)';
    }
  }

  setActionsState(state) {
    if (this.#validateBtn) this.#validateBtn.classList.add('hidden');
    if (this.#nextBtn) this.#nextBtn.classList.add('hidden');

    if (state === 'guessing' || state === 'validate') {
      if (this.#validateBtn) this.#validateBtn.classList.remove('hidden');
    } else if (state === 'validated' || state === 'next') {
      if (this.#nextBtn) this.#nextBtn.classList.remove('hidden');
    }
  }

  setOverlaysVisible(visible) {
    if (this.#topBanner) {
      if (visible) this.#topBanner.classList.remove('hidden');
      else this.#topBanner.classList.add('hidden');
    }
    if (this.#bottomActions) {
      if (visible) this.#bottomActions.classList.remove('hidden');
      else this.#bottomActions.classList.add('hidden');
    }
  }

  updateRoundIndicators(currentRound, totalRounds = 5, history = []) {
    const indicatorsContainer = document.getElementById('round-indicators');
    if (!indicatorsContainer) return;

    indicatorsContainer.innerHTML = '';
    for (let i = 1; i <= totalRounds; i++) {
      const dot = document.createElement('span');
      dot.className = 'round-dot';
      dot.setAttribute('data-round', i);

      const pastResult = history[i - 1];
      if (pastResult) {
        if (pastResult.score > 0) {
          dot.classList.add('done-success');
        } else {
          dot.classList.add('done-error');
        }
      } else if (i === currentRound) {
        dot.classList.add('active');
      }

      indicatorsContainer.appendChild(dot);
    }
  }

  onQuit(callback) {
    if (this.#quitBtn) {
      this.#quitBtn.addEventListener('click', callback);
    }
  }

  onRestart(callback) {
    if (this.#restartBtn) {
      this.#restartBtn.addEventListener('click', callback);
    }
  }

  onValidate(callback) {
    if (this.#validateBtn) {
      this.#validateBtn.addEventListener('click', callback);
    }
  }

  onNextStreet(callback) {
    if (this.#nextBtn) {
      this.#nextBtn.addEventListener('click', callback);
    }
  }

  renderSprintResults(history) {
    const tbody = document.getElementById('sprint-history-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    history.forEach((item, index) => {
      const tr = document.createElement('tr');
      const timeSec = (item.time / 1000).toFixed(1);
      const isSuccess = item.score > 0;
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td><strong>${this.#escapeHtml(item.streetName)}</strong></td>
        <td><span class="badge ${isSuccess ? 'badge-success' : 'badge-danger'}">${timeSec}s</span></td>
        <td><strong>${item.score} pts</strong></td>
      `;
      tbody.appendChild(tr);
    });
  }

  renderLeaderboard(leaderboardData) {
    const tbody = document.getElementById('leaderboard-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!leaderboardData || leaderboardData.length === 0) {
      import('../services/I18nService.js').then(({ I18nService }) => {
        const noScoresText = I18nService.getInstance().t('leaderboard.no_scores');
        tbody.innerHTML = `<tr><td colspan="4" class="text-center">${noScoresText}</td></tr>`;
      });
      return;
    }

    leaderboardData.forEach((scoreData, index) => {
      const tr = document.createElement('tr');
      const date = new Date(scoreData.created_at).toLocaleDateString('fr-FR');
      tr.innerHTML = `
        <td>#${index + 1}</td>
        <td><strong>${this.#escapeHtml(scoreData.username)}</strong></td>
        <td>${scoreData.score} pts</td>
        <td class="text-muted">${date}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  #escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  }

  onMapStyleChange(callback) {
    const styleBtns = document.querySelectorAll('.map-style-btn');
    styleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        styleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const style = btn.getAttribute('data-style');
        callback(style);
      });
    });
  }

  #getAdaptiveSettings() {
    const logicalCores = navigator.hardwareConcurrency || 4;
    const memoryGb = navigator.deviceMemory || 4;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const effectiveType = connection ? connection.effectiveType : '4g';
    const saveData = connection ? connection.saveData : false;

    let maxSuggestions = 5;
    let debounceMs = 0;
    let minChars = 2;

    if (logicalCores >= 8 && memoryGb >= 8 && effectiveType === '4g' && !saveData) {
      maxSuggestions = 10;
      debounceMs = 0;
      minChars = 1;
    } else if (logicalCores <= 2 || memoryGb <= 2 || effectiveType === '2g' || effectiveType === 'slow-2g' || saveData) {
      maxSuggestions = 3;
      debounceMs = 150;
      minChars = 2;
    } else {
      maxSuggestions = 5;
      debounceMs = 50;
      minChars = 2;
    }

    return { maxSuggestions, debounceMs, minChars };
  }

  setupAutocomplete(streetsList) {
    if (!this.#streetInput || !this.#autocompleteList || !Array.isArray(streetsList)) return;

    let selectedIndex = -1;
    let debounceTimer = null;
    const settings = this.#getAdaptiveSettings();

    const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const hideDropdown = () => {
      if (!this.#autocompleteList) return;
      this.#autocompleteList.classList.add('hidden');
      this.#autocompleteList.innerHTML = '';
      this.#streetInput.setAttribute('aria-expanded', 'false');
      selectedIndex = -1;
    };

    const performFilter = () => {
      const query = normalize(this.#streetInput.value.trim());
      if (query.length < settings.minChars) {
        hideDropdown();
        return;
      }

      const matches = streetsList.filter(streetName => {
        return normalize(streetName).includes(query);
      }).slice(0, settings.maxSuggestions);

      if (matches.length === 0) {
        hideDropdown();
        return;
      }

      this.#autocompleteList.innerHTML = matches.map((match, i) => `
        <li data-index="${i}" data-value="${this.#escapeHtml(match)}" role="option" class="dropdown-item">
          ${this.#escapeHtml(match)}
        </li>
      `).join('');

      this.#autocompleteList.classList.remove('hidden');
      this.#streetInput.setAttribute('aria-expanded', 'true');
      selectedIndex = -1;

      this.#autocompleteList.querySelectorAll('li').forEach(item => {
        item.addEventListener('click', () => {
          this.#streetInput.value = item.getAttribute('data-value');
          hideDropdown();
          this.#streetInput.focus();
        });
      });
    };

    this.#streetInput.addEventListener('input', () => {
      if (settings.debounceMs > 0) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(performFilter, settings.debounceMs);
      } else {
        performFilter();
      }
    });

    this.#streetInput.addEventListener('keydown', (e) => {
      const items = this.#autocompleteList.querySelectorAll('li');
      if (items.length === 0 || this.#autocompleteList.classList.contains('hidden')) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % items.length;
        items.forEach((item, index) => {
          item.classList.toggle('selected', index === selectedIndex);
        });
        if (items[selectedIndex]) {
          this.#streetInput.value = items[selectedIndex].getAttribute('data-value');
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + items.length) % items.length;
        items.forEach((item, index) => {
          item.classList.toggle('selected', index === selectedIndex);
        });
        if (items[selectedIndex]) {
          this.#streetInput.value = items[selectedIndex].getAttribute('data-value');
        }
      } else if (e.key === 'Escape') {
        hideDropdown();
      }
    });

    document.addEventListener('click', (e) => {
      if (this.#identifyContainer && !this.#identifyContainer.contains(e.target)) {
        hideDropdown();
      }
    });
  }

  onSubmitAnswer(callback) {
    this.#submitBtn.addEventListener('click', () => {
      const answer = this.#streetInput.value.trim();
      if (answer) {
        callback(answer);
        this.#streetInput.value = '';
      }
    });
    this.#streetInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        const answer = this.#streetInput.value.trim();
        if (answer) {
          callback(answer);
          this.#streetInput.value = '';
        }
      }
    });
  }
}
