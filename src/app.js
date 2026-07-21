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
import { Router } from './Router.js';

class App {
  #gameView;
  #mapView;
  #certificateView;
  #navbarView;
  #authView;
  #profileView;
  #scoreController;
  #controller;
  #authController;
  #profileController;
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
    this.#scoreController = new ScoreController(this.#gameView);

    document.addEventListener('click', (e) => {
      if (e.target.closest('button, .btn, a, li, .icon-btn')) {
        this.#audioService.playClick();
      }
    });

    this.#router = new Router({
      '/': () => this.#gameView.showScreen('landing'),
      '/setup': () => this.#showWelcome(),
      '/login': () => {
        this.#authController.setMode(true);
        this.#gameView.showScreen('auth');
      },
      '/register': () => {
        this.#authController.setMode(false);
        this.#gameView.showScreen('auth');
      },
      '/play': () => this.#showPlay(),
      '/certificate': () => {
        this.#gameView.showScreen('certificate');
        ConfettiService.launch();
        this.#audioService.playFanfare();
      },
      '/profile': () => this.#profileController.loadProfile()
    });

    this.#authController = new AuthController(this.#router, this.#authView, this.#navbarView);
    this.#profileController = new ProfileController(this.#router, this.#profileView, this.#navbarView, this.#gameView, this.#audioService);
    this.#controller = new GameController(this.#gameView, this.#mapView, this.#certificateView, this.#scoreController, this.#router, this.#audioService);

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

    this.#router.init();
  }

  #showWelcome() {
    if (this.#authController.isAuthenticated()) {
      this.#gameView.setPlayerName(localStorage.getItem('username'));
      this.#gameView.showScreen('welcome');
      this.#scoreController.loadLeaderboard();
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

  static init() {
    document.addEventListener('DOMContentLoaded', async () => {
      try {
        const screens = ['landing', 'auth', 'welcome', 'game', 'certificate', 'profile'];
        const appContainer = document.getElementById('app');
        const loadingHtml = appContainer.innerHTML;

        const htmlTemplates = await Promise.all(
          screens.map(async (screen) => {
            const response = await fetch(`screens/${screen}.html`);
            if (!response.ok) {
              throw new Error(`Failed to load screen template: ${screen}`);
            }
            return response.text();
          })
        );

        appContainer.innerHTML = htmlTemplates.join('\n') + '\n' + loadingHtml;
        new App();
      } catch (error) {
        console.error('Failed to initialize CityMaster application:', error);
      }
    });
  }
}

App.init();
