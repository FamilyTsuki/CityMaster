import { I18nService } from '../../services/I18nService.js';

/**
 * Contrôleur interactif de l'écran de chargement en vol de CityMaster.
 * Gère l'animation de l'avion, la progression de vol, l'apparition des monuments,
 * la séquence de turbulences, le crash et l'apparition du point d'interrogation mystère.
 */
export class FlightLoader {
  #container;
  #airplane;
  #progressBar;
  #percentageVal;
  #statusText;
  #destinationLabel;
  #sky;
  #monuments;
  #crashDestination;
  #slider;
  #btnReplay;
  #btnPause;
  #btnPauseLabel;
  #btnCrash;
  #btnTheme;

  #progress = 0;
  #isRunning = false;
  #isPaused = false;
  #animationTimer = null;
  #shakeTimeout = null;
  #i18n = null;

  /**
   * @param {HTMLElement} [container] - Conteneur parent (#load-screen ou document)
   */
  constructor(container = null) {
    this.#container = container || (typeof document !== 'undefined' ? document.getElementById('load-screen') : null) || document;
    try {
      this.#i18n = I18nService.getInstance();
    } catch (_) {
      this.#i18n = null;
    }
    this.#initDOMElements();
    this.#bindEvents();
  }

  #initDOMElements() {
    if (!this.#container) return;

    this.#airplane = this.#container.querySelector('#airplane-carrier');
    this.#progressBar = this.#container.querySelector('#flight-progress-bar');
    this.#percentageVal = this.#container.querySelector('#flight-percentage');
    this.#statusText = this.#container.querySelector('#flight-status-text');
    this.#destinationLabel = this.#container.querySelector('#flight-destination-label');
    this.#sky = this.#container.querySelector('#flight-sky');
    this.#crashDestination = this.#container.querySelector('#crash-destination');

    this.#monuments = [
      { id: 'monument-1', threshold: 25, el: this.#container.querySelector('#monument-1') },
      { id: 'monument-2', threshold: 55, el: this.#container.querySelector('#monument-2') },
      { id: 'monument-3', threshold: 78, el: this.#container.querySelector('#monument-3') },
    ];

    this.#slider = this.#container.querySelector('#flight-slider');
    this.#btnReplay = this.#container.querySelector('#btn-flight-replay');
    this.#btnPause = this.#container.querySelector('#btn-flight-pause');
    this.#btnPauseLabel = this.#container.querySelector('#btn-flight-pause-label');
    this.#btnCrash = this.#container.querySelector('#btn-flight-crash');
    this.#btnTheme = this.#container.querySelector('#btn-flight-theme');
  }

  #bindEvents() {
    if (this.#btnReplay) {
      this.#btnReplay.addEventListener('click', () => this.replay());
    }

    if (this.#btnPause) {
      this.#btnPause.addEventListener('click', () => {
        if (this.#isPaused) {
          this.resume();
        } else {
          this.pause();
        }
      });
    }

    if (this.#btnCrash) {
      this.#btnCrash.addEventListener('click', () => this.triggerCrash());
    }

    if (this.#slider) {
      this.#slider.addEventListener('input', (e) => {
        this.pause();
        const val = parseFloat(e.target.value);
        this.setProgress(val);
      });
    }

    if (this.#btnTheme) {
      this.#btnTheme.addEventListener('click', () => this.toggleTheme());
    }
  }

  /**
   * Définit précisément la progression du vol (de 0 à 100) et met à jour l'ensemble des éléments visuels.
   * @param {number} value - Pourcentage de 0 à 100
   */
  setProgress(value) {
    this.#progress = Math.max(0, Math.min(100, Number(value) || 0));

    // 1. Barre de chargement
    if (this.#progressBar) {
      this.#progressBar.style.width = `${this.#progress}%`;
    }

    // 2. Chiffre du pourcentage
    if (this.#percentageVal) {
      this.#percentageVal.textContent = `${Math.round(this.#progress)}%`;
    }

    // 3. Curseur slider
    if (this.#slider && (typeof document === 'undefined' || document.activeElement !== this.#slider)) {
      this.#slider.value = String(Math.round(this.#progress));
    }

    // 4. Calcul de la position horizontale de l'avion (de 5% à 93%)
    const xPos = 5 + (this.#progress / 100) * 88;
    if (this.#airplane) {
      this.#airplane.style.left = `${xPos}%`;
    }

    // 5. Apparition séquentielle des monuments
    this.#monuments.forEach((monument) => {
      if (!monument.el) return;
      if (this.#progress >= monument.threshold) {
        monument.el.classList.add('revealed');
      } else {
        monument.el.classList.remove('revealed');
      }
    });

    // 6. États de vol, messages et Crash
    if (this.#progress < 20) {
      this.#setStatus('flight.takeoff', 'Décollage imminent...');
      this.#setDestination('flight.cruising', 'En vol de croisière...');
      this.#resetPlaneFlight();
      if (this.#crashDestination) {
        this.#crashDestination.classList.remove('crashed');
      }
      if (this.#sky) {
        this.#sky.classList.remove('shake');
      }
    } else if (this.#progress < 88) {
      this.#setStatus('flight.cruising', 'Vol de croisière...');
      this.#setDestination('flight.cruising', 'En vol de croisière...');
      this.#resetPlaneFlight();
      if (this.#crashDestination) {
        this.#crashDestination.classList.remove('crashed');
      }
      if (this.#sky) {
        this.#sky.classList.remove('shake');
      }
    } else if (this.#progress < 97) {
      // Zone de turbulences intenses
      this.#setStatus('flight.turbulence', 'Alerte : fortes turbulences !');
      this.#setDestination('flight.turbulence', 'Alerte turbulences !');
      if (this.#airplane) {
        this.#airplane.classList.remove('flying', 'diving', 'crashed');
        this.#airplane.classList.add('wobbling');
      }
      if (this.#crashDestination) {
        this.#crashDestination.classList.remove('crashed');
      }
    } else {
      // Crash & Destination mystère
      this.#executeCrashSequence();
    }
  }

  #setStatus(i18nKey, fallback) {
    if (!this.#statusText) return;
    const txt = this.#i18n?.t(i18nKey) || fallback;
    this.#statusText.textContent = txt;
  }

  #setDestination(i18nKey, fallback) {
    if (!this.#destinationLabel) return;
    const txt = this.#i18n?.t(i18nKey) || fallback;
    this.#destinationLabel.textContent = txt;
  }

  #resetPlaneFlight() {
    if (!this.#airplane) return;
    this.#airplane.classList.remove('wobbling', 'diving', 'crashed');
    this.#airplane.classList.add('flying');
    this.#airplane.style.top = '55px';
  }

  #executeCrashSequence() {
    this.#setStatus('flight.crashed', 'Destination inconnue... Où sommes-nous ?');
    this.#setDestination('flight.mystery', 'Où sommes-nous ?');

    if (this.#airplane) {
      this.#airplane.classList.remove('flying', 'wobbling');
      this.#airplane.classList.add('crashed');
      this.#airplane.style.top = '170px';
    }

    if (this.#crashDestination) {
      this.#crashDestination.classList.add('crashed');
    }

    if (this.#sky) {
      this.#sky.classList.add('shake');
      clearTimeout(this.#shakeTimeout);
      this.#shakeTimeout = setTimeout(() => {
        if (this.#sky) {
          this.#sky.classList.remove('shake');
        }
      }, 450);
    }
  }

  /**
   * Lance l'animation de vol de manière fluide jusqu'à 100%.
   * @param {Object} [options]
   * @param {number} [options.duration=4500] - Durée totale de la traversée en ms
   * @param {Function} [options.onComplete] - Callback déclenché à la fin du crash
   */
  start({ duration = 4500, onComplete = null } = {}) {
    this.stop();
    this.setProgress(0);
    this.#isRunning = true;
    this.#isPaused = false;
    this.#updatePauseButton(false);

    const startTime = performance.now();
    const intervalMs = 25;
    const step = 100 / (duration / intervalMs);

    this.#animationTimer = setInterval(() => {
      if (this.#isPaused) return;

      const nextVal = this.#progress + step;
      if (nextVal >= 100) {
        this.setProgress(100);
        this.stop();
        if (typeof onComplete === 'function') {
          setTimeout(onComplete, 800);
        }
      } else {
        this.setProgress(nextVal);
      }
    }, intervalMs);
  }

  /**
   * Met en pause l'animation active.
   */
  pause() {
    this.#isPaused = true;
    this.#updatePauseButton(true);
  }

  /**
   * Reprend l'animation de vol.
   */
  resume() {
    if (!this.#isRunning) {
      this.start();
      return;
    }
    this.#isPaused = false;
    this.#updatePauseButton(false);
  }

  #updatePauseButton(isPaused) {
    if (this.#btnPauseLabel) {
      this.#btnPauseLabel.textContent = isPaused
        ? (this.#i18n?.t('flight.resume') || 'Reprendre')
        : (this.#i18n?.t('flight.pause') || 'Pause');
    }
    const icon = this.#container?.querySelector('#btn-flight-pause-icon');
    if (icon) {
      icon.textContent = isPaused ? '▶️' : '⏸️';
    }
  }

  /**
   * Recommence le vol depuis le début.
   */
  replay() {
    this.start();
  }

  /**
   * Force un crash immédiat pour test ou fin abrupte.
   */
  triggerCrash() {
    this.stop();
    this.setProgress(100);
  }

  /**
   * Arrête le timer d'animation.
   */
  stop() {
    if (this.#animationTimer) {
      clearInterval(this.#animationTimer);
      this.#animationTimer = null;
    }
    this.#isRunning = false;
    this.#isPaused = false;
    this.#updatePauseButton(false);
  }

  /**
   * Alterne entre le thème clair et le thème sombre.
   */
  toggleTheme() {
    if (typeof document === 'undefined') return;
    const current = document.documentElement?.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement?.setAttribute('data-theme', next);
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem('theme', next);
      }
    } catch (_) {
      // Ignorer si localStorage n'est pas disponible
    }
  }

  /**
   * Nettoie les écouteurs et arrêts lors de la destruction du composant.
   */
  destroy() {
    this.stop();
    clearTimeout(this.#shakeTimeout);
  }

  /**
   * Retourne la progression actuelle.
   * @returns {number}
   */
  get progress() {
    return this.#progress;
  }
}
