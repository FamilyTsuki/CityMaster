import { GameView } from './views/GameView.js';
import { MapView } from './views/MapView.js';
import { CertificateView } from './views/CertificateView.js';
import { NavbarView } from './views/NavbarView.js';
import { AuthView } from './views/AuthView.js';
import { ProfileView } from './views/ProfileView.js';
import { GameController } from './controllers/GameController.js';
import { AuthController } from './controllers/AuthController.js';
import { ProfileController } from './controllers/ProfileController.js';
import { ScoreController } from './controllers/ScoreController.js';
import { AudioService } from './services/AudioService.js';
import { ConfettiService } from './services/ConfettiService.js';
import { I18nService } from './services/I18nService.js';
import { AdminView } from './views/AdminView.js';
import { AdminController } from './controllers/AdminController.js';
import { RoomView } from './views/RoomView.js';
import { RoomController } from './controllers/RoomController.js';
import { Router } from './Router.js';

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

    document.addEventListener('click', (e) => {
      if (e.target.closest('button, .btn, a, li, .icon-btn')) {
        this.#audioService.playClick();
      }
    });

    this.#router = new Router({
      '/': () => {
        this.#roomController.stopPolling();
        this.#gameView.showScreen('landing');
      },
      '/setup': () => {
        this.#roomController.stopPolling();
        this.#showSetup();
      },
      '/login': () => {
        this.#roomController.stopPolling();
        this.#authController.setMode(true);
        this.#gameView.showScreen('auth');
      },
      '/register': () => {
        this.#roomController.stopPolling();
        this.#authController.setMode(false);
        this.#gameView.showScreen('auth');
      },
      '/play': () => this.#showPlay(),
      '/room': () => this.#roomController.showSetup(),
      '/room/:code/play': () => this.#showPlay(),
      '/room/:code': (params) => this.#roomController.initRoom(params),
      '/certificate': () => {
        this.#roomController.stopPolling();
        this.#gameView.showScreen('certificate');
        ConfettiService.launch();
        this.#audioService.playFanfare();
      },
      '/profile': () => {
        this.#roomController.stopPolling();
        this.#profileController.loadProfile();
      },
      '/admin': async () => {
        this.#roomController.stopPolling();
        if (localStorage.getItem('is_admin') === 'true') {
          this.#showAdmin();
        } else {
          const token = localStorage.getItem('token');
          if (token) {
            try {
              const res = await fetch('/api/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (res.ok) {
                const data = await res.json();
                if (data.isAdmin) {
                  localStorage.setItem('is_admin', 'true');
                  this.#showAdmin();
                  return;
                }
              }
            } catch (e) {}
          }
          this.#router.navigate('/');
        }
      },
      '/legal': () => {
        this.#roomController.stopPolling();
        this.#gameView.showScreen('legal');
      }
    });

    this.#authController = new AuthController(this.#router, this.#authView, this.#navbarView);
    this.#profileController = new ProfileController(this.#router, this.#profileView, this.#navbarView, this.#gameView, this.#audioService);
    this.#controller = new GameController(this.#gameView, this.#mapView, this.#certificateView, this.#scoreController, this.#router, this.#audioService);
    this.#adminController = new AdminController(this.#adminView, this.#gameView);
    this.#roomController = new RoomController(this.#router, this.#roomView, this.#gameView, this.#controller);

    if (this.#authController.isAuthenticated()) {
      this.#gameView.setPlayerName(localStorage.getItem('username'));
      this.#profileController.fetchNavAvatar();
    }

    this.#gameView.onHeroPlay(() => {
      if (this.#authController.isAuthenticated()) {
        this.#router.navigate('/setup');
      } else {
        this.#router.navigate('/login');
      }
    });

    this.#navbarView.onLogoClick(() => {
      this.#router.navigate('/');
    });

    this.#gameView.onLeaderboardTabClick((type, difficulty) => {
      this.#scoreController.loadLeaderboard(type, difficulty);
    });

    this.#router.init();
  }

  #showSetup() {
    if (this.#authController.isAuthenticated()) {
      this.#gameView.setPlayerName(localStorage.getItem('username'));
      this.#gameView.showScreen('setup');
      const lastDiff = localStorage.getItem('citymaster_last_difficulty') || 'hard';
      this.#scoreController.loadLeaderboard('monthly', lastDiff);
    } else {
      this.#router.navigate('/login');
    }
  }

  #showPlay() {
    if (!this.#authController.isAuthenticated()) {
      this.#router.navigate('/login');
      return;
    }

    if (!this.#controller.hasActiveSession()) {
      if (!this.#controller.resumeGame()) {
        this.#router.navigate('/setup');
        return;
      }
      return;
    }

    this.#gameView.showScreen('game');
    this.#mapView.invalidateSize();
  }

  #showAdmin() {
    this.#authController.isAuthenticated();
    this.#gameView.showScreen('admin');
    this.#adminController.showDashboard();
  }

  static init() {
    document.addEventListener('DOMContentLoaded', async () => {
      fetch('/api/version').then(res => res.json()).then(data => {
        if (data.version && data.version !== 'unknown') {
          const logoBrand = document.getElementById('logo-brand');
          if (logoBrand && logoBrand.parentElement) {
            const vSpan = document.createElement('small');
            vSpan.className = 'version-tag';
            vSpan.textContent = `v${data.version}`;
            logoBrand.parentElement.appendChild(vSpan);
          }
        }
      }).catch(() => {});
      try {
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }

        const screens = ['landing', 'auth', 'setup', 'game', 'certificate', 'profile', 'legal', 'admin', 'room'];
        const appContainer = document.getElementById('app');
        const loadingHtml = appContainer.innerHTML;

        const htmlTemplates = await Promise.all(
          screens.map(async (screen) => {
            const response = await fetch(`/screens/${screen}.html`);
            if (!response.ok) {
              throw new Error(`Failed to load screen template: ${screen}`);
            }
            return response.text();
          })
        );

        appContainer.innerHTML = htmlTemplates.join('\n') + '\n' + loadingHtml;
        await I18nService.getInstance().init();
        new App();
      } catch (error) {
        console.error('Failed to initialize CityMaster application:', error);
      }
    });
  }
}

App.init();
