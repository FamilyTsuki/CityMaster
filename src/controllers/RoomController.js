import { ApiService } from "../services/ApiService.js";
import { I18nService } from "../services/I18nService.js";

export class RoomController {
  #router;
  #roomView;
  #gameView;
  #gameController;
  #pollingInterval;
  #currentRoomCode;
  #pendingRoomCode;
  #isTransitioning;
  #verifiedAdmin;
  #lastRoomVersion;
  #sseSource;

  constructor(router, roomView, gameView, gameController) {
    this.#router = router;
    this.#roomView = roomView;
    this.#gameView = gameView;
    this.#gameController = gameController;

    this.#pollingInterval = null;
    this.#sseSource = null;
    this.#currentRoomCode = null;
    this.#pendingRoomCode = null;
    this.#isTransitioning = false;
    this.#verifiedAdmin = undefined;
    this.#lastRoomVersion = null;

    this.#initEvents();
  }

  setRouter(router) {
    this.#router = router;
  }

  #initEvents() {
    this.#roomView.bindGuestFormSubmit((username, roomCode) =>
      this.#handleGuestLogin(username, roomCode),
    );
    this.#roomView.bindCreateRoom(() => this.#handleCreateRoom());
    this.#roomView.bindJoinRoom(() => this.#handleJoinRoom());
    this.#roomView.bindStartGame(() => this.#handleStartGame());
    this.#roomView.bindLeaveRoom(() => this.#handleLeaveRoom());
    this.#roomView.bindBackClick(() => {
      this.stopPolling();
      this.#router.navigate("/");
    });

    this.#roomView.bindHomeClick(() => {
      this.stopPolling();
      this.#router.navigate("/");
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
      this.#roomView.showStep("setup");
    } else {
      this.#roomView.showStep("guest");
    }
  }

  async initRoom(params) {
    this.stopPolling();
    this.#isTransitioning = false;
    this.#verifiedAdmin = undefined;
    this.#lastRoomVersion = null;
    const code = params.code ? params.code.trim().toUpperCase() : null;

    if (!code) {
      this.showSetup();
      return;
    }

    this.#currentRoomCode = code;
    this.#roomView.showScreen();

    if (!this.#hasToken()) {
      this.#pendingRoomCode = code;
      const guestCodeInput = document.getElementById("room-guest-code");
      if (guestCodeInput && !guestCodeInput.value) {
        guestCodeInput.value = code;
      }
      this.#roomView.showStep("guest");
      return;
    }

    try {
      const joinRes = await ApiService.post(`/rooms/${code}/join`);

      if (!joinRes.ok) {
        const errorMsg =
          joinRes.data?.error ||
          I18nService.getInstance().t(
            "room.cannot_join",
            {},
            "Impossible de rejoindre ce salon.",
          );
        if (!this.#hasAccount()) {
          this.#roomView.showStep("guest");
          this.#roomView.showGuestError(errorMsg);
        } else {
          this.#roomView.showStep("setup");
          this.#roomView.showJoinError(errorMsg);
          this.#router.navigate("/room");
        }
        return;
      }

      this.#startPolling(code);
    } catch (error) {
      console.error("Error entering room:", error);
      const netError = I18nService.getInstance().t("errors.network_error");
      if (!this.#hasAccount()) {
        this.#roomView.showStep("guest");
        this.#roomView.showGuestError(netError);
      } else {
        this.#roomView.showStep("setup");
        this.#roomView.showJoinError(netError);
        this.#router.navigate("/room");
      }
    }
  }

  async #handleGuestLogin(username, roomCode) {
    try {
      this.#roomView.hideGuestError();
      const codeToJoin = (
        roomCode ||
        this.#pendingRoomCode ||
        this.#currentRoomCode ||
        ""
      )
        .trim()
        .toUpperCase();

      if (!codeToJoin) {
        this.#roomView.showGuestError(
          I18nService.getInstance().t(
            "room.enter_room_code",
            {},
            "Veuillez saisir le code du salon à rejoindre.",
          ),
        );
        return;
      }

      const res = await ApiService.post(
        "/guest",
        { username },
        { includeAuth: false },
      );

      if (!res.ok) {
        this.#roomView.showGuestError(
          res.data?.error ||
            I18nService.getInstance().t(
              "room.guest_login_error",
              {},
              "Erreur lors de la connexion invité.",
            ),
        );
        return;
      }

      const data = res.data;
      ApiService.setToken(data.token);
      localStorage.setItem("username", data.username);
      localStorage.setItem("is_guest", "true");

      this.#gameView.setPlayerName(data.username);

      this.#pendingRoomCode = null;
      this.#router.navigate(`/room/${codeToJoin}`);
      this.initRoom({ code: codeToJoin });
    } catch (error) {
      console.error("Guest Login Error:", error);
      this.#roomView.showGuestError(
        I18nService.getInstance().t("errors.network_error"),
      );
    }
  }

  async #handleCreateRoom() {
    try {
      this.#roomView.hideJoinError();
      const config = this.#roomView.getSetupConfig();
      if (!config.cityKey) {
        this.#roomView.showJoinError(
          I18nService.getInstance().t(
            "room.select_city_error",
            {},
            "Veuillez sélectionner une ville pour créer le salon.",
          ),
        );
        return;
      }

      const res = await ApiService.post("/rooms", {
        cityKey: config.cityKey,
        difficulty: config.difficulty,
        seriesCount: config.seriesCount,
        mode: config.mode,
        validityHours: config.validityHours,
      });

      if (!res.ok) {
        this.#roomView.showJoinError(
          res.data?.error ||
            I18nService.getInstance().t(
              "room.cannot_create",
              {},
              "Impossible de créer la room.",
            ),
        );
        return;
      }

      const data = res.data;
      this.#router.navigate(`/room/${data.roomCode}`);
    } catch (error) {
      console.error("Create Room UI Error:", error);
      this.#roomView.showJoinError(
        I18nService.getInstance().t("errors.network_error"),
      );
    }
  }

  async #handleJoinRoom() {
    const code = this.#roomView.getCodeInputValue();
    if (!code || code.length < 3) {
      this.#roomView.showJoinError(
        I18nService.getInstance().t(
          "room.invalid_code_error",
          {},
          "Veuillez entrer un code de salon valide.",
        ),
      );
      return;
    }
    this.#router.navigate(`/room/${code}`);
  }

  async #handleStartGame() {
    if (!this.#currentRoomCode) return;
    try {
      this.#gameView.showLoading(
        I18nService.getInstance().t(
          "loading.launching_multiplayer",
          {},
          "Lancement du test multijoueurs...",
        ),
      );
      const res = await ApiService.post(
        `/rooms/${this.#currentRoomCode}/start`,
      );
      if (!res.ok) {
        await this.#roomView.showAlertModal(
          I18nService.getInstance().t("common.error", {}, "Erreur"),
          res.data?.error ||
            I18nService.getInstance().t(
              "room.start_error",
              {},
              "Erreur lors du lancement de la partie.",
            ),
        );
        this.#roomView.showScreen();
      }
    } catch (error) {
      console.error("Start Game UI Error:", error);
      this.#roomView.showScreen();
    }
  }

  async #handleResetRoom() {
    if (!this.#currentRoomCode) return;

    try {
      this.#gameView.showLoading(
        I18nService.getInstance().t(
          "loading.resetting_room",
          {},
          "Réinitialisation du salon...",
        ),
      );
      const res = await ApiService.post(
        `/rooms/${this.#currentRoomCode}/reset`,
      );

      if (!res.ok) {
        await this.#roomView.showAlertModal(
          I18nService.getInstance().t("common.error", {}, "Erreur"),
          res.data?.error ||
            I18nService.getInstance().t(
              "room.reset_error",
              {},
              "Erreur lors de la réinitialisation du salon.",
            ),
        );
        this.#roomView.showScreen();
        return;
      }

      this.#isTransitioning = false;
      this.#roomView.showScreen();
      this.stopPolling();
      this.#startPolling(this.#currentRoomCode);
    } catch (error) {
      console.error("Reset Room UI Error:", error);
      this.#roomView.showScreen();
    }
  }

  #handleLeaveRoom() {
    this.stopPolling();
    this.#currentRoomCode = null;
    this.#verifiedAdmin = undefined;
    this.#lastRoomVersion = null;
    this.#router.navigate("/room");
  }

  #startPolling(code) {
    this.stopPolling();
    this.#fetchRoomDetails();

    const token = ApiService.getToken();
    if (typeof EventSource !== "undefined" && token) {
      try {
        const sseUrl = `/api/rooms/${code}/stream?token=${encodeURIComponent(token)}`;
        this.#sseSource = new EventSource(sseUrl);

        this.#sseSource.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data && data.changed !== false) {
              await this.#processRoomData(data);
            }
          } catch (e) {}
        };

        this.#sseSource.onerror = () => {
          if (this.#sseSource) {
            this.#sseSource.close();
            this.#sseSource = null;
          }
          if (!this.#pollingInterval) {
            this.#pollingInterval = setInterval(() => {
              this.#fetchRoomDetails();
            }, 2500);
          }
        };
        return;
      } catch (e) {}
    }

    this.#pollingInterval = setInterval(() => {
      this.#fetchRoomDetails();
    }, 2000);
  }

  stopPolling() {
    if (this.#sseSource) {
      this.#sseSource.close();
      this.#sseSource = null;
    }
    if (this.#pollingInterval) {
      clearInterval(this.#pollingInterval);
      this.#pollingInterval = null;
    }
  }

  async #processRoomData(roomData) {
    if (roomData.version) {
      this.#lastRoomVersion = roomData.version;
    }
    const currentUsername = localStorage.getItem("username");
    const isCreator =
      (currentUsername || "").trim().toLowerCase() ===
      (roomData?.createdBy || "").trim().toLowerCase();

    let isAdmin = false;
    if (!isCreator && localStorage.getItem("is_admin") === "true") {
      if (this.#verifiedAdmin === undefined) {
        try {
          const profileRes = await ApiService.get("/profile");
          this.#verifiedAdmin = Boolean(
            profileRes.ok && profileRes.data?.isAdmin,
          );
          if (!this.#verifiedAdmin) {
            localStorage.removeItem("is_admin");
          }
        } catch {
          this.#verifiedAdmin = false;
        }
      }
      isAdmin = this.#verifiedAdmin;
    }
    const isHost = isCreator || isAdmin;

    this.#roomView.updateLobby(roomData, currentUsername);

    if (roomData.status === "playing" || roomData.status === "finished") {
      const me = roomData.participants.find(
        (p) =>
          p.username.toLowerCase() === (currentUsername || "").toLowerCase(),
      );
      if (me && me.finished) {
        this.#roomView.showStep("results");
        this.#roomView.updateResults(roomData.participants, isHost);
      } else {
        this.stopPolling();
        if (this.#isTransitioning) return;
        this.#isTransitioning = true;

        const mode = roomData.mode || "target";
        this.#gameView.showLoading(
          I18nService.getInstance().t(
            "loading.init_session",
            {},
            "Chargement de la partie...",
          ),
        );

        this.#gameController.startRoomGame(
          currentUsername,
          roomData.cityData,
          mode,
          roomData.difficulty,
          roomData.testId,
          roomData.roomCode,
          roomData.seriesCount,
        );
      }
    } else {
      this.#roomView.showStep("lobby");
    }
  }

  async #fetchRoomDetails() {
    if (!this.#currentRoomCode) return;
    try {
      const code = this.#currentRoomCode;
      const url = this.#lastRoomVersion
        ? `/rooms/${code}?v=${this.#lastRoomVersion}`
        : `/rooms/${code}`;
      const res = await ApiService.get(url);
      if (!res.ok) {
        if (res.status === 404 || res.status === 410) {
          this.stopPolling();
          await this.#roomView.showAlertModal(
            I18nService.getInstance().t(
              "room.unavailable_title",
              {},
              "Salon indisponible",
            ),
            res.data?.error ||
              I18nService.getInstance().t(
                "room.unavailable_desc",
                {},
                "Ce salon a expiré ou n'existe plus.",
              ),
          );
          this.#router.navigate("/room");
        }
        return;
      }

      if (res.data?.changed === false) {
        return;
      }

      await this.#processRoomData(res.data);
    } catch (error) {
      console.error("Error fetching room details:", error);
    }
  }

  #hasAccount() {
    const token = ApiService.getToken();
    const username = localStorage.getItem("username");
    const isGuest = localStorage.getItem("is_guest") === "true";
    return Boolean(token && username && !isGuest);
  }

  #hasToken() {
    return Boolean(ApiService.getToken() && localStorage.getItem("username"));
  }

  #isAuthenticated() {
    return this.#hasAccount();
  }
}
