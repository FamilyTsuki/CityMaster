export class GameView {
  #screens;
  #citySelect;
  #startBtn;
  #hudMode;
  #hudScore;
  #instruction;
  #identifyContainer;
  #streetInput;
  #submitBtn;
  #nextModeBtn;
  #quitBtn;
  #gameError;
  #restartBtn;
  #certPlayerName;
  #certScore;
  #validateBtn;
  #nextBtn;
  #topBanner;
  #bottomActions;

  constructor() {
    this.#screens = {
      landing: document.getElementById('landing-screen'),
      auth: document.getElementById('auth-screen'),
      welcome: document.getElementById('welcome-screen'),
      game: document.getElementById('game-screen'),
      certificate: document.getElementById('certificate-screen'),
      loading: document.getElementById('loading-screen')
    };

    this.#citySelect = document.getElementById('city-select');
    this.#startBtn = document.getElementById('start-btn');

    this.#hudMode = document.getElementById('hud-mode');
    this.#hudScore = document.getElementById('hud-score');
    this.#instruction = document.getElementById('game-instruction');

    this.#identifyContainer = document.getElementById('identify-input-container');
    this.#streetInput = document.getElementById('street-name-input');
    this.#submitBtn = document.getElementById('submit-answer-btn');

    this.#quitBtn = document.getElementById('quit-btn');
    this.#gameError = document.getElementById('game-error');
    this.#restartBtn = document.getElementById('restart-btn');

    this.#certPlayerName = document.getElementById('cert-player-name');
    this.#certScore = document.getElementById('cert-score');

    this.#validateBtn = document.getElementById('validate-btn');
    this.#nextBtn = document.getElementById('next-btn');
    this.#topBanner = document.getElementById('top-banner');
    this.#bottomActions = document.getElementById('bottom-actions');
  }

  showScreen(screenName) {
    Object.keys(this.#screens).forEach(name => {
      if (name === screenName) {
        this.#screens[name].classList.add('active');
      } else {
        this.#screens[name].classList.remove('active');
      }
    });

    const navHud = document.getElementById('nav-hud');
    const navLogoutBtn = document.getElementById('nav-logout-btn');
    
    if (navHud) {
      if (screenName === 'game') {
        navHud.classList.remove('hidden');
        if (navLogoutBtn) navLogoutBtn.classList.add('hidden');
      } else {
        navHud.classList.add('hidden');
        if (navLogoutBtn) navLogoutBtn.classList.remove('hidden');
      }
    }
  }

  onStart(callback) {
    const searchInput = document.getElementById('city-search');
    const dropdownList = document.getElementById('city-dropdown-list');
    const listItems = dropdownList.querySelectorAll('li');
    let selectedCity = localStorage.getItem('citymaster_last_city') || 'paris';

    searchInput.addEventListener('focus', () => {
      dropdownList.classList.remove('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !dropdownList.contains(e.target)) {
        dropdownList.classList.add('hidden');
      }
    });

    searchInput.addEventListener('input', (e) => {
      dropdownList.classList.remove('hidden');
      const filter = e.target.value.toLowerCase();
      listItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(filter)) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
    });

    listItems.forEach(item => {
      item.addEventListener('click', () => {
        listItems.forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        selectedCity = item.getAttribute('data-value');
        searchInput.value = item.textContent.trim();
        dropdownList.classList.add('hidden');
      });
    });

    const defaultItem = Array.from(listItems).find(i => i.getAttribute('data-value') === selectedCity);
    if (defaultItem) {
      defaultItem.classList.add('selected');
      searchInput.value = defaultItem.textContent.trim();
    }

    const modeInput = document.getElementById('mode-search');
    const modeList = document.getElementById('mode-dropdown-list');
    const modeItems = modeList.querySelectorAll('li');
    let selectedMode = localStorage.getItem('citymaster_last_mode') || 'target';

    modeInput.addEventListener('click', () => {
      modeList.classList.remove('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!modeInput.contains(e.target) && !modeList.contains(e.target)) {
        modeList.classList.add('hidden');
      }
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

    document.getElementById('start-btn').addEventListener('click', () => {
      this.#gameError.classList.add('hidden');
      localStorage.setItem('citymaster_last_city', selectedCity);
      localStorage.setItem('citymaster_last_mode', selectedMode);
      const playerName = document.getElementById('logged-in-user').textContent;
      callback(playerName, selectedCity, selectedMode);
    });
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
      
      let rankIcon = `${index + 1}`;
      if (index === 0) rankIcon = '🥇';
      else if (index === 1) rankIcon = '🥈';
      else if (index === 2) rankIcon = '🥉';
      
      tr.innerHTML = `
        <td>${rankIcon}</td>
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
    let modeFr = mode;
    if (mode === 'target') modeFr = 'Cible';
    if (mode === 'identify') modeFr = 'Identification';
    
    this.#hudMode.textContent = modeFr;
    this.#hudScore.textContent = score;
  }

  setInstruction(text) {
    this.#instruction.textContent = text;
  }

  setBannerStreetName(name) {
  }

  showBanner(visible) {
    if (visible) {
      this.#topBanner.classList.remove('hidden');
      this.#bottomActions.classList.remove('hidden');
    } else {
      this.#topBanner.classList.add('hidden');
      this.#bottomActions.classList.add('hidden');
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

  showCertificate(playerName, score) {
    this.#certPlayerName.textContent = playerName;
    this.#certScore.textContent = score;
    this.showScreen('certificate');
  }
}
