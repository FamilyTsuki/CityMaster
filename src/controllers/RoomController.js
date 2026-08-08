export class RoomController {
  constructor(router, roomView, gameView, gameController) {
    this.router = router;
    this.roomView = roomView;
    this.gameView = gameView;
    this.gameController = gameController;
    
    this.pollingInterval = null;
    this.currentRoomCode = null;
    this.pendingRoomCode = null;
    this.isTransitioning = false;

    this.#initEvents();
  }

  #initEvents() {
    this.roomView.bindGuestFormSubmit((username) => this.#handleGuestLogin(username));
    this.roomView.bindCreateRoom(() => this.#handleCreateRoom());
    this.roomView.bindJoinRoom(() => this.#handleJoinRoom());
    this.roomView.bindStartGame(() => this.#handleStartGame());
    this.roomView.bindLeaveRoom(() => this.#handleLeaveRoom());
    this.roomView.bindBackClick(() => {
      this.#stopPolling();
      this.router.navigate('/');
    });

    this.roomView.bindHomeClick(() => {
      this.#stopPolling();
      this.router.navigate('/');
    });
    this.roomView.bindRefreshScores(() => this.#fetchRoomDetails());
  }

  showSetup() {
    this.#stopPolling();
    this.currentRoomCode = null;
    this.pendingRoomCode = null;

    this.roomView.showScreen();
    
    if (this.#isAuthenticated()) {
      this.roomView.showStep('setup');
    } else {
      this.roomView.showStep('guest');
    }
  }

  async initRoom(params) {
    this.#stopPolling();
    this.isTransitioning = false;
    const code = params.code ? params.code.trim().toUpperCase() : null;
    
    if (!code) {
      this.router.navigate('/room');
      return;
    }

    this.currentRoomCode = code;
    this.roomView.showScreen();

    if (!this.#isAuthenticated()) {
      this.pendingRoomCode = code;
      this.roomView.showStep('guest');
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
        this.roomView.showStep('setup');
        this.roomView.showJoinError(data.error || 'Impossible de rejoindre ce salon.');
        this.router.navigate('/room');
        return;
      }

      this.#startPolling(code);

    } catch (error) {
      console.error('Error entering room:', error);
      this.roomView.showStep('setup');
      this.roomView.showJoinError('Erreur de connexion au serveur.');
      this.router.navigate('/room');
    }
  }

  async #handleGuestLogin(username) {
    try {
      this.roomView.hideGuestError();
      const res = await fetch('/api/guest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        this.roomView.showGuestError(data.error || 'Erreur lors de la connexion invité.');
        return;
      }

      const data = await res.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('is_guest', 'true');

      this.gameView.setPlayerName(data.username);

      const targetCode = this.pendingRoomCode || this.currentRoomCode;
      if (targetCode) {
        this.pendingRoomCode = null;
        this.initRoom({ code: targetCode });
      } else {
        this.roomView.showStep('setup');
      }
    } catch (error) {
      console.error('Guest Login Error:', error);
      this.roomView.showGuestError('Erreur de connexion au serveur.');
    }
  }

  async #handleCreateRoom() {
    try {
      this.roomView.hideJoinError();
      const config = this.roomView.getSetupConfig();
      if (!config.cityKey) {
        this.roomView.showJoinError('Veuillez sélectionner une ville pour créer le salon.');
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
          mode: config.mode
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        this.roomView.showJoinError(data.error || 'Impossible de créer la room.');
        return;
      }

      const data = await res.json();
      this.router.navigate(`/room/${data.roomCode}`);
    } catch (error) {
      console.error('Create Room UI Error:', error);
      this.roomView.showJoinError('Erreur réseau lors de la création du salon.');
    }
  }

  async #handleJoinRoom() {
    const code = this.roomView.getCodeInputValue();
    if (!code || code.length < 3) {
      this.roomView.showJoinError('Veuillez entrer un code de salon valide.');
      return;
    }
    this.router.navigate(`/room/${code}`);
  }

  async #handleStartGame() {
    if (!this.currentRoomCode) return;
    try {
      this.gameView.showLoading('Lancement du test multijoueurs...');
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/rooms/${this.currentRoomCode}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Erreur lors du lancement de la partie.');
        this.roomView.showScreen();
      }
    } catch (error) {
      console.error('Start Game UI Error:', error);
      this.roomView.showScreen();
    }
  }

  #handleLeaveRoom() {
    this.#stopPolling();
    this.currentRoomCode = null;
    this.router.navigate('/room');
  }

  #startPolling(code) {
    this.#stopPolling();
    this.#fetchRoomDetails();
    this.pollingInterval = setInterval(() => {
      this.#fetchRoomDetails();
    }, 2000);
  }

  #stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  async #fetchRoomDetails() {
    if (!this.currentRoomCode) return;
    try {
      const code = this.currentRoomCode;
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const res = await fetch(`/api/rooms/${code}`, { headers });
      if (!res.ok) {
        if (res.status === 404) {
          this.#stopPolling();
          alert('Le salon a été fermé ou n\'existe pas.');
          this.router.navigate('/room');
        }
        return;
      }

      const roomData = await res.json();
      const currentUsername = localStorage.getItem('username');

      this.roomView.updateLobby(roomData, currentUsername);

      if (roomData.status === 'playing') {
        this.#stopPolling();
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        
        const me = roomData.participants.find(p => p.username === currentUsername);
        if (me && me.finished) {
          this.roomView.showStep('results');
          this.roomView.updateResults(roomData.participants);
        } else {
          const mode = roomData.mode || 'target';
          this.gameView.showLoading('Chargement de la partie...');
          
          this.gameController.startRoomGame(
            currentUsername,
            roomData.cityData,
            mode,
            roomData.difficulty,
            roomData.testId,
            roomData.roomCode,
            roomData.seriesCount
          );
        }
      } else if (roomData.status === 'finished') {
        this.roomView.showStep('results');
        this.roomView.updateResults(roomData.participants);
      } else {
        this.roomView.showStep('lobby');
      }

    } catch (error) {
      console.error('Error fetching room details:', error);
    }
  }

  #isAuthenticated() {
    return localStorage.getItem('token') !== null && localStorage.getItem('username') !== null;
  }
}
