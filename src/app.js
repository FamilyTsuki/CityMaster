import { GameView } from "./views/GameView.js";
import { MapView } from "./views/MapView.js";
import { CertificateView } from "./views/CertificateView.js";
import { NavbarView } from "./views/NavbarView.js";
import { AuthView } from "./views/AuthView.js";
import { ProfileView } from "./views/ProfileView.js";
import { GameController } from "./controllers/GameController.js";
import { AuthController } from "./controllers/AuthController.js";
import { ProfileController } from "./controllers/ProfileController.js";
import { ScoreController } from "./controllers/ScoreController.js";
import { AudioService } from "./services/AudioService.js";
import { ConfettiService } from "./services/ConfettiService.js";
import { I18nService } from "./services/I18nService.js";
import { AdminView } from "./views/AdminView.js";
import { AdminController } from "./controllers/AdminController.js";
import { RoomView } from "./views/RoomView.js";
import { RoomController } from "./controllers/RoomController.js";
import { Router } from "./Router.js";

class App {
  #gameView;
  #mapView;
  #certificateView;
  #navbarView;
  #authView;
  #profileView;
  #adminView;
  #roomView;
  #scoreController;
  #controller;
  #authController;
  #profileController;
  #adminController;
  #roomController;
  #audioService;
  #router;

  constructor() {
    this.#audioService = new AudioService();
    this.#gameView = new GameView();
    this.#mapView = new MapView();
    this.#certificateView = new CertificateView();
    this.#navbarView = new NavbarView();
    this.#authView = new AuthView();
    this.#profileView = new ProfileView();
    this.#adminView = new AdminView();
    this.#roomView = new RoomView();
    this.#scoreController = new ScoreController(this.#gameView);

    document.addEventListener("click", (e) => {
      if (e.target.closest("button, .btn, a, li, .icon-btn")) {
        this.#audioService.playClick();
      }
    });

    const skipLink = document.querySelector(".skip-link");
    if (skipLink) {
      skipLink.addEventListener("click", (e) => {
        e.preventDefault();
        const appEl = document.getElementById("app");
        if (appEl) {
          appEl.tabIndex = -1;
          appEl.focus();
        }
      });
    }

    this.#authController = new AuthController(
      null,
      this.#authView,
      this.#navbarView,
    );
    this.#profileController = new ProfileController(
      null,
      this.#profileView,
      this.#navbarView,
      this.#gameView,
      this.#audioService,
    );
    this.#controller = new GameController(
      this.#gameView,
      this.#mapView,
      this.#certificateView,
      this.#scoreController,
      null,
      this.#audioService,
    );
    this.#adminController = new AdminController(
      this.#adminView,
      this.#gameView,
    );
    this.#roomController = new RoomController(
      null,
      this.#roomView,
      this.#gameView,
      this.#controller,
    );

    this.#router = new Router({
      "/": () => {
        this.#gameView.showScreen("landing");
      },
      "/setup": () => {
        this.#showSetup();
      },
      "/login": () => {
        this.#authController.setMode(true);
        this.#gameView.showScreen("auth");
      },
      "/register": () => {
        this.#authController.setMode(false);
        this.#gameView.showScreen("auth");
      },
      "/play": () => this.#showPlay(),
      "/room": () => this.#roomController.showSetup(),
      "/room/:code/play": () => this.#showPlay(),
      "/room/:code": (params) => this.#roomController.initRoom(params),
      "/certificate": () => {
        this.#gameView.showScreen("certificate");
        ConfettiService.launch();
        this.#audioService.playFanfare();
      },
      "/profile": () => {
        this.#profileController.loadProfile();
      },
      "/admin": async () => {
        const token = localStorage.getItem("token");
        if (token) {
          try {
            const res = await fetch("/api/profile", {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const data = await res.json();
              if (data && data.isAdmin) {
                localStorage.setItem("is_admin", "true");
                this.#showAdmin();
                return;
              }
            }
          } catch (e) {
            console.error("Admin verification error:", e);
          }
        }
        localStorage.removeItem("is_admin");
        this.#router.navigate("/");
      },
      "/legal": () => {
        this.#gameView.showScreen("legal");
      },
    });

    this.#router.beforeEach((toPath) => {
      if (!toPath.startsWith("/room/")) {
        this.#roomController?.stopPolling();
      }
    });

    this.#authController.setRouter(this.#router);
    this.#profileController.setRouter(this.#router);
    this.#controller.setRouter(this.#router);
    this.#roomController.setRouter(this.#router);
    this.#adminController.setRouter(this.#router);

    if (this.#authController.isAuthenticated()) {
      const username = localStorage.getItem("username");
      const cachedAvatar = localStorage.getItem("citymaster_profile_image");
      const isAdmin = localStorage.getItem("is_admin") === "true";
      this.#gameView.setPlayerName(username);
      this.#navbarView.setLoggedIn(username, cachedAvatar, isAdmin);
      this.#profileController.fetchNavAvatar();
    }

    this.#gameView.onHeroPlay(() => {
      if (this.#authController.isAuthenticated()) {
        this.#router.navigate("/setup");
      } else {
        this.#router.navigate("/login");
      }
    });

    this.#gameView.onHeroRoom(() => {
      this.#router.navigate("/room");
    });

    this.#navbarView.onLogoClick(() => {
      this.#router.navigate("/");
    });

    this.#navbarView.onAdminClick(() => {
      this.#router.navigate("/admin");
    });

    this.#gameView.onLeaderboardTabClick((type, difficulty) => {
      this.#scoreController.loadLeaderboard(type, difficulty);
    });

    this.#router.init();
  }

  #showSetup() {
    if (this.#authController.isAuthenticated()) {
      this.#gameView.setPlayerName(localStorage.getItem("username"));
      this.#gameView.showScreen("setup");
      const lastDiff =
        localStorage.getItem("citymaster_last_difficulty") || "hard";
      this.#scoreController.loadLeaderboard("monthly", lastDiff);
    } else {
      this.#router.navigate("/login");
    }
  }

  #showPlay() {
    if (!this.#authController.isAuthenticated()) {
      this.#router.navigate("/login");
      return;
    }

    if (!this.#controller.hasActiveSession()) {
      if (!this.#controller.resumeGame()) {
        this.#router.navigate("/setup");
        return;
      }
      return;
    }

    this.#gameView.showScreen("game");
    this.#mapView.invalidateSize();
  }

  #showAdmin() {
    this.#authController.isAuthenticated();
    this.#gameView.showScreen("admin");
    this.#adminController.showDashboard();
  }

  static init() {
    document.addEventListener("DOMContentLoaded", async () => {
      const renderVersionTag = (v) => {
        const logoBrand = document.getElementById("logo-brand");
        if (logoBrand && logoBrand.parentElement && !logoBrand.parentElement.querySelector(".version-tag")) {
          const vSpan = document.createElement("small");
          vSpan.className = "version-tag";
          vSpan.textContent = `v${v}`;
          logoBrand.parentElement.appendChild(vSpan);
        }
      };

      const cachedVer = sessionStorage.getItem("app_version");
      if (cachedVer) renderVersionTag(cachedVer);

      fetch("/api/version")
        .then((res) => res.json())
        .then((data) => {
          if (data.version && data.version !== "unknown") {
            sessionStorage.setItem("app_version", data.version);
            renderVersionTag(data.version);
          }
        })
        .catch(() => {});
      try {
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }

        const screens = [
          "landing",
          "auth",
          "setup",
          "game",
          "certificate",
          "profile",
          "legal",
          "admin",
          "room",
        ];
        const parser = new DOMParser();
        const appContainer = document.getElementById("app");

        const htmlTemplates = await Promise.all(
          screens.map(async (screen) => {
            const response = await fetch(`/screens/${screen}.html`);
            if (!response.ok) {
              throw new Error(`Failed to load screen template: ${screen}`);
            }
            return response.text();
          }),
        );

        htmlTemplates.reverse().forEach((htmlString) => {
          const doc = parser.parseFromString(htmlString, "text/html");
          const children = Array.from(doc.body.children);
          children.reverse().forEach((child) => {
            appContainer.prepend(child);
          });
        });
        await I18nService.getInstance().init();
        new App();
      } catch (error) {
        console.error("Failed to initialize CityMaster application:", error);
      }
    });
  }
}

App.init();
