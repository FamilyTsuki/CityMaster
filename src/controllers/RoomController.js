export class RoomController {
  #router;
  #roomView;
  #gameView;
  #gameController;
  #pollingInterval;
  #currentRoomCode;
  #pendingRoomCode;
  #isTransitioning;

  constructor(router, roomView, gameView, gameController) {
    this.#router = router;
    this.#roomView = roomView;
    this.#gameView = gameView;
    this.#gameController = gameController;
    
    this.#pollingInterval = null;
    this.#currentRoomCode = null;
    this.#pendingRoomCode = null;
    this.#isTransitioning = false;

    this.#initEvents();
  }

  setRouter(router) {
    this.#router = router;
  }

  #initEvents() {
    this.#roomView.bindGuestFormSubmit((username, roomCode) => this.#handleGuestLogin(username, roomCode));
    this.#roomView.bindCreateRoom(() => this.#handleCreateRoom());
    this.#roomView.bindJoinRoom(() => this.#handleJoinRoom());
    this.#roomView.bindStartGame(() => this.#handleStartGame());
    this.#roomView.bindLeaveRoom(() => this.#handleLeaveRoom());
    this.#roomView.bindBackClick(() => {
      this.stopPolling();
      this.#router.navigate('/');
    });

    this.#roomView.bindHomeClick(() => {
      this.stopPolling();
      this.#router.navigate('/');
    });
    this.#roomView.bindRefreshScores(() => this.#fetchRoomDetails());
    this.#roomView.bindResetRoom(() => this.#handleResetRoom());
  }

  showSetup() {
    this.stopPolling();
    this.#currentRoomCode = null;
    this.#pendingRoomCode = null;

    this.#roomView.showScreen();
    
    if (this.#hasAccount()) {
      this.#roomView.showStep('setup');
    } else {
      this.#roomView.showStep('guest');
    }
  }

  async initRoom(params) {
    this.stopPolling();
    this.#isTransitioning = false;
    const code = params.code ? params.code.trim().toUpperCase() : null;
    
    if (!code) {
      this.showSetup();
      return;
    }

    this.#currentRoomCode = code;
    this.#roomView.showScreen();

    if (!this.#hasToken()) {
      this.#pendingRoomCode = code;
      const guestCodeInput = document.getElementById('room-guest-code');
      if (guestCodeInput && !guestCodeInput.value) {
        guestCodeInput.value = code;
      }
      this.#roomView.showStep('guest');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      const joinRes = await fetch(`/api/rooms/${code}/join`, {
        method: 'POST',
        headers
      });

      if (!joinRes.ok) {
        const data = await joinRes.json().catch(() => ({}));
        if (!this.#hasAccount()) {
          this.#roomView.showStep('guest');
          this.#roomView.showGuestError(data.error || 'Impossible de rejoindre ce salon.');
        } else {
          this.#roomView.showStep('setup');
          this.#roomView.showJoinError(data.error || 'Impossible de rejoindre ce salon.');
          this.#router.navigate('/room');
        }
        return;
      }

      this.#startPolling(code);

    } catch (error) {
      console.error('Error entering room:', error);
      if (!this.#hasAccount()) {
        this.#roomView.showStep('guest');
        this.#roomView.showGuestError('Erreur de connexion au serveur.');
      } else {
        this.#roomView.showStep('setup');
        this.#roomView.showJoinError('Erreur de connexion au serveur.');
        this.#router.navigate('/room');
      }
    }
  }

  async #handleGuestLogin(username, roomCode) {
    try {
      this.#roomView.hideGuestError();
      const codeToJoin = (roomCode || this.#pendingRoomCode || this.#currentRoomCode || '').trim().toUpperCase();

      if (!codeToJoin) {
        this.#roomView.showGuestError('Veuillez saisir le code du salon à rejoindre.');
        return;
      }

      const res = await fetch('/api/guest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        this.#roomView.showGuestError(data.error || 'Erreur lors de la connexion invité.');
        return;
      }

      const data = await res.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('is_guest', 'true');

      this.#gameView.setPlayerName(data.username);

      this.#pendingRoomCode = null;
      this.#router.navigate(`/room/${codeToJoin}`);
      this.initRoom({ code: codeToJoin });
    } catch (error) {
      console.error('Guest Login Error:', error);
      this.#roomView.showGuestError('Erreur de connexion au serveur.');
    }
  }

  async #handleCreateRoom() {
    try {
      this.#roomView.hideJoinError();
      const config = this.#roomView.getSetupConfig();
      if (!config.cityKey) {
        this.#roomView.showJoinError('Veuillez sélectionner une ville pour créer le salon.');
        return;
      }

      const token = localStorage.getItem('token');
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          cityKey: config.cityKey,
          difficulty: config.difficulty,
          seriesCount: config.seriesCount,
          mode: config.mode,
          validityHours: config.validityHours
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        this.#roomView.showJoinError(data.error || 'Impossible de créer la room.');
        return;
      }

      const data = await res.json();
      this.#router.navigate(`/room/${data.roomCode}`);
    } catch (error) {
      console.error('Create Room UI Error:', error);
      this.#roomView.showJoinError('Erreur réseau lors de la création du salon.');
    }
  }

  async #handleJoinRoom() {
    const code = this.#roomView.getCodeInputValue();
    if (!code || code.length < 3) {
      this.#roomView.showJoinError('Veuillez entrer un code de salon valide.');
      return;
    }
    this.#router.navigate(`/room/${code}`);
  }

  async #handleStartGame() {
    if (!this.#currentRoomCode) return;
    try {
      this.#gameView.showLoading('Lancement du test multijoueurs...');
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/rooms/${this.#currentRoomCode}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        await this.#roomView.showAlertModal('Erreur', data.error || 'Erreur lors du lancement de la partie.');
        this.#roomView.showScreen();
      }
    } catch (error) {
      console.error('Start Game UI Error:', error);
      this.#roomView.showScreen();
    }
  }

  async #handleResetRoom() {
    if (!this.#currentRoomCode) return;

    try {
      this.#gameView.showLoading('Réinitialisation du salon...');
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/rooms/${this.#currentRoomCode}/reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        await this.#roomView.showAlertModal('Erreur', data.error || 'Erreur lors de la réinitialisation du salon.');
        this.#roomView.showScreen();
        return;
      }

      this.#isTransitioning = false;
      this.#roomView.showScreen();
      this.stopPolling();
      this.#startPolling(this.#currentRoomCode);

    } catch (error) {
      console.error('Reset Room UI Error:', error);
      this.#roomView.showScreen();
    }
  }

  #handleLeaveRoom() {
    this.stopPolling();
    this.#currentRoomCode = null;
    this.#router.navigate('/room');
  }

  #startPolling(code) {
    this.stopPolling();
    this.#fetchRoomDetails();
    this.#pollingInterval = setInterval(() => {
      this.#fetchRoomDetails();
    }, 2000);
  }

  stopPolling() {
    if (this.#pollingInterval) {
      clearInterval(this.#pollingInterval);
      this.#pollingInterval = null;
    }
  }

  async #fetchRoomDetails() {
    if (!this.#currentRoomCode) return;
    try {
      const code = this.#currentRoomCode;
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const res = await fetch(`/api/rooms/${code}`, { headers });
      if (!res.ok) {
        if (res.status === 404 || res.status === 410) {
          this.stopPolling();
          const errData = await res.json().catch(() => ({}));
          await this.#roomView.showAlertModal('Salon indisponible', errData.error || 'Ce salon a expiré ou n\'existe plus.');
          this.#router.navigate('/room');
        }
        return;
      }

      const roomData = await res.json();
      const currentUsername = localStorage.getItem('username');
      const isCreatorOrAdmin = roomData.createdBy === currentUsername || localStorage.getItem('is_admin') === 'true';

      this.#roomView.updateLobby(roomData, currentUsername);

      if (roomData.status === 'playing' || roomData.status === 'finished') {
        const me = roomData.participants.find(p => p.username.toLowerCase() === (currentUsername || '').toLowerCase());
        if (me && me.finished) {
          this.#roomView.showStep('results');
          this.#roomView.updateResults(roomData.participants, isCreatorOrAdmin);
        } else {
          this.stopPolling();
          if (this.#isTransitioning) return;
          this.#isTransitioning = true;
          
          const mode = roomData.mode || 'target';
          this.#gameView.showLoading('Chargement de la partie...');
          
          this.#gameController.startRoomGame(
            currentUsername,
            roomData.cityData,
            mode,
            roomData.difficulty,
            roomData.testId,
            roomData.roomCode,
            roomData.seriesCount
          );
        }
      } else {
        this.#roomView.showStep('lobby');
      }

    } catch (error) {
      console.error('Error fetching room details:', error);
    }
  }

  #hasAccount() {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const isGuest = localStorage.getItem('is_guest') === 'true';
    return token !== null && username !== null && !isGuest;
  }

  #hasToken() {
    return localStorage.getItem('token') !== null && localStorage.getItem('username') !== null;
  }

  #isAuthenticated() {
    return this.#hasAccount();
  }
}
