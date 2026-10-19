import { GameSession } from "../models/GameSession.js";
import { OverpassService } from "../services/OverpassService.js";
import {
  SpatialService,
  mergeCityStreets,
} from "../services/SpatialService.js";
import { ApiService } from "../services/ApiService.js";
import { I18nService } from "../services/I18nService.js";
import { NetworkService } from "../services/NetworkService.js";
import { StorageService } from "../services/StorageService.js";
import { RouteDifficultyService } from "../services/RouteDifficultyService.js";

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
  #lastClickedStreetName;
  #lastFeedback;
  #isOfflineGame;
  #offlineStreets;
  #offlineRoundIndex;
  #offlineScores;
  #offlineStreakCount;

  constructor(
    gameView,
    mapView,
    certificateView,
    scoreController,
    router,
    audioService,
  ) {
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
    this.#currentStepState = "guessing";
    this.#allCityStreets = [];
    this.#activeAbortController = null;
    this.#timerInterval = null;
    this.#totalTime = 90;
    this.#remainingTime = 0;
    this.#lastGameSettings = null;
    this.#lastClickedStreetName = null;
    this.#lastFeedback = null;
    this.#isOfflineGame = false;
    this.#offlineStreets = [];
    this.#offlineRoundIndex = 0;
    this.#offlineScores = [];
    this.#offlineStreakCount = 0;

    this.#initEvents();
  }

  #initEvents() {
    this.#gameView.onStart((name, city, mode, difficultyOptions) =>
      this.#startGame(name, city, mode, difficultyOptions),
    );
    this.#gameView.onSubmitAnswer((answer) => this.#checkTextAnswer(answer));
    this.#gameView.onValidate(() => this.#validateGuess());
    this.#gameView.onNextStreet(() => this.#nextStreet());
    this.#gameView.onQuit(() => this.#quitGame());
    this.#gameView.onRestart(() => this.#restartGame());
    if (this.#gameView.onHome) {
      this.#gameView.onHome(() => this.#goHome());
    }
    this.#gameView.onMapStyleChange((style) =>
      this.#mapView.setMapStyle(style),
    );
    this.#gameView.onReportRequest(() => this.#handleReportRequest());
    this.#gameView.onReportClose(() => this.#resumeRoundTimer());

    this.#mapView.onClickMap((lat, lng) => this.#handleMapClick(lat, lng));
  }

  async #startGame(
    playerName,
    cityData,
    selectedMode = "target",
    difficulty = "hard",
    testNumber = null,
    seriesCount = null,
  ) {
    try {
      const mode = selectedMode || "target";
      const diff = difficulty || "hard";
      localStorage.setItem("citymaster_last_difficulty", diff);
      localStorage.setItem("citymaster_last_mode", mode);

      if (!cityData || typeof cityData !== "object") {
        cityData = { key: "paris", name: "Paris" };
      }

      let cityKey = cityData.key || "paris";
      let bbox = cityData.bbox;
      let center = cityData.center;

      if (!bbox || !center || !cityData.osmId) {
        try {
          const res = await ApiService.get(
            `/cities?q=${encodeURIComponent(cityData.name || cityKey)}`,
          );
          if (res.ok && Array.isArray(res.data)) {
            const matched = res.data.find(
              (c) =>
                c.key === cityKey ||
                c.name.toLowerCase() ===
                  (cityData.name || "").toLowerCase().trim(),
            );
            if (matched) {
              cityData = matched;
              cityKey = matched.key;
              bbox = matched.bbox;
              center = matched.center;
            }
          }
        } catch (e) {}
      }

      const i18n = I18nService.getInstance();
      const isOnline = NetworkService.getInstance().isOnline();
      let startData = null;
      let geojson = null;

      if (!isOnline) {
        const cached = await StorageService.getCityRecord(cityKey);
        if (!cached || !cached.data) {
          throw new Error(
            i18n.t(
              "offline.city_not_cached",
              {},
              "Cette ville n'est pas encore enregistrée pour le mode hors-ligne. Jouez-y d'abord avec une connexion Internet pour la sauvegarder.",
            ),
          );
        }

        this.#isOfflineGame = true;
        geojson = cached.data;
        if (cached.cityData) {
          cityData = { ...cityData, ...cached.cityData };
          bbox = cityData.bbox || bbox;
          center = cityData.center || center;
        }

        this.#gameView.updateComboBadge(1);
        this.#gameView.showLoading(i18n.t("loading.loading_streets"));

        const hideLabels = selectedMode === "target";
        await this.#mapView.initMap(center, 14, bbox, hideLabels);

        const [customDistricts, customRoutes] = await Promise.all([
          this.#fetchCustomDistricts(cityKey),
          this.#fetchCustomRoutes(cityKey),
        ]);

        this.#allCityStreets = mergeCityStreets(
          geojson.features || [],
          customDistricts,
          customRoutes,
        );

        let eligibleStreets = this.#allCityStreets.filter(
          (f) =>
            f &&
            f.properties &&
            f.properties.name &&
            f.properties.name.trim().length > 0 &&
            f.geometry,
        );

        if (diff === "lotissement") {
          eligibleStreets = this.#allCityStreets.filter(
            (f) =>
              f &&
              f.properties &&
              f.properties.isLotissement &&
              (f.geometry.type === "Polygon" ||
                f.geometry.type === "MultiPolygon"),
          );
        } else if (diff === "easy" || diff === "medium" || diff === "hard") {
          const matching = eligibleStreets.filter((f) => {
            const d = RouteDifficultyService.getRouteDifficulty(
              f,
              center ? center[0] : 0,
              center ? center[1] : 0,
            );
            return diff === "hard" || d === diff;
          });
          if (matching.length >= 5) {
            eligibleStreets = matching;
          }
        }

        const targetCount = Math.min(
          seriesCount || 10,
          eligibleStreets.length,
        );
        const shuffled = [...eligibleStreets].sort(() => 0.5 - Math.random());
        this.#offlineStreets = shuffled.slice(0, targetCount);
        this.#offlineRoundIndex = 0;
        this.#offlineScores = [];
        this.#offlineStreakCount = 0;

        if (this.#offlineStreets.length === 0) {
          throw new Error(i18n.t("errors.network_error"));
        }

        const firstPrompt = {
          roundIndex: 0,
          totalRounds: this.#offlineStreets.length,
          mode,
        };
        if (mode === "target" || mode === "sprint") {
          firstPrompt.streetName = this.#offlineStreets[0].properties.name;
        } else if (mode === "identify") {
          firstPrompt.geometry = this.#offlineStreets[0].geometry;
        }

        startData = {
          gameToken: "offline_token",
          nextPrompt: firstPrompt,
          isFinished: false,
        };
      } else {
        this.#isOfflineGame = false;
        this.#gameView.updateComboBadge(1);
        this.#gameView.showLoading(i18n.t("loading.generating_city"));

        const generateResponse = await ApiService.post("/cities/generate", {
          cityKey: cityKey,
          name: cityData.name,
          osmId: cityData.osmId || cityData.osm_id,
          osm_id: cityData.osm_id || cityData.osmId,
          bbox: bbox,
        });

        if (!generateResponse.ok) {
          if (
            generateResponse.status === 401 ||
            generateResponse.status === 403
          ) {
            this.#handleAuthError();
            return;
          }
          throw new Error(i18n.formatError(generateResponse.data?.error));
        }

        this.#gameView.showLoading(i18n.t("loading.init_session"));

        const startResponse = await ApiService.post("/game/start", {
          cityKey,
          mode,
          difficulty: diff,
          testNumber,
          seriesCount,
        });

        if (!startResponse.ok) {
          if (startResponse.status === 401 || startResponse.status === 403) {
            this.#handleAuthError();
            return;
          }
          throw new Error(i18n.formatError(startResponse.data?.error));
        }

        startData = startResponse.data;

        this.#gameView.showLoading(i18n.t("loading.loading_streets"));

        const hideLabels = selectedMode === "target";
        const mapReadyPromise = this.#mapView.initMap(
          center,
          14,
          bbox,
          hideLabels,
        );
        const streetsPromise = this.#overpassService.fetchStreets(bbox, cityKey);

        const [_, loadedGeojson, customDistricts, customRoutes] =
          await Promise.all([
            mapReadyPromise,
            streetsPromise,
            this.#fetchCustomDistricts(cityKey),
            this.#fetchCustomRoutes(cityKey),
          ]);
        geojson = loadedGeojson;

        this.#allCityStreets = mergeCityStreets(
          geojson.features,
          customDistricts,
          customRoutes,
        );

        if (geojson && geojson.features && geojson.features.length > 0) {
          StorageService.setCity(cityKey, geojson, {
            key: cityKey,
            name: cityData.name || cityKey,
            bbox: bbox || cityData.bbox,
            center: center || cityData.center,
            osmId: cityData.osmId || cityData.osm_id,
          }).catch(() => {});
        }
      }

      if (diff === "lotissement" || difficulty === "lotissement") {
        const lotissements = this.#allCityStreets.filter(
          (f) =>
            f.properties &&
            f.properties.isLotissement &&
            (f.geometry.type === "Polygon" ||
              f.geometry.type === "MultiPolygon"),
        );
        this.#mapView.renderLotissements(lotissements);
      } else {
        this.#mapView.renderLotissements([]);
      }

      const streetNames = Array.from(
        new Set(this.#allCityStreets.map((f) => f.properties.name)),
      );
      this.#gameView.setupAutocomplete(streetNames);

      if (this.#allCityStreets.length === 0) {
        throw new Error(i18n.t("errors.network_error"));
      }

      this.#session = new GameSession(
        playerName,
        cityData,
        selectedMode,
        startData.gameToken,
        startData.nextPrompt,
        difficulty,
        testNumber,
      );
      this.#saveState();

      this.#gameView.showScreen("game");
      this.#mapView.invalidateSize();
      this.#loadNextQuestion();
      if (this.roomCode) {
        this.#router.navigate(`/room/${this.roomCode}/play`, true);
      } else {
        this.#router.navigate("/play", true);
      }
    } catch (error) {
      const i18n = I18nService.getInstance();
      this.#gameView.showError(i18n.formatError(error.message));
      this.#clearState();
      if (!this.roomCode) {
        this.#router.navigate("/setup");
      }
      this.roomCode = null;
    }
  }

  #handleAuthError() {
    this.#clearState();
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    const i18n = I18nService.getInstance();
    this.#gameView.showError(i18n.t("errors.session_expired"));
    this.#router.navigate("/login");
  }

  #runTimerInterval() {
    if (this.#timerInterval) {
      clearInterval(this.#timerInterval);
    }

    this.#timerInterval = setInterval(() => {
      this.#remainingTime -= 0.1;
      if (this.#remainingTime <= 0) {
        this.#remainingTime = 0;
        this.#stopRoundTimer();

        if (this.#session && this.#currentStepState === "guessing") {
          if (this.#session.currentMode === "target") {
            this.#validateGuess(true);
          } else if (this.#session.currentMode === "sprint") {
            this.#submitRoundToBackend(null, this.#totalTime)
              .then((result) => {
                this.#session.gameToken = result.gameToken;
                this.#session.score = result.totalScore;
                this.#session.sprintHistory = result.sprintHistory;
                this.#session.setFinished(result.isFinished);
                this.#session.nextPrompt = result.nextPrompt;
                this.#lastFeedback = result.feedback;

                this.#saveState();

                if (result.isFinished) {
                  this.#endGame();
                } else {
                  this.#loadNextQuestion();
                }
              })
              .catch((err) => {
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

  #startRoundTimer() {
    this.#stopRoundTimer();

    const difficulty =
      localStorage.getItem("citymaster_last_difficulty") || "hard";
    if (difficulty === "easy") {
      this.#totalTime = 45;
    } else if (difficulty === "medium" || difficulty === "lotissement") {
      this.#totalTime = 60;
    } else {
      this.#totalTime = 90;
    }

    this.#remainingTime = this.#totalTime;
    this.#gameView.showTimer();
    this.#gameView.updateTimer(this.#remainingTime, this.#totalTime);

    this.#runTimerInterval();
  }

  #stopRoundTimer() {
    if (this.#timerInterval) {
      clearInterval(this.#timerInterval);
      this.#timerInterval = null;
    }
    this.#gameView.hideTimer();
  }

  #pauseRoundTimer() {
    if (this.#timerInterval) {
      clearInterval(this.#timerInterval);
      this.#timerInterval = null;
    }
  }

  #resumeRoundTimer() {
    if (
      !this.#session ||
      this.#currentStepState !== "guessing" ||
      this.#remainingTime <= 0 ||
      this.#timerInterval
    ) {
      return;
    }

    this.#gameView.showTimer();
    this.#gameView.updateTimer(this.#remainingTime, this.#totalTime);
    this.#runTimerInterval();
  }

  setRouter(router) {
    this.#router = router;
  }

  hasActiveSession() {
    return this.#session !== null;
  }

  resumeGame() {
    const savedState = localStorage.getItem("citymaster_session");
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

    this.#gameView.showLoading(
      I18nService.getInstance().t(
        "loading.restoring",
        {},
        "Restauration de votre partie...",
      ),
    );

    const hideLabels = this.#session.currentMode === "target";
    const mapReadyPromise = this.#mapView.initMap(
      cityCenter,
      14,
      bbox,
      hideLabels,
    );
    this.#updateHUD();

    const streetsPromise = this.#overpassService.fetchStreets(bbox, cityKey);
    const customDistrictsPromise = this.#fetchCustomDistricts(cityKey);
    const customRoutesPromise = this.#fetchCustomRoutes(cityKey);

    Promise.all([
      mapReadyPromise,
      streetsPromise,
      customDistrictsPromise,
      customRoutesPromise,
    ])
      .then(([_, geojson, customDistricts, customRoutes]) => {
        this.#allCityStreets = mergeCityStreets(
          geojson.features,
          customDistricts,
          customRoutes,
        );
        const streetNames = Array.from(
          new Set(this.#allCityStreets.map((f) => f.properties.name)),
        );
        this.#gameView.setupAutocomplete(streetNames);
        this.#gameView.showScreen("game");
        this.#mapView.invalidateSize();
        this.#loadNextQuestion();
        this.#router.navigate("/play", true);
      })
      .catch((err) => {
        console.error(
          "Failed to load city streets for snapping on resume",
          err,
        );
        this.#clearState();
        this.#router.navigate("/setup");
      });

    return true;
  }

  #saveState() {
    if (this.#session) {
      localStorage.setItem("citymaster_session", this.#session.serialize());
    }
  }

  #clearState() {
    localStorage.removeItem("citymaster_session");
    this.#session = null;
    this.#lastFeedback = null;
    this.#lastClickedStreetName = null;
    this.#isOfflineGame = false;
    this.#offlineStreets = [];
    this.#offlineRoundIndex = 0;
    this.#offlineScores = [];
    this.#offlineStreakCount = 0;
  }

  async #fetchCustomDistricts(cityKey) {
    try {
      const res = await ApiService.get(
        `/assets/data/custom_districts.json`,
      );
      if (res.ok && res.data) {
        return res.data[cityKey] || [];
      }
    } catch (err) {
      console.warn("Could not fetch custom districts:", err);
    }
    return [];
  }

  async #fetchCustomRoutes(cityKey) {
    try {
      const res = await ApiService.get(
        `/assets/data/custom_routes.json`,
      );
      if (res.ok && res.data) {
        return res.data[cityKey] || [];
      }
    } catch (err) {
      console.warn("Could not fetch custom routes:", err);
    }
    return [];
  }

  #updateHUD() {
    if (this.#session) {
      this.#gameView.updateHUD(this.#session.currentMode, this.#session.score);
      this.#gameView.updateRoundProgress(
        this.#session.roundIndex || 1,
        this.#session.totalRounds || 5,
        this.#session.roundHistory || [],
      );
    }
  }

  #loadNextQuestion() {
    if (!this.#session) return;

    if (this.#session.nextPrompt) {
      this.#session.currentPrompt = this.#session.nextPrompt;
      this.#session.nextPrompt = null;
    }

    if (this.#session.isFinished()) {
      this.#endGame();
      return;
    }

    const prompt = this.#session.currentPrompt;
    const mode = this.#session.currentMode;

    this.#hasPlacedMarker = false;
    this.#lastClickedStreetName = null;
    this.#lastFeedback = null;
    this.#currentStepState = "guessing";
    this.#gameView.setActionsState("none");
    this.#gameView.setModeLayout(mode);
    this.#updateHUD();
    this.#saveState();

    const cityCenter = this.#session.city.center;

    if (mode === "target" || mode === "sprint") {
      this.#mapView.clearStreets();
      this.#mapView.setView(cityCenter, 14);

      this.#gameView.showBanner(true);
      const safeStreetName =
        prompt && prompt.streetName && typeof prompt.streetName === "string"
          ? prompt.streetName.trim()
          : I18nService.getInstance().t(
              "common.unnamed_street",
              {},
              "Rue sans nom",
            );
      const promptText = I18nService.getInstance().t("feedback.prompt_target", {
        name: safeStreetName,
      });
      this.#gameView.setInstruction(
        mode === "sprint" ? `⚡ ${promptText}` : `📍 ${promptText}`,
      );
    } else if (mode === "identify") {
      if (prompt && prompt.geometry) {
        this.#mapView.renderStreet(prompt.geometry, true);
        const bounds = L.geoJSON(prompt.geometry).getBounds();
        if (bounds.isValid()) {
          this.#mapView.setView(bounds.getCenter(), 15);
        }
      }
      this.#gameView.showBanner(true);
      this.#gameView.setInstruction(
        `🔎 ${I18nService.getInstance().t("feedback.prompt_identify")}`,
      );
    }

    this.#startRoundTimer();
  }

  #handleMapClick(lat, lng) {
    if (!this.#session) return;
    if (
      this.#gameView.isReportModalOpen &&
      this.#gameView.isReportModalOpen()
    ) {
      return;
    }

    const mode = this.#session.currentMode;
    if (mode === "identify" || this.#currentStepState !== "guessing") return;

    let targetLat = lat;
    let targetLng = lng;
    let selectedStreet = null;

    this.#mapView.placeTempMarker(targetLat, targetLng);
    this.#mapView.renderSelection(null, false);

    if (this.#allCityStreets && this.#allCityStreets.length > 0) {
      let streetsToSearch = this.#allCityStreets;
      let maxDist = 120;
      if (this.#session.difficulty === "lotissement") {
        streetsToSearch = this.#allCityStreets.filter(
          (f) => f.properties && f.properties.isLotissement,
        );
        maxDist = 0;
      }
      const closest = this.#spatialService.findClosestStreet(
        lat,
        lng,
        streetsToSearch,
      );
      if (closest && closest.point && closest.distance <= maxDist) {
        targetLat = closest.point[0];
        targetLng = closest.point[1];
        selectedStreet = closest.street;
      }
    }

    this.#lastClickedStreetName =
      selectedStreet && selectedStreet.properties
        ? selectedStreet.properties.name
        : null;

    if (mode === "sprint") {
      this.#stopRoundTimer();
      const elapsedSeconds = this.#totalTime - this.#remainingTime;
      const guess = selectedStreet ? { lat: targetLat, lng: targetLng } : null;

      this.#submitRoundToBackend(guess, elapsedSeconds)
        .then((result) => {
          this.#session.gameToken = result.gameToken;
          this.#session.score = result.totalScore;
          this.#session.sprintHistory = result.sprintHistory;
          this.#session.setFinished(result.isFinished);
          this.#session.nextPrompt = result.nextPrompt;
          this.#lastFeedback = result.feedback;

          this.#saveState();

          if (result.isFinished) {
            this.#endGame();
          } else {
            this.#loadNextQuestion();
          }
        })
        .catch((err) => {
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
    this.#gameView.setActionsState("validate");
  }

  async #submitRoundToBackend(guess, elapsedSeconds) {
    if (this.#isOfflineGame) {
      return this.#evaluateOfflineRound(guess, elapsedSeconds);
    }

    const res = await ApiService.post("/game/submit-round", {
      gameToken: this.#session.gameToken,
      guess,
      elapsedSeconds,
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        this.#handleAuthError();
        throw new Error(I18nService.getInstance().t("errors.session_expired"));
      }
      throw new Error(I18nService.getInstance().formatError(res.data?.error));
    }

    return res.data;
  }

  #evaluateOfflineRound(guess, elapsedSeconds) {
    const currentStreet = this.#offlineStreets[this.#offlineRoundIndex];
    const mode = this.#session.currentMode;
    const totalTime = this.#totalTime;
    const remainingTime = Math.max(0, totalTime - (elapsedSeconds || 0));

    let pointsEarned = 0;
    let isCorrect = false;
    let distance = -1;
    let message = "";
    const streetName = currentStreet.properties?.name || "Rue";
    const feedback = {
      correctName: streetName,
      geometry: currentStreet.geometry,
    };

    if (mode === "target" || mode === "sprint") {
      if (
        !guess ||
        typeof guess.lat !== "number" ||
        typeof guess.lng !== "number"
      ) {
        distance = -1;
        pointsEarned = 0;
        isCorrect = false;
        feedback.code = remainingTime <= 0 ? "timeout_guess" : "passed";
        message =
          remainingTime <= 0
            ? "Temps écoulé ! Vous n'avez pas sélectionné d'emplacement."
            : "Passé.";
      } else {
        distance = this.#spatialService.getDistanceToStreet(
          guess.lat,
          guess.lng,
          currentStreet,
        );
        feedback.distance = Math.round(distance);
        if (distance <= 15) {
          pointsEarned = 100;
          isCorrect = true;
          feedback.code = "perfect";
          message = "Parfait ! Vous êtes exactement sur la rue.";
        } else if (distance <= 100) {
          const ratio = 1 - (distance - 15) / 85;
          pointsEarned = Math.round(10 + 40 * ratio);
          isCorrect = true;
          feedback.code = "near";
          message = `Pas mal ! Vous êtes à ${Math.round(distance)}m de la rue.`;
        } else {
          pointsEarned = 0;
          isCorrect = false;
          feedback.code = "miss";
          message = `Raté. Vous étiez à ${Math.round(distance)}m. Voici le véritable emplacement.`;
        }

        let timeBonus = 0;
        if (pointsEarned > 0 && remainingTime > 0) {
          const timeRatio = remainingTime / totalTime;
          timeBonus = Math.round(
            timeRatio * (mode === "sprint" ? 100 : 30),
          );
          if (timeBonus > 0) {
            pointsEarned += timeBonus;
            feedback.timeBonus = timeBonus;
            message += ` Bonus de temps : +${timeBonus} pts.`;
          }
        }
      }

      if (mode === "sprint") {
        this.#session.sprintHistory.push({
          name: streetName,
          distance: distance === -1 ? -1 : Math.round(distance),
          points: pointsEarned,
          timeBonus: feedback.timeBonus || 0,
        });
      }
    } else if (mode === "identify") {
      const normalize = (str) =>
        typeof str === "string"
          ? str
              .toLowerCase()
              .replace(/^(le|la|les|l'|d'|du|de|des)\s+/, "")
              .replace(/[^a-z0-9]/g, "")
              .trim()
          : "";
      const cleanAnswer = normalize(guess);
      const cleanCorrect = normalize(streetName);

      isCorrect =
        cleanAnswer.length > 0 &&
        (cleanAnswer === cleanCorrect || cleanCorrect.includes(cleanAnswer));

      if (isCorrect) {
        pointsEarned = 15;
        feedback.code = "identify_correct";
        message = `Bonne réponse ! C'était bien : ${streetName}`;

        let timeBonus = 0;
        if (remainingTime > 0) {
          timeBonus = Math.round((remainingTime / totalTime) * 10);
          if (timeBonus > 0) {
            pointsEarned += timeBonus;
            feedback.timeBonus = timeBonus;
            message += ` Bonus de temps : +${timeBonus} pts.`;
          }
        }
      } else {
        pointsEarned = 0;
        feedback.code =
          remainingTime <= 0 ? "identify_timeout" : "identify_false";
        message =
          remainingTime <= 0
            ? `Temps écoulé ! La bonne réponse était : ${streetName}`
            : `Faux. La bonne réponse était : ${streetName}`;
      }
    }

    if (isCorrect) {
      this.#offlineStreakCount++;
    } else {
      this.#offlineStreakCount = 0;
    }

    let multiplier = 1;
    if (this.#offlineStreakCount >= 3) {
      multiplier = 3;
    } else if (this.#offlineStreakCount === 2) {
      multiplier = 2;
    }

    if (pointsEarned > 0 && multiplier > 1) {
      pointsEarned *= multiplier;
      message += ` (Combo x${multiplier} !)`;
    }

    feedback.streakCount = this.#offlineStreakCount;
    feedback.multiplier = multiplier;
    feedback.pointsEarned = pointsEarned;
    feedback.message = message + ` (+${pointsEarned} pts)`;
    feedback.isCorrect = isCorrect;
    feedback.distance = distance === -1 ? -1 : Math.round(distance);

    this.#offlineScores.push(pointsEarned);
    this.#offlineRoundIndex++;

    const isFinished =
      this.#offlineRoundIndex >= this.#offlineStreets.length;
    let nextPrompt = null;
    if (!isFinished) {
      const nextStreet = this.#offlineStreets[this.#offlineRoundIndex];
      nextPrompt = {
        roundIndex: this.#offlineRoundIndex,
        totalRounds: this.#offlineStreets.length,
        mode,
      };
      if (mode === "target" || mode === "sprint") {
        nextPrompt.streetName = nextStreet.properties.name;
      } else if (mode === "identify") {
        nextPrompt.geometry = nextStreet.geometry;
      }
    }

    const totalScore = this.#offlineScores.reduce((a, b) => a + b, 0);

    return {
      gameToken: "offline_token",
      nextPrompt,
      isFinished,
      totalScore,
      feedback,
      sprintHistory: this.#session.sprintHistory,
    };
  }

  async #validateGuess(forced = false) {
    if (!this.#session || this.#currentStepState !== "guessing") return;
    if (!forced && !this.#hasPlacedMarker) return;

    this.#stopRoundTimer();
    this.#currentStepState = "validated";

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
          isCorrect: result.feedback.isCorrect || false,
        });
      }
      this.#session.nextPrompt = result.nextPrompt;
      this.#lastFeedback = result.feedback;
      this.#saveState();

      const feedback = result.feedback;
      const i18n = I18nService.getInstance();
      let displayMsg = feedback.message;
      if (feedback.code) {
        displayMsg = i18n.t(`feedback.${feedback.code}`, {
          distance: feedback.distance,
          name: feedback.correctName,
        });
        if (feedback.timeBonus) {
          displayMsg += i18n.t("feedback.time_bonus", {
            bonus: feedback.timeBonus,
          });
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
        feedback.geometry,
      );

      this.#mapView.renderSelection(feedback.geometry, true);
      this.#mapView.showFeedbackLine(
        latlng ? latlng.lat : targetLatLng[0],
        latlng ? latlng.lng : targetLatLng[1],
        targetLatLng[0],
        targetLatLng[1],
        feedback.isCorrect,
      );

      this.#mapView.fitToGuessAndStreet(
        latlng ? latlng.lat : targetLatLng[0],
        latlng ? latlng.lng : targetLatLng[1],
        targetLatLng[0],
        targetLatLng[1],
      );

      this.#gameView.setActionsState("next");
    } catch (err) {
      this.#currentStepState = "guessing";
      this.#gameView.setActionsState("validate");
      this.#gameView.showError(err.message);
    }
  }

  #nextStreet() {
    if (!this.#session) return;
    this.#loadNextQuestion();
  }

  async #checkTextAnswer(answer, forced = false) {
    if (!this.#session || this.#currentStepState !== "guessing") return;

    this.#stopRoundTimer();
    this.#currentStepState = "validated";
    const elapsedSeconds = this.#totalTime - this.#remainingTime;

    try {
      const result = await this.#submitRoundToBackend(answer, elapsedSeconds);

      this.#session.gameToken = result.gameToken;
      this.#session.score = result.totalScore;
      this.#session.setFinished(result.isFinished);
      if (result.feedback) {
        this.#session.addRoundResult({
          score: result.feedback.pointsEarned || 0,
          isCorrect: result.feedback.isCorrect || false,
        });
      }
      this.#session.nextPrompt = result.nextPrompt;
      this.#lastFeedback = result.feedback;
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
      this.#gameView.setActionsState("next");
    } catch (err) {
      this.#currentStepState = "guessing";
      this.#gameView.setActionsState("validate");
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
      testNumber: this.#session.testNumber,
    };

    if (this.roomCode) {
      const roomCode = this.roomCode;
      this.roomCode = null;
      this.#gameView.showLoading(
        I18nService.getInstance().t(
          "loading.calculating_room_results",
          {},
          "Calcul du classement du salon...",
        ),
      );
      await this.#submitRoomScore(roomCode, score);
      this.#clearState();
      this.#router.navigate(`/room/${roomCode}`);
      return;
    }

    const isOffline = Boolean(this.#isOfflineGame);

    this.#certificateView.render(
      name,
      score,
      mode,
      sprintHistory,
      this.#session.testNumber,
      isOffline,
    );
    this.#gameView.showScreen("certificate");
    this.#router.navigate("/certificate");
    this.#clearState();
  }

  async #submitRoomScore(roomCode, score, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await ApiService.post(`/rooms/${roomCode}/submit-score`, {
          score,
        });
        if (res && res.ok) return true;
      } catch (err) {
        console.warn(`Attempt ${attempt} to submit room score failed:`, err);
      }
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
    return false;
  }

  async #quitGame() {
    this.#stopRoundTimer();
    if (this.roomCode) {
      const code = this.roomCode;
      const score =
        this.#session && typeof this.#session.score === "number"
          ? this.#session.score
          : 0;
      this.roomCode = null;
      await this.#submitRoomScore(code, score);
      this.#clearState();
      this.#router.navigate(`/room/${code}`);
    } else {
      this.#clearState();
      this.#router.navigate("/");
    }
  }

  async #goHome() {
    this.#stopRoundTimer();
    if (this.roomCode) {
      const code = this.roomCode;
      const score =
        this.#session && typeof this.#session.score === "number"
          ? this.#session.score
          : 0;
      this.roomCode = null;
      await this.#submitRoomScore(code, score);
      this.#clearState();
      this.#router.navigate(`/room/${code}`);
    } else {
      this.#clearState();
      this.#router.navigate("/");
    }
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
        this.#lastGameSettings.testNumber,
      );
    } else {
      this.#router.navigate("/");
    }
  }

  startRoomGame(
    playerName,
    cityData,
    selectedMode,
    difficulty,
    testNumber,
    roomCode,
    seriesCount = 10,
  ) {
    this.#clearState();
    this.roomCode = roomCode;
    this.#startGame(
      playerName,
      cityData,
      selectedMode,
      difficulty,
      testNumber,
      seriesCount,
    );
  }

  #handleReportRequest() {
    this.#pauseRoundTimer();

    let targetStreet = I18nService.getInstance().t(
      "common.unknown",
      {},
      "Inconnue",
    );

    if (this.#lastFeedback && this.#lastFeedback.correctName) {
      targetStreet = this.#lastFeedback.correctName;
    } else {
      const prompt = this.#session?.currentPrompt;
      if (prompt) {
        if (prompt.streetName) {
          targetStreet = prompt.streetName;
        } else if (prompt.name) {
          targetStreet = prompt.name;
        } else if (typeof prompt === "string") {
          targetStreet = prompt;
        } else if (this.#session?.currentMode === "identify") {
          targetStreet = I18nService.getInstance().t(
            "game.street_to_identify",
            {},
            "Rue à identifier",
          );
        }
      }
    }

    const context = {
      username:
        localStorage.getItem("username") ||
        this.#session?.playerName ||
        I18nService.getInstance().t("common.anonymous", {}, "Anonyme"),
      cityKey:
        this.#session?.city?.key ||
        this.#session?.cityKey ||
        I18nService.getInstance().t("common.unknown", {}, "Inconnu"),
      targetStreet,
      clickedStreet: this.#lastClickedStreetName || null,
      gameMode: this.#session?.currentMode || "target",
      difficulty:
        localStorage.getItem("citymaster_last_difficulty") ||
        this.#session?.difficulty ||
        "hard",
    };

    this.#gameView.openReportModal(context);
  }
}
