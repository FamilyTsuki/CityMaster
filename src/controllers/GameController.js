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
    paris: '48.835,2.315,48.875,2.375',
    bordeaux: '44.815,-0.61,44.86,-0.54',
    lyon: '45.73,4.81,45.78,4.88',
    saint_cyr: '47.80,1.93,47.86,2.01'
  };

  #cityCenters = {
    paris: [48.8566, 2.3522],
    bordeaux: [44.8378, -0.5792],
    lyon: [45.75, 4.85],
    saint_cyr: [47.83, 1.97]
  };

  #hasPlacedMarker;
  #currentStepState;
  #allCityStreets;

  constructor(gameView, mapView, router) {
    this.#gameView = gameView;
    this.#mapView = mapView;
    this.#router = router;
    this.#spatialService = new SpatialService();
    this.#overpassService = new OverpassService();
    this.#session = null;
    this.#hasPlacedMarker = false;
    this.#currentStepState = 'guessing';
    this.#allCityStreets = [];

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
      this.#gameView.showLoading('Chargement des données cartographiques...');

      const bbox = this.#cityBboxes[cityKey];
      const center = this.#cityCenters[cityKey];

      const mapReadyPromise = this.#mapView.initMap(center, 14, bbox);
      const streetsPromise = this.#overpassService.fetchStreets(bbox);

      const [_, geojson] = await Promise.all([mapReadyPromise, streetsPromise]);
      this.#allCityStreets = geojson.features.filter(f => f.properties.name);

      if (this.#allCityStreets.length === 0) {
        throw new Error('No streets found in this region. Please try again.');
      }
      const selectedStreets = this.#allCityStreets.slice(0, 5);

      this.#session = new GameSession(playerName, cityKey, selectedStreets, selectedMode);
      this.#saveState();
      
      this.#loadNextQuestion();
      setTimeout(() => {
        this.#router.navigate('/play');
      }, 100);
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

    const cityKey = this.#session.city;
    const cityCenter = this.#cityCenters[cityKey];
    const bbox = this.#cityBboxes[cityKey];

    this.#gameView.showLoading('Restauration de votre partie...');

    const mapReadyPromise = this.#mapView.initMap(cityCenter, 14, bbox);
    this.#updateHUD();

    const streetsPromise = this.#overpassService.fetchStreets(bbox);

    Promise.all([mapReadyPromise, streetsPromise]).then(([_, geojson]) => {
      this.#allCityStreets = geojson.features.filter(f => f.properties.name);
      this.#loadNextQuestion();
      setTimeout(() => {
        this.#gameView.showScreen('game');
        this.#mapView.invalidateSize();
      }, 100);
    }).catch(err => {
      console.error('Failed to load city streets for snapping on resume', err);
      this.#loadNextQuestion();
      setTimeout(() => {
        this.#gameView.showScreen('game');
        this.#mapView.invalidateSize();
      }, 100);
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
      this.#gameView.setInstruction(`📍 Placez un marqueur sur la carte pour trouver : ${street.properties.name}`);
    } else if (mode === 'identify') {
      this.#mapView.renderStreet(street, true);
      const bounds = L.geoJSON(street.geometry).getBounds();
      if (bounds.isValid()) {
        this.#mapView.setView(bounds.getCenter(), 15);
      }
      this.#gameView.showBanner(true);
      this.#gameView.setInstruction('🔎 Identifiez la rue en surbrillance. Saisissez son nom en bas :');
    }
  }

  async #handleMapClick(lat, lng) {
    if (!this.#session) return;

    const mode = this.#session.currentMode;
    if (mode === 'identify' || this.#currentStepState !== 'guessing') return;

    let targetLat = lat;
    let targetLng = lng;
    let selectedStreet = null;

    // Placer le marqueur immédiatement pour un retour visuel instantané
    this.#mapView.placeTempMarker(targetLat, targetLng);
    
    // Bloquer les clics multiples pendant le traitement (s'il y a un await)
    this.#currentStepState = 'calculating';

    if (this.#allCityStreets && this.#allCityStreets.length > 0) {
      const closest = this.#spatialService.findClosestStreet(lat, lng, this.#allCityStreets);
      if (closest && closest.point && closest.distance < 40) {
        targetLat = closest.point[0];
        targetLng = closest.point[1];
        selectedStreet = closest.street;
      }
      
      // Fallback uniqument si AUCUNE rue locale n'est trouvée très proche
      if (!selectedStreet) {
        try {
          this.#mapView.showMapLoader('Recherche de la rue...', false);
          const geojson = await this.#overpassService.fetchStreetNearPoint(lat, lng, 40);
          if (geojson && geojson.features && geojson.features.length > 0) {
            const closestAPI = this.#spatialService.findClosestStreet(lat, lng, geojson.features);
            if (closestAPI && closestAPI.point && closestAPI.distance < 40) {
              targetLat = closestAPI.point[0];
              targetLng = closestAPI.point[1];
              selectedStreet = closestAPI.street;
              this.#allCityStreets.push(selectedStreet);
            }
          }
        } catch (e) {
          console.error('Failed to fetch street near click point fallback', e);
        } finally {
          this.#mapView.hideMapLoader();
        }
      }
    }

    // Mettre à jour la position du marqueur sur la rue la plus proche
    this.#mapView.placeTempMarker(targetLat, targetLng);
    if (selectedStreet) {
      this.#mapView.renderSelection(selectedStreet, true);
    } else {
      this.#mapView.renderSelection(null, false);
    }
    
    this.#hasPlacedMarker = true;
    this.#gameView.setActionsState('validate');
    
    // Rétablir l'état pour permettre de re-cliquer si on change d'avis
    this.#currentStepState = 'guessing';
  }

  #validateGuess() {
    if (!this.#session || this.#currentStepState !== 'guessing' || !this.#hasPlacedMarker) return;

    this.#currentStepState = 'validated';
    const latlng = this.#mapView.getTempMarkerLatLng();
    const street = this.#session.getCurrentStreet();
    const mode = this.#session.currentMode;

    const distance = this.#spatialService.getDistanceToStreet(latlng.lat, latlng.lng, street.geometry);
    
    let pointsEarned = 0;
    let message = '';
    let isCorrect = false;

    if (distance <= 15) {
      pointsEarned = 100;
      isCorrect = true;
      message = `✅ Parfait ! Vous êtes exactement sur la rue. (+100 pts)`;
    } else if (distance <= 100) {
      const ratio = 1 - ((distance - 15) / 85);
      pointsEarned = Math.round(10 + (40 * ratio));
      isCorrect = true;
      message = `✅ Pas mal ! Vous êtes à ${Math.round(distance)}m de la rue. (+${pointsEarned} pts)`;
    } else {
      pointsEarned = 0;
      isCorrect = false;
      message = `❌ Raté. Vous étiez à ${Math.round(distance)}m. Voici le véritable emplacement.`;
    }

    const nearest = this.#spatialService.getNearestPoint(latlng.lat, latlng.lng, street.geometry);

    this.#mapView.showFeedbackLine(latlng.lat, latlng.lng, nearest[0], nearest[1], isCorrect);
    this.#mapView.renderStreet(street, true);
    this.#mapView.fitToGuessAndStreet(latlng.lat, latlng.lng, nearest[0], nearest[1]);

    if (pointsEarned > 0) {
      this.#session.incrementScore(pointsEarned);
    }
    
    this.#gameView.setInstruction(message);

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
      this.#gameView.setInstruction(`✅ Bonne réponse ! C'était bien : ${street.properties.name}`);
    } else {
      this.#gameView.setInstruction(`❌ Faux. La bonne réponse était : ${street.properties.name}`);
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
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        this.#gameView.showError('Session expirée. Veuillez vous reconnecter pour enregistrer votre score.');
        this.#router.navigate('/login');
        return;
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
