import { GameView } from './views/GameView.js';
import { MapView } from './views/MapView.js';
import { GameController } from './controllers/GameController.js';
import { AuthController } from './controllers/AuthController.js';
import { Router } from './Router.js';

class App {
  #gameView;
  #mapView;
  #controller;
  #authController;
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
      '/certificate': () => this.#gameView.showScreen('certificate')
    });

    this.#authController = new AuthController(this.#router);
    this.#controller = new GameController(this.#gameView, this.#mapView, this.#router);
    
    // Synchroniser l'interface utilisateur (Navbar) avec l'état de connexion dès le chargement
    this.#authController.isAuthenticated();

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
    
    // Si la partie vient d'être créée, hasActiveSession() est true.
    // Sinon (ex: rafraîchissement de la page), on essaie de la restaurer.
    if (!this.#controller.hasActiveSession()) {
      if (!this.#controller.resumeGame()) {
        // Aucune sauvegarde trouvée, on retourne au menu setup
        this.#router.navigate('/setup');
        return;
      }
    }
    
    this.#gameView.showScreen('game');
  }

  static init() {
    document.addEventListener('DOMContentLoaded', () => {
      new App();
    });
  }
}

App.init();
