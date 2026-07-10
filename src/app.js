import { GameView } from './views/GameView.js';
import { MapView } from './views/MapView.js';
import { GameController } from './controllers/GameController.js';
import { AuthController } from './controllers/AuthController.js';
import { ProfileController } from './controllers/ProfileController.js';
import { Router } from './Router.js';

class App {
  #gameView;
  #mapView;
  #controller;
  #authController;
  #profileController;
  #router;

  constructor() {
    this.#gameView = new GameView();
    this.#mapView = new MapView();
    
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
      '/certificate': () => this.#gameView.showScreen('certificate'),
      '/profile': () => this.#profileController.loadProfile()
    });

    this.#authController = new AuthController(this.#router);
    this.#profileController = new ProfileController(this.#router);
    this.#controller = new GameController(this.#gameView, this.#mapView, this.#router);
    
    if (this.#authController.isAuthenticated()) {
      this.#profileController.fetchNavAvatar();
    }

    this.#gameView.onHeroPlay(() => {
      if (this.#authController.isAuthenticated()) {
        this.#router.navigate('/setup');
      } else {
        this.#router.navigate('/login');
      }
    });

    this.#router.init();
  }

  #showWelcome() {
    if (this.#authController.isAuthenticated()) {
      this.#gameView.showScreen('welcome');
      this.#controller.loadLeaderboard();
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
    document.addEventListener('DOMContentLoaded', () => {
      new App();
    });
  }
}

App.init();
