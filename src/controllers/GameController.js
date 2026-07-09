import { GameSession } from '../models/GameSession.js';
import { OverpassService } from '../services/OverpassService.js';
import { SpatialService } from '../services/SpatialService.js';

export class GameController {
  #gameView;
  #mapView;
  #spatialService;
  #overpassService;
  #session;
  #router;

  #cityBboxes = {
    paris: '48.84,2.32,48.86,2.36',
    bordeaux: '44.82,-0.59,44.84,-0.55',
    lyon: '45.74,4.83,45.76,4.87',
    saint_cyr: '47.80,1.94,47.86,2.00'
  };

  #cityCenters = {
    paris: [48.8566, 2.3522],
    bordeaux: [44.8378, -0.5792],
    lyon: [45.75, 4.85],
    saint_cyr: [47.83, 1.97]
  };

  #hasPlacedMarker;
  #currentStepState;

  constructor(gameView, mapView, router) {
    this.#gameView = gameView;
    this.#mapView = mapView;
    this.#router = router;
    this.#spatialService = new SpatialService();
    this.#overpassService = new OverpassService();
    this.#session = null;
    this.#hasPlacedMarker = false;
    this.#currentStepState = 'guessing';

    this.#initEvents();
  }

  #initEvents() {
    this.#gameView.onStart((name, city, mode) => this.#startGame(name, city, mode));
    this.#gameView.onSubmitAnswer((answer) => this.#checkTextAnswer(answer));
    this.#gameView.onValidate(() => this.#validateGuess());
    this.#gameView.onNextStreet(() => this.#nextStreet());
    this.#gameView.onQuit(() => this.#quitGame());
    this.#gameView.onRestart(() => this.#restartGame());

    this.#mapView.onClickMap((lat, lng) => this.#handleMapClick(lat, lng));
  }

  async #startGame(playerName, cityKey, selectedMode) {
    try {
      this.#gameView.setInstruction('Chargement des données cartographiques...');

      const bbox = this.#cityBboxes[cityKey];
      const center = this.#cityCenters[cityKey];

      this.#mapView.initMap(center, 14);

      const geojson = await this.#overpassService.fetchStreets(bbox);
      const streets = geojson.features.filter(f => f.properties.name);

      if (streets.length === 0) {
        throw new Error('No streets found in this region. Please try again.');
      }

      // Limit to 5 streets for a quick, child-friendly game
      const selectedStreets = streets.slice(0, 5);

      this.#session = new GameSession(playerName, cityKey, selectedStreets, selectedMode);
      this.#saveState();
      
      this.#router.navigate('/play');
      this.#loadNextQuestion();
    } catch (error) {
      this.#gameView.showError(error.message);
      this.#router.navigate('/setup');
    }
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

    const cityCenter = this.#cityCenters[this.#session.city];
    this.#mapView.initMap(cityCenter, 14);
    this.#gameView.showScreen('game');
    this.#updateHUD();
    
    this.#loadNextQuestion();
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

  #updateHUD() {
    if (this.#session) {
      this.#gameView.updateHUD(
        this.#session.currentMode,
        this.#session.score
      );
    }
  }

  #loadNextQuestion() {
    if (!this.#session || this.#session.isFinished()) {
      this.#endGame();
      return;
    }

    const street = this.#session.getCurrentStreet();
    const mode = this.#session.currentMode;

    this.#hasPlacedMarker = false;
    this.#currentStepState = 'guessing';
    this.#gameView.setActionsState('none');
    this.#gameView.setModeLayout(mode);
    this.#updateHUD();
    this.#saveState();

    const cityCenter = this.#cityCenters[this.#session.city];

    if (mode === 'target') {
      this.#mapView.clearStreets();
      this.#mapView.setView(cityCenter, 14);
      this.#gameView.showBanner(true);
      this.#gameView.setBannerStreetName(street.properties.name);
      this.#gameView.setInstruction('Placez un marqueur sur la carte pour localiser la rue.');
    } else if (mode === 'identify') {
      this.#gameView.showBanner(false);
      this.#mapView.renderStreet(street, true);
      const bounds = L.geoJSON(street.geometry).getBounds();
      if (bounds.isValid()) {
        this.#mapView.setView(bounds.getCenter(), 15);
      }
      this.#gameView.setInstruction('Identifiez la rue en surbrillance. Saisissez son nom ci-dessous :');
    }
  }

  #handleMapClick(lat, lng) {
    if (!this.#session) return;

    const mode = this.#session.currentMode;
    if (mode === 'identify' || this.#currentStepState !== 'guessing') return;

    this.#mapView.placeTempMarker(lat, lng);
    this.#hasPlacedMarker = true;
    this.#gameView.setActionsState('validate');
  }

  #validateGuess() {
    if (!this.#session || this.#currentStepState !== 'guessing' || !this.#hasPlacedMarker) return;

    this.#currentStepState = 'validated';
    const latlng = this.#mapView.getTempMarkerLatLng();
    const street = this.#session.getCurrentStreet();
    const mode = this.#session.currentMode;

    const tolerance = 40;
    const buffer = this.#spatialService.calculateBuffer(street.geometry, tolerance);
    const isCorrect = this.#spatialService.isPointInPolygon(latlng.lat, latlng.lng, buffer);

    this.#mapView.showFeedback(latlng.lat, latlng.lng, isCorrect);
    this.#mapView.renderStreet(street, true);
    this.#mapView.fitToGuessAndStreet(latlng.lat, latlng.lng);

    if (isCorrect) {
      this.#session.incrementScore(10);
    }

    this.#updateHUD();
    this.#gameView.setActionsState('next');
  }

  #nextStreet() {
    if (!this.#session) return;
    this.#session.advance();
    this.#loadNextQuestion();
  }

  #checkTextAnswer(answer) {
    if (!this.#session || this.#currentStepState !== 'guessing') return;

    this.#currentStepState = 'validated';
    const street = this.#session.getCurrentStreet();
    const cleanAnswer = answer.toLowerCase().trim();
    const cleanCorrect = street.properties.name.toLowerCase().trim();

    const isCorrect = cleanAnswer === cleanCorrect || cleanCorrect.includes(cleanAnswer);

    if (isCorrect) {
      this.#session.incrementScore(15);
    }

    this.#mapView.renderStreet(street, true);
    this.#updateHUD();
    this.#gameView.setActionsState('next');
  }

  async #endGame() {
    if (!this.#session) return;

    const score = this.#session.score;
    const name = this.#session.playerName;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ player: name, score })
      });

      if (response.status === 401) {
        // Token expiré ou invalide
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        this.#gameView.showError('Session expirée. Veuillez vous reconnecter pour enregistrer votre score.');
        this.#router.navigate('/login');
        return; // Ne pas effacer l'état du jeu pour pouvoir reprendre l'enregistrement !
      }
    } catch (e) {
      console.error('Failed to post score', e);
    }

    this.#gameView.showCertificate(name, score);
    this.#router.navigate('/certificate');
    this.#clearState();
  }

  #quitGame() {
    this.#clearState();
    this.#router.navigate('/');
  }

  #restartGame() {
    this.#clearState();
    this.#router.navigate('/');
  }

  async loadLeaderboard() {
    try {
      const response = await fetch('/api/scores');
      if (response.ok) {
        const scores = await response.json();
        this.#gameView.renderLeaderboard(scores);
      } else {
        console.error('Failed to load leaderboard', response.status);
      }
    } catch (e) {
      console.error('Failed to fetch leaderboard', e);
    }
  }
}
