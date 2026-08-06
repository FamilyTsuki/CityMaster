export class RoomView {
  #screens;
  #steps;
  #guestForm;
  #guestUsername;
  #guestError;
  #createBtn;
  #joinBtn;
  #codeInput;
  #joinError;
  #lobbyRoomInfo;
  #lobbyCodeBadge;
  #lobbyShareUrl;
  #lobbyCopyBtn;
  #lobbyCopyFeedback;
  #lobbyPlayersCount;
  #lobbyPlayersList;
  #lobbyStatusText;
  #lobbyCreatorName;
  #lobbyCityName;
  #lobbyDiffLevel;
  #lobbyStartBtn;
  #lobbyWaitingMsg;
  #lobbyLeaveBtn;
  #resultsTableBody;
  #resultsHomeBtn;
  #resultsRefreshBtn;

  #cityInput;
  #cityDropdown;
  #diffInput;
  #diffDropdown;
  #lobbySeriesCount;
  #seriesInput;
  #setupBackBtn;

  constructor() {
    this.#screens = {
      room: document.getElementById('room-screen')
    };

    this.#steps = {
      guest: document.getElementById('room-guest-step'),
      setup: document.getElementById('room-setup-step'),
      lobby: document.getElementById('room-lobby-step'),
      results: document.getElementById('room-results-step')
    };

    this.#guestForm = document.getElementById('room-guest-form');
    this.#guestUsername = document.getElementById('room-guest-username');
    this.#guestError = document.getElementById('room-guest-error');

    this.#createBtn = document.getElementById('room-create-btn');
    this.#joinBtn = document.getElementById('room-join-btn');
    this.#codeInput = document.getElementById('room-code-input');
    this.#joinError = document.getElementById('room-join-error');

    this.#lobbyRoomInfo = document.getElementById('lobby-room-info');
    this.#lobbyCodeBadge = document.getElementById('lobby-code-badge');
    this.#lobbyShareUrl = document.getElementById('lobby-share-url');
    this.#lobbyCopyBtn = document.getElementById('lobby-copy-btn');
    this.#lobbyCopyFeedback = document.getElementById('lobby-copy-feedback');
    this.#lobbyPlayersCount = document.getElementById('lobby-players-count');
    this.#lobbyPlayersList = document.getElementById('lobby-players-list');
    this.#lobbyStatusText = document.getElementById('lobby-status-text');
    this.#lobbyCreatorName = document.getElementById('lobby-creator-name');
    this.#lobbyCityName = document.getElementById('lobby-city-name');
    this.#lobbyDiffLevel = document.getElementById('lobby-diff-level');
    this.#lobbySeriesCount = document.getElementById('lobby-series-count');
    this.#lobbyStartBtn = document.getElementById('lobby-start-btn');
    this.#lobbyWaitingMsg = document.getElementById('lobby-waiting-message');
    this.#lobbyLeaveBtn = document.getElementById('lobby-leave-btn');

    this.#resultsTableBody = document.getElementById('results-table-body');
    this.#resultsHomeBtn = document.getElementById('results-home-btn');
    this.#resultsRefreshBtn = document.getElementById('results-refresh-btn');

    this.#cityInput = document.getElementById('room-city-search');
    this.#cityDropdown = document.getElementById('room-city-dropdown');
    this.#diffInput = document.getElementById('room-diff-search');
    this.#diffDropdown = document.getElementById('room-diff-dropdown');
    this.#seriesInput = document.getElementById('room-series-input');
    this.#setupBackBtn = document.getElementById('room-back-btn');

    this.#setupCopyLink();
    this.#setupWelcomeForm();
  }

  #setupCopyLink() {
    if (this.#lobbyCopyBtn && this.#lobbyShareUrl) {
      this.#lobbyCopyBtn.addEventListener('click', () => {
        this.#lobbyShareUrl.select();
        this.#lobbyShareUrl.setSelectionRange(0, 99999);
        navigator.clipboard.writeText(this.#lobbyShareUrl.value)
          .then(() => {
            if (this.#lobbyCopyFeedback) {
              this.#lobbyCopyFeedback.classList.remove('hidden');
              setTimeout(() => {
                this.#lobbyCopyFeedback.classList.add('hidden');
              }, 2000);
            }
          })
          .catch(() => {});
      });
    }
  }

  #setupWelcomeForm() {
    const cityInput = this.#cityInput;
    const cityDropdown = this.#cityDropdown;
    const diffInput = this.#diffInput;
    const diffDropdown = this.#diffDropdown;

    if (diffInput && diffDropdown) {
      diffInput.addEventListener('click', (e) => {
        e.stopPropagation();
        diffDropdown.classList.toggle('hidden');
      });

      diffDropdown.querySelectorAll('li').forEach((item) => {
        item.addEventListener('click', () => {
          diffInput.value = item.textContent.trim();
          diffInput.dataset.value = item.getAttribute('data-value');
          diffDropdown.classList.add('hidden');
        });
      });
    }

    if (cityInput && cityDropdown) {
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
          li.innerHTML = `<strong>${city.name}</strong>`;
          li.addEventListener('click', () => {
            cityInput.value = city.name;
            cityInput.dataset.value = city.key;
            cityDropdown.classList.add('hidden');
          });
          cityDropdown.appendChild(li);
        });

        cityDropdown.classList.remove('hidden');
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

    document.addEventListener('click', (e) => {
      if (cityDropdown && cityInput && !cityInput.contains(e.target) && !cityDropdown.contains(e.target)) {
        cityDropdown.classList.add('hidden');
      }
      if (diffDropdown && diffInput && !diffInput.contains(e.target) && !diffDropdown.contains(e.target)) {
        diffDropdown.classList.add('hidden');
      }
    });

    if (diffInput && diffDropdown) {
      const firstItem = diffDropdown.querySelector('li');
      if (firstItem && !diffInput.value) {
        diffInput.value = firstItem.textContent.trim();
        diffInput.dataset.value = firstItem.getAttribute('data-value');
      }
    }

    const minusBtn = document.getElementById('series-minus-btn');
    const plusBtn = document.getElementById('series-plus-btn');
    const seriesInput = this.#seriesInput;

    if (minusBtn && plusBtn && seriesInput) {
      minusBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const current = parseInt(seriesInput.value, 10) || 10;
        const min = parseInt(seriesInput.min, 10) || 5;
        const step = parseInt(seriesInput.step, 10) || 5;
        if (current > min) {
          seriesInput.value = current - step;
        }
      });

      plusBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const current = parseInt(seriesInput.value, 10) || 10;
        const max = parseInt(seriesInput.max, 10) || 50;
        const step = parseInt(seriesInput.step, 10) || 5;
        if (current < max) {
          seriesInput.value = current + step;
        }
      });
    }
  }

  showScreen() {
    const screens = document.querySelectorAll('.screen');
    screens.forEach((screen) => {
      if (screen) screen.classList.remove('active');
    });
    if (this.#screens.room) {
      this.#screens.room.classList.add('active');
    }
  }

  showStep(stepName) {
    Object.values(this.#steps).forEach((step) => {
      if (step) step.classList.add('hidden');
    });
    if (this.#steps[stepName]) {
      this.#steps[stepName].classList.remove('hidden');
    }
  }

  bindGuestFormSubmit(callback) {
    if (this.#guestForm) {
      this.#guestForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = this.#guestUsername.value.trim();
        callback(username);
      });
    }
  }

  bindBackClick(callback) {
    if (this.#setupBackBtn) {
      this.#setupBackBtn.addEventListener('click', (e) => {
        e.preventDefault();
        callback();
      });
    }
  }

  bindCreateRoom(callback) {
    if (this.#createBtn) {
      this.#createBtn.addEventListener('click', callback);
    }
  }

  bindJoinRoom(callback) {
    if (this.#joinBtn) {
      this.#joinBtn.addEventListener('click', callback);
    }
    
    if (this.#codeInput) {
      this.#codeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          callback();
        }
      });
    }
  }

  bindStartGame(callback) {
    if (this.#lobbyStartBtn) {
      this.#lobbyStartBtn.addEventListener('click', callback);
    }
  }

  bindLeaveRoom(callback) {
    if (this.#lobbyLeaveBtn) {
      this.#lobbyLeaveBtn.addEventListener('click', callback);
    }
  }

  bindHomeClick(callback) {
    if (this.#resultsHomeBtn) {
      this.#resultsHomeBtn.addEventListener('click', callback);
    }
  }

  bindRefreshScores(callback) {
    if (this.#resultsRefreshBtn) {
      this.#resultsRefreshBtn.addEventListener('click', callback);
    }
  }

  getSetupConfig() {
    return {
      cityKey: this.#cityInput ? this.#cityInput.dataset.value : null,
      cityName: this.#cityInput ? this.#cityInput.value : null,
      difficulty: this.#diffInput ? this.#diffInput.dataset.value : 'easy',
      seriesCount: this.#seriesInput ? parseInt(this.#seriesInput.value, 10) : 10
    };
  }

  getCodeInputValue() {
    return this.#codeInput ? this.#codeInput.value.trim().toUpperCase() : '';
  }

  showGuestError(message) {
    if (this.#guestError) {
      this.#guestError.textContent = message;
      this.#guestError.classList.remove('hidden');
    }
  }

  hideGuestError() {
    if (this.#guestError) {
      this.#guestError.classList.add('hidden');
    }
  }

  showJoinError(message) {
    if (this.#joinError) {
      this.#joinError.textContent = message;
      this.#joinError.classList.remove('hidden');
    }
  }

  hideJoinError() {
    if (this.#joinError) {
      this.#joinError.classList.add('hidden');
    }
  }

  updateLobby(roomData, currentUsername) {
    if (this.#lobbyCodeBadge) this.#lobbyCodeBadge.textContent = roomData.roomCode;
    
    const shareUrl = `${window.location.origin}/#/room/${roomData.roomCode}`;
    if (this.#lobbyShareUrl) this.#lobbyShareUrl.value = shareUrl;

    if (this.#lobbyCreatorName) this.#lobbyCreatorName.textContent = roomData.createdBy;
    if (this.#lobbyDiffLevel) {
      const difficulties = { easy: 'Facile', medium: 'Moyen', hard: 'Difficile' };
      this.#lobbyDiffLevel.textContent = difficulties[roomData.difficulty] || roomData.difficulty;
    }

    if (this.#lobbySeriesCount) {
      this.#lobbySeriesCount.textContent = `${roomData.seriesCount || 10} Rues`;
    }
    
    if (this.#lobbyCityName) {
      const niceName = roomData.cityKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-');
      this.#lobbyCityName.textContent = niceName;
    }

    if (this.#lobbyRoomInfo) {
      this.#lobbyRoomInfo.textContent = `Salon créé par ${roomData.createdBy}. Attente du lancement.`;
    }

    if (this.#lobbyPlayersList && Array.isArray(roomData.participants)) {
      this.#lobbyPlayersCount.textContent = roomData.participants.length;
      
      this.#lobbyPlayersList.innerHTML = roomData.participants.map(p => {
        const isHost = p.username === roomData.createdBy;
        const initial = p.username.charAt(0).toUpperCase();
        
        let statusBadge = '';
        if (p.finished) {
          statusBadge = `<span class="player-badge-ready">Score: ${p.score} pts</span>`;
        } else if (roomData.status === 'playing') {
          statusBadge = `<span class="player-badge-host" style="background:rgba(99,102,241,0.15);color:#818cf8;border-color:rgba(99,102,241,0.25);">Joue...</span>`;
        }
        
        return `
          <li class="player-item">
            <div class="player-avatar">${initial}</div>
            <span class="player-name">${p.username} ${p.username === currentUsername ? '<strong>(Vous)</strong>' : ''}</span>
            ${isHost ? '<span class="player-badge-host">Hôte</span>' : ''}
            ${statusBadge}
          </li>
        `;
      }).join('');
    }

    const isCreator = roomData.createdBy === currentUsername;
    const pulseInd = document.querySelector('.pulse-indicator');
    
    if (roomData.status === 'playing') {
      if (this.#lobbyStatusText) this.#lobbyStatusText.textContent = 'Partie en cours !';
      if (pulseInd) pulseInd.className = 'pulse-indicator active';
    } else {
      if (this.#lobbyStatusText) this.#lobbyStatusText.textContent = 'En attente du lancement...';
      if (pulseInd) pulseInd.className = 'pulse-indicator';
    }

    if (isCreator) {
      if (this.#lobbyStartBtn) {
        this.#lobbyStartBtn.classList.remove('hidden');
        this.#lobbyStartBtn.disabled = roomData.status === 'playing';
      }
      if (this.#lobbyWaitingMsg) this.#lobbyWaitingMsg.classList.add('hidden');
    } else {
      if (this.#lobbyStartBtn) this.#lobbyStartBtn.classList.add('hidden');
      if (this.#lobbyWaitingMsg) this.#lobbyWaitingMsg.classList.remove('hidden');
    }
  }

  updateResults(participants) {
    if (!this.#resultsTableBody || !Array.isArray(participants)) return;
    
    const sorted = [...participants].sort((a, b) => (b.score || 0) - (a.score || 0));
    
    this.#resultsTableBody.innerHTML = sorted.map((p, idx) => {
      const scoreText = p.finished ? `<strong>${p.score}</strong> pts` : '<span style="color:var(--text-muted);">En cours...</span>';
      const statusText = p.finished 
        ? '<span class="player-badge-ready">Terminé</span>' 
        : '<span class="player-badge-host" style="background:rgba(99,102,241,0.15);color:#818cf8;border-color:rgba(99,102,241,0.25);">En cours...</span>';
        
      let rankDisplay = `${idx + 1}`;
      if (idx === 0) rankDisplay = '🥇';
      else if (idx === 1) rankDisplay = '🥈';
      else if (idx === 2) rankDisplay = '🥉';

      return `
        <tr>
          <td style="font-weight: 700; text-align: center; font-size: 1.1rem;">${rankDisplay}</td>
          <td>${p.username}</td>
          <td style="text-align: right;">${scoreText}</td>
          <td style="text-align: center;">${statusText}</td>
        </tr>
      `;
    }).join('');
  }
}
