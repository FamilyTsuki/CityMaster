import { GameSession } from '../models/GameSession.js';
import { OverpassService } from '../services/OverpassService.js';
import { SpatialService } from '../services/SpatialService.js';
import { I18nService } from '../services/I18nService.js';
import { CustomLotissementService } from '../services/CustomLotissementService.js';

export class GameController {
  #gameView;
  #mapView;
  #certificateView;
  #scoreController;
  #spatialService;
  #overpassService;
  #session;
  #router;
  #audioService;

  #hasPlacedMarker;
  #currentStepState;
  #allCityStreets;
  #activeAbortController;
  #timerInterval;
  #totalTime;
  #remainingTime;
  #lastGameSettings;

  constructor(gameView, mapView, certificateView, scoreController, router, audioService) {
    this.#gameView = gameView;
    this.#mapView = mapView;
    this.#certificateView = certificateView;
    this.#scoreController = scoreController;
    this.#router = router;
    this.#audioService = audioService;
    this.#spatialService = new SpatialService();
    this.#overpassService = new OverpassService();
    this.#session = null;
    this.#hasPlacedMarker = false;
    this.#currentStepState = 'guessing';
    this.#allCityStreets = [];
    this.#activeAbortController = null;
    this.#timerInterval = null;
    this.#totalTime = 90;
    this.#remainingTime = 0;

    this.#initEvents();
  }

  #initEvents() {
    this.#gameView.onStart((name, city, mode, difficultyOptions) => this.#startGame(name, city, mode, difficultyOptions));
    this.#gameView.onSubmitAnswer((answer) => this.#checkTextAnswer(answer));
    this.#gameView.onValidate(() => this.#validateGuess());
    this.#gameView.onNextStreet(() => this.#nextStreet());
    this.#gameView.onQuit(() => this.#quitGame());
    this.#gameView.onRestart(() => this.#restartGame());
    if (this.#gameView.onHome) {
      this.#gameView.onHome(() => this.#goHome());
    }
    this.#gameView.onMapStyleChange((style) => this.#mapView.setMapStyle(style));

    this.#mapView.onClickMap((lat, lng) => this.#handleMapClick(lat, lng));
  }

  async #startGame(playerName, cityData, selectedMode, difficulty = 'hard', testNumber = null) {
    try {
      localStorage.setItem('citymaster_last_difficulty', difficulty);
      localStorage.setItem('citymaster_last_mode', selectedMode);
      const cityKey = cityData.key;
      const bbox = cityData.bbox;
      const center = cityData.center;

      const i18n = I18nService.getInstance();

      this.#gameView.updateComboBadge(1);
      this.#gameView.showLoading(i18n.t('loading.generating_city'));

      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const generateResponse = await fetch('/api/cities/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          cityKey: cityKey,
          name: cityData.name,
          osmId: cityData.osmId,
          bbox: bbox
        })
      });

      if (!generateResponse.ok) {
        if (generateResponse.status === 401 || generateResponse.status === 403) {
          this.#handleAuthError();
          return;
        }
        const errData = await generateResponse.json().catch(() => ({}));
        throw new Error(i18n.formatError(errData.error));
      }

      this.#gameView.showLoading(i18n.t('loading.init_session'));

      const startResponse = await fetch('/api/game/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          cityKey,
          mode: selectedMode,
          difficulty,
          testNumber
        })
      });

      if (!startResponse.ok) {
        if (startResponse.status === 401 || startResponse.status === 403) {
          this.#handleAuthError();
          return;
        }
        const errData = await startResponse.json().catch(() => ({}));
        throw new Error(i18n.formatError(errData.error));
      }

      const startData = await startResponse.json();

      this.#gameView.showLoading(i18n.t('loading.loading_streets'));

      const hideLabels = selectedMode === 'target';
      const mapReadyPromise = this.#mapView.initMap(center, 14, bbox, hideLabels);
      const streetsPromise = this.#overpassService.fetchStreets(bbox, cityKey);

      const [_, geojson, customFeatures] = await Promise.all([
        mapReadyPromise, 
        streetsPromise,
        this.#fetchCustomDistricts(cityKey)
      ]);
      
      this.#allCityStreets = [...geojson.features.filter(f => f.properties && f.properties.name), ...customFeatures];
      
      const lotissements = this.#allCityStreets.filter(f => 
        f.properties && 
        f.properties.isLotissement && 
        (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
      );
      this.#mapView.renderLotissements(lotissements);

      const streetNames = Array.from(new Set(this.#allCityStreets.map(f => f.properties.name)));
      this.#gameView.setupAutocomplete(streetNames);
      
      if (this.#allCityStreets.length === 0) {
        throw new Error(i18n.t('errors.network_error'));
      }

      this.#session = new GameSession(
        playerName,
        cityData,
        selectedMode,
        startData.gameToken,
        startData.nextPrompt,
        difficulty,
        testNumber
      );
      this.#saveState();
      
      this.#loadNextQuestion();
      this.#gameView.showScreen('game');
      this.#mapView.invalidateSize();
      this.#router.navigate('/play', true);
    } catch (error) {
      const i18n = I18nService.getInstance();
      this.#gameView.showError(i18n.formatError(error.message));
      this.#router.navigate('/setup');
    }
  }

  #handleAuthError() {
    this.#clearState();
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    const i18n = I18nService.getInstance();
    this.#gameView.showError(i18n.t('errors.session_expired'));
    this.#router.navigate('/login');
  }

  #startRoundTimer() {
    this.#stopRoundTimer();

    const difficulty = localStorage.getItem('citymaster_last_difficulty') || 'hard';
    if (difficulty === 'easy') {
      this.#totalTime = 45;
    } else if (difficulty === 'medium' || difficulty === 'lotissement') {
      this.#totalTime = 60;
    } else {
      this.#totalTime = 90;
    }

    this.#remainingTime = this.#totalTime;
    this.#gameView.showTimer();
    this.#gameView.updateTimer(this.#remainingTime, this.#totalTime);

    this.#timerInterval = setInterval(() => {
      this.#remainingTime -= 0.1;
      if (this.#remainingTime <= 0) {
        this.#remainingTime = 0;
        this.#stopRoundTimer();
        
        if (this.#session && this.#currentStepState === 'guessing') {
          if (this.#session.currentMode === 'target') {
            this.#validateGuess(true);
          } else if (this.#session.currentMode === 'sprint') {
            this.#submitRoundToBackend(null, this.#totalTime).then(result => {
              this.#session.gameToken = result.gameToken;
              this.#session.score = result.totalScore;
              this.#session.sprintHistory = result.sprintHistory;
              this.#session.setFinished(result.isFinished);
              this.#session.currentPrompt = result.nextPrompt;

              this.#saveState();

              if (result.isFinished) {
                this.#endGame();
              } else {
                this.#loadNextQuestion();
              }
            }).catch(err => {
              this.#gameView.showError(err.message);
            });
          } else {
            this.#checkTextAnswer("", true);
          }
        }
      } else {
        this.#gameView.updateTimer(this.#remainingTime, this.#totalTime);
      }
    }, 100);
  }

  #stopRoundTimer() {
    if (this.#timerInterval) {
      clearInterval(this.#timerInterval);
      this.#timerInterval = null;
    }
    this.#gameView.hideTimer();
  }

  hasActiveSession() {
    return this.#session !== null;
  }

  resumeGame() {
    const savedState = localStorage.getItem('citymaster_session');
    if (!savedState) return false;

    this.#session = GameSession.deserialize(savedState);
    if (!this.#session) {
      this.#clearState();
      return false;
    }

    const city = this.#session.city;
    const cityKey = city.key;
    const bbox = city.bbox;
    const cityCenter = city.center;

    this.#gameView.showLoading('Restauration de votre partie...');

    const hideLabels = this.#session.currentMode === 'target';
    const mapReadyPromise = this.#mapView.initMap(cityCenter, 14, bbox, hideLabels);
    this.#updateHUD();

    const streetsPromise = this.#overpassService.fetchStreets(bbox, cityKey);
    const customDistrictsPromise = this.#fetchCustomDistricts(cityKey);

    Promise.all([mapReadyPromise, streetsPromise, customDistrictsPromise]).then(([_, geojson, customFeatures]) => {
      this.#allCityStreets = [...geojson.features.filter(f => f.properties && f.properties.name), ...customFeatures];
      const streetNames = Array.from(new Set(this.#allCityStreets.map(f => f.properties.name)));
      this.#gameView.setupAutocomplete(streetNames);
      this.#loadNextQuestion();
      this.#gameView.showScreen('game');
      this.#mapView.invalidateSize();
      this.#router.navigate('/play', true);
    }).catch(err => {
      console.error('Failed to load city streets for snapping on resume', err);
      this.#clearState();
      this.#router.navigate('/setup');
    });

    return true;
  }

  #saveState() {
    if (this.#session) {
      localStorage.setItem('citymaster_session', this.#session.serialize());
    }
  }

  #clearState() {
    localStorage.removeItem('citymaster_session');
    this.#session = null;
  }

  async #fetchCustomDistricts(cityKey) {
    try {
      const response = await fetch(`/assets/data/custom_districts.json?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        return data[cityKey] || [];
      }
    } catch (err) {
      console.warn('Could not fetch custom districts:', err);
    }
    return [];
  }

  #updateHUD() {
    if (this.#session) {
      this.#gameView.updateHUD(
        this.#session.currentMode,
        this.#session.score
      );
      this.#gameView.updateRoundProgress(
        this.#session.roundIndex || 1,
        5,
        this.#session.roundHistory || []
      );
    }
  }

  #loadNextQuestion() {
    if (!this.#session || this.#session.isFinished()) {
      this.#endGame();
      return;
    }

    const prompt = this.#session.currentPrompt;
    const mode = this.#session.currentMode;

    this.#hasPlacedMarker = false;
    this.#currentStepState = 'guessing';
    this.#gameView.setActionsState('none');
    this.#gameView.setModeLayout(mode);
    this.#updateHUD();
    this.#saveState();

    const cityCenter = this.#session.city.center;

    if (mode === 'target' || mode === 'sprint') {
      this.#mapView.clearStreets();
      this.#mapView.setView(cityCenter, 14);
      
      this.#gameView.showBanner(true);
      const promptText = I18nService.getInstance().t('feedback.prompt_target', { name: prompt.streetName });
      this.#gameView.setInstruction(mode === 'sprint' ? `⚡ ${promptText}` : `📍 ${promptText}`);
    } else if (mode === 'identify') {
      this.#mapView.renderStreet(prompt.geometry, true);
      const bounds = L.geoJSON(prompt.geometry).getBounds();
      if (bounds.isValid()) {
        this.#mapView.setView(bounds.getCenter(), 15);
      }
      this.#gameView.showBanner(true);
      this.#gameView.setInstruction(`🔎 ${I18nService.getInstance().t('feedback.prompt_identify')}`);
    }

    this.#startRoundTimer();
  }

  #handleMapClick(lat, lng) {
    if (!this.#session) return;

    const mode = this.#session.currentMode;
    if (mode === 'identify' || this.#currentStepState !== 'guessing') return;

    let targetLat = lat;
    let targetLng = lng;
    let selectedStreet = null;

    this.#mapView.placeTempMarker(targetLat, targetLng);
    this.#mapView.renderSelection(null, false);

    if (this.#allCityStreets && this.#allCityStreets.length > 0) {
      let streetsToSearch = this.#allCityStreets;
      let maxDist = 120;
      if (this.#session.difficulty === 'lotissement') {
        streetsToSearch = this.#allCityStreets.filter(f => f.properties && f.properties.isLotissement);
        maxDist = 0;
      }
      const closest = this.#spatialService.findClosestStreet(lat, lng, streetsToSearch);
      if (closest && closest.point && closest.distance <= maxDist) {
        targetLat = closest.point[0];
        targetLng = closest.point[1];
        selectedStreet = closest.street;
      }
    }

    if (mode === 'sprint') {
      this.#stopRoundTimer();
      const elapsedSeconds = this.#totalTime - this.#remainingTime;
      const guess = selectedStreet ? { lat: targetLat, lng: targetLng } : null;

      this.#submitRoundToBackend(guess, elapsedSeconds).then(result => {
        this.#session.gameToken = result.gameToken;
        this.#session.score = result.totalScore;
        this.#session.sprintHistory = result.sprintHistory;
        this.#session.setFinished(result.isFinished);
        this.#session.currentPrompt = result.nextPrompt;

        this.#saveState();

        if (result.isFinished) {
          this.#endGame();
        } else {
          this.#loadNextQuestion();
        }
      }).catch(err => {
        this.#gameView.showError(err.message);
      });
      return;
    }

    this.#mapView.placeTempMarker(targetLat, targetLng);
    if (selectedStreet) {
      this.#mapView.renderSelection(selectedStreet, true);
    } else {
      this.#mapView.renderSelection(null, false);
    }
    
    this.#hasPlacedMarker = true;
    this.#gameView.setActionsState('validate');
  }

  async #submitRoundToBackend(guess, elapsedSeconds) {
    const token = localStorage.getItem('token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    const response = await fetch('/api/game/submit-round', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({
        gameToken: this.#session.gameToken,
        guess,
        elapsedSeconds
      })
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        this.#handleAuthError();
        throw new Error(I18nService.getInstance().t('errors.session_expired'));
      }
      const errData = await response.json().catch(() => ({}));
      throw new Error(I18nService.getInstance().formatError(errData.error));
    }

    return await response.json();
  }

  async #validateGuess(forced = false) {
    if (!this.#session || this.#currentStepState !== 'guessing') return;
    if (!forced && !this.#hasPlacedMarker) return;

    this.#stopRoundTimer();
    this.#currentStepState = 'validated';
    
    let latlng = this.#mapView.getTempMarkerLatLng();
    const elapsedSeconds = this.#totalTime - this.#remainingTime;

    const guess = latlng ? { lat: latlng.lat, lng: latlng.lng } : null;

    try {
      const result = await this.#submitRoundToBackend(guess, elapsedSeconds);

      this.#session.gameToken = result.gameToken;
      this.#session.score = result.totalScore;
      this.#session.setFinished(result.isFinished);
      if (result.feedback) {
        this.#session.addRoundResult({
          score: result.feedback.pointsEarned || 0,
          isCorrect: result.feedback.isCorrect || false
        });
      }
      this.#session.currentPrompt = result.nextPrompt;
      this.#saveState();

      const feedback = result.feedback;
      const i18n = I18nService.getInstance();
      let displayMsg = feedback.message;
      if (feedback.code) {
        displayMsg = i18n.t(`feedback.${feedback.code}`, {
          distance: feedback.distance,
          name: feedback.correctName
        });
        if (feedback.timeBonus) {
          displayMsg += i18n.t('feedback.time_bonus', { bonus: feedback.timeBonus });
        }
      }
      this.#gameView.setInstruction(displayMsg);
      this.#gameView.updateComboBadge(feedback.multiplier);

      if (feedback.multiplier > 1) {
        this.#audioService.playCombo(feedback.multiplier);
      } else if (feedback.isCorrect) {
        this.#audioService.playSuccess();
      } else {
        this.#audioService.playError();
      }

      this.#updateHUD();

      const targetLatLng = this.#spatialService.getNearestPoint(
        latlng ? latlng.lat : this.#session.city.center[0], 
        latlng ? latlng.lng : this.#session.city.center[1], 
        feedback.geometry
      );

      this.#mapView.renderSelection(feedback.geometry, true);
      this.#mapView.showFeedbackLine(
        latlng ? latlng.lat : targetLatLng[0], 
        latlng ? latlng.lng : targetLatLng[1], 
        targetLatLng[0], 
        targetLatLng[1], 
        feedback.isCorrect
      );

      this.#mapView.fitToGuessAndStreet(
        latlng ? latlng.lat : targetLatLng[0], 
        latlng ? latlng.lng : targetLatLng[1], 
        targetLatLng[0], 
        targetLatLng[1]
      );

      this.#gameView.setActionsState('next');
    } catch (err) {
      this.#gameView.showError(err.message);
    }
  }

  #nextStreet() {
    if (!this.#session) return;
    this.#loadNextQuestion();
  }

  async #checkTextAnswer(answer, forced = false) {
    if (!this.#session || this.#currentStepState !== 'guessing') return;

    this.#stopRoundTimer();
    this.#currentStepState = 'validated';
    const elapsedSeconds = this.#totalTime - this.#remainingTime;

    try {
      const result = await this.#submitRoundToBackend(answer, elapsedSeconds);

      this.#session.gameToken = result.gameToken;
      this.#session.score = result.totalScore;
      this.#session.setFinished(result.isFinished);
      if (result.feedback) {
        this.#session.addRoundResult({
          score: result.feedback.pointsEarned || 0,
          isCorrect: result.feedback.isCorrect || false
        });
      }
      this.#session.currentPrompt = result.nextPrompt;
      this.#saveState();

      const feedback = result.feedback;
      this.#gameView.setInstruction(feedback.message);
      this.#gameView.updateComboBadge(feedback.multiplier);

      if (feedback.multiplier > 1) {
        this.#audioService.playCombo(feedback.multiplier);
      } else if (feedback.isCorrect) {
        this.#audioService.playSuccess();
      } else {
        this.#audioService.playError();
      }

      this.#updateHUD();

      this.#mapView.renderStreet(feedback.geometry, true);
      this.#gameView.setActionsState('next');
    } catch (err) {
      this.#gameView.showError(err.message);
    }
  }

  async #endGame() {
    if (!this.#session) return;

    const score = this.#session.score;
    const name = this.#session.playerName;
    const mode = this.#session.currentMode;
    const sprintHistory = this.#session.sprintHistory;

    this.#lastGameSettings = {
      playerName: name,
      cityData: this.#session.city,
      selectedMode: mode,
      difficulty: this.#session.difficulty,
      testNumber: this.#session.testNumber
    };

    this.#certificateView.render(name, score, mode, sprintHistory, this.#session.testNumber);
    this.#gameView.showScreen('certificate');
    this.#router.navigate('/certificate');
    this.#clearState();
  }

  #quitGame() {
    this.#stopRoundTimer();
    this.#clearState();
    this.#router.navigate('/');
  }

  #goHome() {
    this.#stopRoundTimer();
    this.#clearState();
    this.#router.navigate('/');
  }

  #restartGame() {
    this.#stopRoundTimer();
    this.#clearState();
    if (this.#lastGameSettings) {
      this.#startGame(
        this.#lastGameSettings.playerName,
        this.#lastGameSettings.cityData,
        this.#lastGameSettings.selectedMode,
        this.#lastGameSettings.difficulty,
        this.#lastGameSettings.testNumber
      );
    } else {
      this.#router.navigate('/');
    }
  }
}
