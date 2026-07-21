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

  constructor() {
    this.#screens = {
      landing: document.getElementById('landing-screen'),
      auth: document.getElementById('auth-screen'),
      welcome: document.getElementById('welcome-screen'),
      game: document.getElementById('game-screen'),
      certificate: document.getElementById('certificate-screen'),
      loading: document.getElementById('loading-screen'),
      profile: document.getElementById('profile-screen')
    };

    this.#citySelect = document.getElementById('city-select');
    this.#startBtn = document.getElementById('start-btn');
    this.#instruction = document.getElementById('game-instruction');

    this.#identifyContainer = document.getElementById('identify-input-container');
    this.#streetInput = document.getElementById('street-name-input');
    this.#submitBtn = document.getElementById('submit-answer-btn');

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
  }

  #setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const gameScreen = document.getElementById('game-screen');
      if (!gameScreen || !gameScreen.classList.contains('active')) return;

      const activeEl = document.activeElement;
      const isInputFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      if (e.code === 'Space') {
        if (!isInputFocused) {
          e.preventDefault();
          if (this.#validateBtn && !this.#validateBtn.classList.contains('hidden')) {
            this.#validateBtn.click();
          } else if (this.#nextBtn && !this.#nextBtn.classList.contains('hidden')) {
            this.#nextBtn.click();
          }
        }
      } else if (e.code === 'Enter') {
        if (this.#nextBtn && !this.#nextBtn.classList.contains('hidden')) {
          e.preventDefault();
          this.#nextBtn.click();
        }
      } else if (e.code === 'Escape') {
        if (this.#quitBtn) {
          this.#quitBtn.click();
        }
      }
    });
  }

  showScreen(screenName) {
    Object.keys(this.#screens).forEach(name => {
      if (name === screenName) {
        this.#screens[name].classList.add('active');
      } else {
        this.#screens[name].classList.remove('active');
      }
    });

    const navLogoutBtn = document.getElementById('nav-logout-btn');
    if (screenName === 'game') {
      if (navLogoutBtn) navLogoutBtn.classList.add('hidden');
    } else {
      if (navLogoutBtn) navLogoutBtn.classList.remove('hidden');
    }
  }

  onStart(callback) {
    const searchInput = document.getElementById('city-search');
    const dropdownList = document.getElementById('city-dropdown-list');
    const token = localStorage.getItem('token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    let selectedCityData = null;
    try {
      const stored = localStorage.getItem('citymaster_last_city_data');
      if (stored) {
        selectedCityData = JSON.parse(stored);
      }
    } catch (e) {
      console.error(e);
    }

    const renderCities = (cities) => {
      dropdownList.innerHTML = '';
      if (cities.length === 0) {
        const noResultItem = document.createElement('li');
        noResultItem.className = 'no-results';
        noResultItem.style.color = 'var(--text-muted)';
        noResultItem.textContent = 'Aucune ville trouvée';
        dropdownList.appendChild(noResultItem);
        return;
      }

      cities.forEach(city => {
        const li = document.createElement('li');
        li.textContent = city.name;
        li.setAttribute('data-value', city.key);
        if (selectedCityData && selectedCityData.key === city.key) {
          li.classList.add('selected');
        }

        li.addEventListener('click', () => {
          dropdownList.querySelectorAll('li').forEach(i => i.classList.remove('selected'));
          li.classList.add('selected');
          selectedCityData = city;
          localStorage.setItem('citymaster_last_city_data', JSON.stringify(city));
          searchInput.value = city.name;
          dropdownList.classList.add('hidden');
        });

        dropdownList.appendChild(li);
      });
    };

    fetch('/api/cities', { headers })
      .then(res => res.json())
      .then(cities => {
        renderCities(cities);
        if (selectedCityData) {
          searchInput.value = selectedCityData.name;
        } else if (cities.length > 0) {
          selectedCityData = cities[0];
          searchInput.value = selectedCityData.name;
        }
      });

    searchInput.addEventListener('focus', () => {
      dropdownList.classList.remove('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !dropdownList.contains(e.target)) {
        dropdownList.classList.add('hidden');
      }
    });

    let debounceTimer = null;

    searchInput.addEventListener('input', (e) => {
      dropdownList.classList.remove('hidden');
      const query = e.target.value.trim();

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      if (query.length < 2) {
        fetch('/api/cities', { headers })
          .then(res => res.json())
          .then(cities => renderCities(cities));
        return;
      }

      debounceTimer = setTimeout(async () => {
        try {
          dropdownList.innerHTML = '';
          const loadingItem = document.createElement('li');
          loadingItem.style.color = 'var(--text-muted)';
          loadingItem.textContent = 'Recherche...';
          dropdownList.appendChild(loadingItem);

          const response = await fetch(`/api/cities?q=${encodeURIComponent(query)}`, { headers });
          if (response.ok) {
            const cities = await response.json();
            renderCities(cities);
          }
        } catch (error) {
          console.error('Error fetching dynamic cities:', error);
        }
      }, 300);
    });

    const modeInput = document.getElementById('mode-search');
    const modeList = document.getElementById('mode-dropdown-list');
    const modeItems = modeList.querySelectorAll('li');
    let selectedMode = localStorage.getItem('citymaster_last_mode') || 'target';

    modeInput.addEventListener('click', () => {
      modeList.classList.remove('hidden');
    });

    modeItems.forEach(item => {
      item.addEventListener('click', () => {
        modeItems.forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        selectedMode = item.getAttribute('data-value');
        modeInput.value = item.textContent.trim();
        modeList.classList.add('hidden');
      });
    });

    const defaultModeItem = Array.from(modeItems).find(i => i.getAttribute('data-value') === selectedMode);
    if (defaultModeItem) {
      defaultModeItem.classList.add('selected');
      modeInput.value = defaultModeItem.textContent.trim();
    }

    const diffInput = document.getElementById('difficulty-search');
    const diffList = document.getElementById('difficulty-dropdown-list');
    const diffItems = diffList.querySelectorAll('li');
    let selectedDifficulty = localStorage.getItem('citymaster_last_difficulty') || 'hard';

    diffInput.addEventListener('click', () => {
      diffList.classList.remove('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!modeInput.contains(e.target) && !modeList.contains(e.target)) {
        modeList.classList.add('hidden');
      }
      if (!diffInput.contains(e.target) && !diffList.contains(e.target)) {
        diffList.classList.add('hidden');
      }
    });

    diffItems.forEach(item => {
      item.addEventListener('click', () => {
        diffItems.forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        selectedDifficulty = item.getAttribute('data-value');
        diffInput.value = item.textContent.trim();
        diffList.classList.add('hidden');
      });
    });

    const defaultDiffItem = Array.from(diffItems).find(i => i.getAttribute('data-value') === selectedDifficulty);
    if (defaultDiffItem) {
      defaultDiffItem.classList.add('selected');
      diffInput.value = defaultDiffItem.textContent.trim();
    }

    document.getElementById('start-btn').addEventListener('click', () => {
      this.#gameError.classList.add('hidden');
      
      if (!selectedCityData) {
        this.showError('Veuillez sélectionner une ville dans la liste.');
        return;
      }

      localStorage.setItem('citymaster_last_mode', selectedMode);
      localStorage.setItem('citymaster_last_difficulty', selectedDifficulty);
      const playerName = this.getPlayerName();

      callback(playerName, selectedCityData, selectedMode, selectedDifficulty);
    });
  }

  #playerName = 'Joueur';

  setPlayerName(name) {
    this.#playerName = name;
    const span = document.getElementById('logged-in-user');
    if (span) {
      span.textContent = name;
    }
  }

  getPlayerName() {
    return this.#playerName;
  }

  showError(message) {
    this.#gameError.textContent = message;
    this.#gameError.classList.remove('hidden');
  }

  showLoading(message = 'Chargement...') {
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
      loadingMessage.textContent = message;
    }
    this.showScreen('loading');
  }

  onHeroPlay(callback) {
    document.getElementById('hero-play-btn').addEventListener('click', () => {
      callback();
    });
  }

  renderLeaderboard(scores) {
    const tbody = document.getElementById('leaderboard-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!scores || scores.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center">Aucun score pour le moment.</td></tr>';
      return;
    }
    const topScores = scores.slice(0, 10);
    
    topScores.forEach((scoreData, index) => {
      const tr = document.createElement('tr');
      
      const date = new Date(scoreData.date).toLocaleDateString('fr-FR');
      
      let rankClass = 'rank-neutral';
      if (index === 0) rankClass = 'rank-gold';
      else if (index === 1) rankClass = 'rank-silver';
      else if (index === 2) rankClass = 'rank-bronze';
      
      tr.innerHTML = `
        <td><span class="rank-badge ${rankClass}">${index + 1}</span></td>
        <td><strong>${this.#escapeHtml(scoreData.player)}</strong></td>
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

  onValidate(callback) {
    this.#validateBtn.addEventListener('click', callback);
  }

  onNextStreet(callback) {
    this.#nextBtn.addEventListener('click', callback);
  }

  onQuit(callback) {
    this.#quitBtn.addEventListener('click', callback);
  }

  onRestart(callback) {
    this.#restartBtn.addEventListener('click', callback);
  }

  updateHUD(mode, score) {
  }

  setInstruction(text) {
    this.#instruction.textContent = text;
    this.#instruction.classList.remove('success-text', 'error-text');
    if (text.startsWith('Parfait') || text.startsWith('Pas mal') || text.startsWith('Bonne réponse')) {
      this.#instruction.classList.add('success-text');
    } else if (text.startsWith('Raté') || text.startsWith('Faux')) {
      this.#instruction.classList.add('error-text');
    }
  }

  updateComboBadge(multiplier) {
    if (!this.#comboBadge || !this.#comboText) return;
    if (multiplier && multiplier > 1) {
      this.#comboText.textContent = `Combo x${multiplier}`;
      this.#comboBadge.classList.remove('hidden');
    } else {
      this.#comboBadge.classList.add('hidden');
    }
  }

  showBanner(visible) {
    if (visible) {
      this.#topBanner.classList.remove('hidden');
      this.#bottomActions.classList.remove('hidden');
    } else {
      this.#topBanner.classList.add('hidden');
      this.#bottomActions.classList.add('hidden');
      this.hideTimer();
      this.updateComboBadge(1);
    }
  }

  showTimer() {
    const container = document.getElementById('timer-container');
    const bar = document.getElementById('timer-bar');
    if (container && bar) {
      container.classList.remove('hidden');
      bar.style.width = '100%';
      bar.classList.remove('timer-warning', 'timer-danger');
    }
  }

  updateTimer(remainingSeconds, totalSeconds) {
    const bar = document.getElementById('timer-bar');
    if (bar) {
      const percentage = (remainingSeconds / totalSeconds) * 100;
      bar.style.width = `${percentage}%`;

      if (percentage <= 25) {
        bar.classList.remove('timer-warning');
        bar.classList.add('timer-danger');
      } else if (percentage <= 50) {
        bar.classList.remove('timer-danger');
        bar.classList.add('timer-warning');
      } else {
        bar.classList.remove('timer-warning', 'timer-danger');
      }
    }
  }

  hideTimer() {
    const container = document.getElementById('timer-container');
    if (container) {
      container.classList.add('hidden');
    }
  }

  setActionsState(state) {
    this.#validateBtn.classList.add('hidden');
    this.#nextBtn.classList.add('hidden');

    if (state === 'validate') {
      this.#validateBtn.classList.remove('hidden');
    } else if (state === 'next') {
      this.#nextBtn.classList.remove('hidden');
    }
  }

  setModeLayout(mode) {
    if (mode === 'identify') {
      this.#identifyContainer.classList.remove('hidden');
    } else {
      this.#identifyContainer.classList.add('hidden');
    }
  }

  updateRoundProgress(currentRound, totalRounds = 5) {
    const dots = document.querySelectorAll('.round-dot');
    dots.forEach((dot, index) => {
      const roundNum = index + 1;
      dot.classList.remove('active', 'done-success', 'done-error');
      if (roundNum === currentRound) {
        dot.classList.add('active');
      } else if (roundNum < currentRound) {
        dot.classList.add('done-success');
      }
    });
  }
}
