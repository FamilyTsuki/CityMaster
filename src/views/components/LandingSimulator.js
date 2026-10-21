/**
 * Simulateur interactif de gameplay pour la page d'accueil de CityMaster.
 * Illustre le cœur du jeu : la recherche de rue, le ciblage sur carte,
 * le tracé vert fluo de réussite, l'affichage du score (+500 pts) et de la série combo.
 */
export class LandingSimulator {
  #container;
  #promptEl;
  #scorePopupEl;
  #svgRoads = [];
  #reticleEl;
  #currentIndex = 0;
  #timer = null;
  #screenObserver = null;
  #landingScreen = null;

  static #STREETS = [
    {
      name: 'Avenue des Champs-Élysées',
      targetPos: { x: 50, y: 35 },
      roadId: 'sim-road-main',
    },
    {
      name: 'Boulevard Saint-Michel',
      targetPos: { x: 68, y: 62 },
      roadId: 'sim-road-cross',
    },
    {
      name: 'Quai de la Tournelle',
      targetPos: { x: 30, y: 70 },
      roadId: 'sim-road-river',
    },
    {
      name: 'Rue de la Paix',
      targetPos: { x: 35, y: 25 },
      roadId: 'sim-road-diag',
    },
    {
      name: 'Place de la République',
      targetPos: { x: 75, y: 30 },
      roadId: 'sim-road-ring',
    },
  ];

  constructor(container = null) {
    this.#container =
      container ||
      (typeof document !== 'undefined'
        ? document.querySelector('.game-preview-stage')
        : null);
    this.#landingScreen =
      typeof document !== 'undefined'
        ? document.getElementById('landing-screen')
        : null;

    if (!this.#container) return;

    this.#initDOM();
  }

  #initDOM() {
    this.#promptEl = this.#container.querySelector('.sim-street-target');
    this.#scorePopupEl = this.#container.querySelector('.sim-score-burst');
    this.#reticleEl = this.#container.querySelector('.sim-target-reticle');
    this.#svgRoads = Array.from(this.#container.querySelectorAll('.sim-road-line'));

    const mapArea = this.#container.querySelector('.simulator-map-viewport');
    if (mapArea) {
      mapArea.addEventListener('click', (e) => this.#onUserMapClick(e));
    }

    if (this.#landingScreen && typeof MutationObserver !== 'undefined') {
      this.#screenObserver = new MutationObserver(() => {
        if (this.#landingScreen.classList.contains('active')) {
          this.start();
        } else {
          this.stop();
        }
      });
      this.#screenObserver.observe(this.#landingScreen, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }

    this.start();
  }

  start() {
    if (this.#timer) return;
    this.#runStep();
    this.#timer = setInterval(() => this.#runStep(), 4000);
  }

  stop() {
    if (this.#timer) {
      clearInterval(this.#timer);
      this.#timer = null;
    }
  }

  #runStep() {
    if (!this.#container) return;
    const item = LandingSimulator.#STREETS[this.#currentIndex];
    this.#currentIndex = (this.#currentIndex + 1) % LandingSimulator.#STREETS.length;

    if (this.#promptEl) {
      this.#promptEl.textContent = item.name;
    }

    // Réinitialiser les animations des rues
    this.#svgRoads.forEach((r) => {
      r.classList.remove('active-target', 'success-glow');
    });

    // Déplacer la cible vers la position
    if (this.#reticleEl) {
      this.#reticleEl.style.left = `${item.targetPos.x}%`;
      this.#reticleEl.style.top = `${item.targetPos.y}%`;
      this.#reticleEl.classList.remove('locking', 'hit');
      void this.#reticleEl.offsetWidth; // force reflow
      this.#reticleEl.classList.add('locking');
    }

    // Après 800ms de déplacement, la cible verrouille et la rue s'illumine en vert
    setTimeout(() => {
      if (!this.#container) return;
      if (this.#reticleEl) {
        this.#reticleEl.classList.add('hit');
      }

      const activeRoad = this.#container.querySelector(`#${item.roadId}`);
      if (activeRoad) {
        activeRoad.classList.add('success-glow');
      }

      this.#triggerScorePopup(item.targetPos.x, item.targetPos.y);
    }, 900);
  }

  #triggerScorePopup(xPercent, yPercent) {
    if (!this.#scorePopupEl) return;
    this.#scorePopupEl.style.left = `${xPercent}%`;
    this.#scorePopupEl.style.top = `${Math.max(12, yPercent - 12)}%`;
    this.#scorePopupEl.classList.remove('animate-pop');
    void this.#scorePopupEl.offsetWidth; // force reflow
    this.#scorePopupEl.classList.add('animate-pop');
  }

  #onUserMapClick(e) {
    const mapArea = this.#container.querySelector('.simulator-map-viewport');
    if (!mapArea) return;

    const rect = mapArea.getBoundingClientRect();
    const xPct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const yPct = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    if (this.#reticleEl) {
      this.#reticleEl.style.left = `${xPct}%`;
      this.#reticleEl.style.top = `${yPct}%`;
      this.#reticleEl.classList.remove('locking', 'hit');
      void this.#reticleEl.offsetWidth;
      this.#reticleEl.classList.add('hit');
    }

    // Illumination aléatoire d'une rue
    const randomRoad =
      this.#svgRoads[Math.floor(Math.random() * this.#svgRoads.length)];
    if (randomRoad) {
      randomRoad.classList.add('success-glow');
      setTimeout(() => randomRoad.classList.remove('success-glow'), 1800);
    }

    this.#triggerScorePopup(xPct, yPct);
  }

  destroy() {
    this.stop();
    if (this.#screenObserver) this.#screenObserver.disconnect();
  }
}

