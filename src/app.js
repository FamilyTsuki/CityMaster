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
import { FlightLoader } from "./views/components/FlightLoader.js";
import { ChangelogView } from "./views/ChangelogView.js";
import { NetworkService } from "./services/NetworkService.js";
import { HapticService } from "./services/HapticService.js";
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
  #changelogView;
  #scoreController;
  #controller;
  #authController;
  #profileController;
  #adminController;
  #roomController;
  #audioService;
  #flightLoader;
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
    this.#changelogView = new ChangelogView();
    this.#scoreController = new ScoreController(this.#gameView);

    document.addEventListener("click", (e) => {
      if (e.target.closest("button, .btn, a, li, .icon-btn")) {
        this.#audioService.playClick();
        HapticService.tap();
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
        const score = typeof this.#certificateView?.lastScore === "number"
          ? this.#certificateView.lastScore
          : parseInt(document.getElementById("cert-score")?.textContent || "0", 10);
        const mode = this.#certificateView?.lastMode || "target";
        ConfettiService.launch(score, { mode });
        const minThreshold = mode === "sprint" ? 300 : 500;
        if (score >= minThreshold) {
          this.#audioService.playFanfare();
        }
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
      "/changelog": async () => {
        this.#gameView.showScreen("changelog");
        await this.#changelogView.loadAndRender();
      },
      "/support": () => {
        this.#gameView.showScreen("support");
      },
      "/moderation": () => {
        this.#gameView.showScreen("moderation");
      },
      "/load": () => {
        this.#showLoad();
      },
    });

    this.#router.beforeEach((toPath) => {
      if (!toPath.startsWith("/room/")) {
        this.#roomController?.stopPolling();
      }
      if (toPath !== "/load" && toPath !== "/load/") {
        this.#flightLoader?.stop();
      }
      const nav = document.getElementById("main-nav");
      if (nav) {
        if (toPath === "/load" || toPath === "/load/") {
          nav.classList.add("hidden");
        } else {
          nav.classList.remove("hidden");
        }
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

  #showLoad() {
    const nav = document.getElementById("main-nav");
    if (nav) nav.classList.add("hidden");
    this.#gameView.showScreen("load");
    if (!this.#flightLoader) {
      this.#flightLoader = new FlightLoader();
    }
    this.#flightLoader.start();
  }

  static init() {
    const startApp = async () => {
      const renderVersionTag = (v) => {
        const logoBrand = document.getElementById("logo-brand");
        if (logoBrand && logoBrand.parentElement) {
          let vTag = logoBrand.parentElement.querySelector(".version-tag");
          if (!vTag) {
            vTag = document.createElement("a");
            vTag.className = "version-tag";
            vTag.href = "/changelog";
            vTag.setAttribute(
              "title",
              I18nService.getInstance().t("nav.changelog_title") ||
                "Voir les notes de version",
            );
            vTag.setAttribute("data-i18n-title", "nav.changelog_title");
            vTag.setAttribute(
              "aria-label",
              I18nService.getInstance().t("nav.changelog_aria") ||
                "Historique des versions",
            );
            vTag.setAttribute("data-i18n-aria-label", "nav.changelog_aria");
            logoBrand.parentElement.appendChild(vTag);
          }
          vTag.textContent = `v${v}`;
        }
      };

      const cachedVer = sessionStorage.getItem("app_version");
      if (cachedVer) renderVersionTag(cachedVer);

      fetch("/api/version")
        .then((res) => res.json())
        .then((data) => {
          if (data.version && data.version !== "unknown") {
            const prevVersion = sessionStorage.getItem("app_version");
            sessionStorage.setItem("app_version", data.version);
            renderVersionTag(data.version);

            if (prevVersion && prevVersion !== data.version) {
              if ("serviceWorker" in navigator) {
                navigator.serviceWorker.getRegistration().then((reg) => {
                  if (reg) reg.update().catch(() => {});
                });
              }
            }
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
          "load",
          "changelog",
          "support",
          "moderation",
        ];
        const parser = new DOMParser();
        const appContainer = document.getElementById("app");

        const i18n = I18nService.getInstance();
        const i18nPromise = i18n.init();
        const templatesPromise = Promise.all(
          screens.map(async (screen) => {
            const response = await fetch(`/screens/${screen}.html`);
            if (!response.ok) {
              throw new Error(`Failed to load screen template: ${screen}`);
            }
            return response.text();
          }),
        );

        const [_, htmlTemplates] = await Promise.all([
          i18nPromise,
          templatesPromise,
        ]);

        htmlTemplates.reverse().forEach((htmlString) => {
          const doc = parser.parseFromString(htmlString, 'text/html');
          i18n.translateDOM(doc.body);
          const children = Array.from(doc.body.children);
          children.reverse().forEach((child) => {
            appContainer.prepend(child);
          });
        });
        i18n.translateDOM(document);
        NetworkService.getInstance().init();
        new App();
        if (typeof document !== 'undefined' && document.documentElement) {
          document.documentElement.classList.remove('i18n-loading');
        }
      } catch (error) {
        console.error('Failed to initialize CityMaster application:', error);
        if (typeof document !== 'undefined' && document.documentElement) {
          document.documentElement.classList.remove('i18n-loading');
        }
      }
    };

    if (typeof document !== "undefined") {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", startApp);
      } else {
        startApp();
      }
    }
  }
}

App.init();
