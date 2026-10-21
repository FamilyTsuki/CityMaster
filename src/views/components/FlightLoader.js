/**
 * Contrôleur interactif de l'écran de chargement en vol de CityMaster.
 * Gère l'animation de l'avion le long de la trajectoire pointillée,
 * l'orientation/tangage dynamique, le positionnement et l'apparition des monuments,
 * ainsi que la disparition douce dans le nuage mystère à destination.
 */
export class FlightLoader {
  #container;
  #airplane;
  #progressBar;
  #percentageVal;
  #sky;
  #monuments;
  #destinationCloud;
  #curveProgressLine;
  #cloudPitch = 16;

  #progress = 0;
  #animationTimer = null;

  static #CURVE = {
    p0: { x: 6, y: 72 },
    p1: { x: 50, y: 50 },
    p2: { x: 92, y: 76 },
  };

  /**
   * @param {HTMLElement} [container] - Conteneur parent (#load-screen ou document)
   */
  constructor(container = null) {
    this.#container =
      container ||
      (typeof document !== 'undefined'
        ? document.getElementById('load-screen')
        : null) ||
      document;
    this.#initDOMElements();
  }

  #initDOMElements() {
    if (!this.#container) return;

    this.#airplane = this.#container.querySelector('#airplane-carrier');
    this.#progressBar = this.#container.querySelector('#flight-progress-bar');
    this.#percentageVal = this.#container.querySelector('#flight-percentage');
    this.#sky = this.#container.querySelector('#flight-sky');
    this.#curveProgressLine = this.#container.querySelector('#flight-curve-progress-line');
    this.#destinationCloud =
      this.#container.querySelector('#destination-cloud') ||
      this.#container.querySelector('#crash-destination');

    this.#monuments = [
      {
        id: 'monument-1',
        threshold: 25,
        el: this.#container.querySelector('#monument-1'),
      },
      {
        id: 'monument-2',
        threshold: 52,
        el: this.#container.querySelector('#monument-2'),
      },
      {
        id: 'monument-3',
        threshold: 74,
        el: this.#container.querySelector('#monument-3'),
      },
    ];

    this.#setupMonuments();
    this.#setupDestinationCloud();
  }

  #getPointOnCurve(t) {
    const u = 1 - t;
    const { p0, p1, p2 } = FlightLoader.#CURVE;
    const x = u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x;
    const y = u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y;
    const dx = 2 * u * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
    const dy = 2 * u * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
    return { x, y, dx, dy };
  }

  #calculatePitch(pt) {
    const skyRect = this.#sky?.getBoundingClientRect?.();
    const aspect =
      skyRect && skyRect.width > 0 && skyRect.height > 0
        ? skyRect.height / skyRect.width
        : this.#sky?.clientWidth > 0 && this.#sky?.clientHeight > 0
          ? this.#sky.clientHeight / this.#sky.clientWidth
          : 260 / 1000;
    const angle = Math.atan2(pt.dy * aspect, pt.dx) * (180 / Math.PI);
    return Math.round(angle * 10) / 10;
  }

  /**
   * Positionne et oriente initialement les monuments directement sur la trajectoire pointillée.
   */
  #setupMonuments() {
    this.#monuments.forEach((monument) => {
      if (!monument.el) return;
      const t = monument.threshold / 100;
      const pt = this.#getPointOnCurve(t);
      const pitch = this.#calculatePitch(pt);
      monument.pitch = pitch;
      const posX = Math.round(pt.x * 10) / 10;
      const posY = Math.round(pt.y * 10) / 10;
      monument.el.style.left = `${posX}%`;
      monument.el.style.top = `${posY}%`;
      monument.el.style.transform = `translate(-50%, calc(-100% - 14px)) rotate(${pitch}deg) scale(0.6)`;
    });
  }

  /**
   * Positionne et oriente initialement le nuage de destination sur la trajectoire pointillée.
   */
  #setupDestinationCloud() {
    if (!this.#destinationCloud) return;
    const t = 0.85;
    const pt = this.#getPointOnCurve(t);
    const pitch = this.#calculatePitch(pt);
    this.#cloudPitch = pitch;
    const posX = Math.round(pt.x * 10) / 10;
    const posY = Math.round(pt.y * 10) / 10;
    this.#destinationCloud.style.left = `${posX}%`;
    this.#destinationCloud.style.top = `${posY}%`;
    this.#destinationCloud.style.setProperty('--cloud-pitch', `${pitch}deg`);
    this.#destinationCloud.style.transform = `translate(-50%, -50%) rotate(${pitch}deg) scale(0.35)`;
  }

  /**
   * Définit précisément la progression du vol (de 0 à 100) et met à jour l'ensemble des éléments visuels.
   * @param {number} value - Pourcentage de 0 à 100
   */
  setProgress(value) {
    this.#progress = Math.max(0, Math.min(100, Number(value) || 0));

    if (this.#progressBar) {
      this.#progressBar.style.width = `${this.#progress}%`;
    }

    if (this.#curveProgressLine) {
      const len = 874;
      const offset = Math.round(len * (1 - this.#progress / 100) * 10) / 10;
      this.#curveProgressLine.style.strokeDashoffset = `${offset}`;
      if (typeof this.#curveProgressLine.setAttribute === 'function') {
        this.#curveProgressLine.setAttribute('stroke-dashoffset', offset);
      }
    }

    if (this.#percentageVal) {
      this.#percentageVal.textContent = `${Math.round(this.#progress)}%`;
    }

    const t = this.#progress / 100;
    const pt = this.#getPointOnCurve(t);

    if (this.#airplane) {
      this.#airplane.style.left = `${pt.x}%`;
      this.#airplane.style.top = `${pt.y}%`;

      const wrapper = this.#airplane.querySelector('.plane-wrapper');
      if (wrapper && this.#progress < 80) {
        const pitch = this.#calculatePitch(pt);
        wrapper.style.transform = `rotate(${pitch}deg)`;
      }
    }

    this.#monuments.forEach((monument) => {
      if (!monument.el) return;
      if (this.#progress >= monument.threshold) {
        monument.el.classList.add('revealed');
        monument.el.style.transform = `translate(-50%, calc(-100% - 32px)) rotate(${monument.pitch}deg) scale(1)`;
      } else {
        monument.el.classList.remove('revealed');
        monument.el.style.transform = `translate(-50%, calc(-100% - 14px)) rotate(${monument.pitch}deg) scale(0.6)`;
      }
    });

    if (this.#destinationCloud) {
      if (this.#progress >= 50) {
        this.#destinationCloud.classList.add('revealed');
        this.#destinationCloud.style.transform = `translate(-50%, -50%) rotate(${this.#cloudPitch}deg) scale(1)`;
      } else {
        this.#destinationCloud.classList.remove('revealed');
        this.#destinationCloud.style.transform = `translate(-50%, -50%) rotate(${this.#cloudPitch}deg) scale(0.35)`;
      }
    }

    if (this.#progress < 80) {
      this.#resetPlaneFlight();
      if (this.#destinationCloud) {
        this.#destinationCloud.classList.remove('active');
      }
    } else {
      this.#enterCloudSequence();
    }
  }

  #resetPlaneFlight() {
    if (!this.#airplane) return;
    this.#airplane.classList.remove('in-cloud');
    this.#airplane.classList.add('flying');
  }

  #enterCloudSequence() {
    if (this.#airplane) {
      this.#airplane.classList.remove('flying');
      this.#airplane.classList.add('in-cloud');
    }

    if (this.#destinationCloud) {
      this.#destinationCloud.classList.add('active');
    }
  }

  /**
   * Lance l'animation de vol de manière fluide jusqu'à 100%.
   * @param {Object} [options]
   * @param {number} [options.duration=4500] - Durée totale de la traversée en ms
   * @param {Function} [options.onComplete] - Callback déclenché à la fin du chargement
   */
  start({ duration = 4500, onComplete = null } = {}) {
    this.stop();
    this.setProgress(0);

    const intervalMs = 25;
    const step = 100 / (duration / intervalMs);

    this.#animationTimer = setInterval(() => {
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
   * Arrête le timer d'animation.
   */
  stop() {
    if (this.#animationTimer) {
      clearInterval(this.#animationTimer);
      this.#animationTimer = null;
    }
  }

  /**
   * Nettoie les ressources lors de la destruction du composant.
   */
  destroy() {
    this.stop();
  }

  /**
   * Retourne la progression actuelle.
   * @returns {number}
   */
  get progress() {
    return this.#progress;
  }
}
