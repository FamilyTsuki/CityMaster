/**
 * Animation interactive et vivante des racines de rues sur les bords de l'écran.
 * Fait pousser des ramifications routières (boulevards, avenues, ruelles) depuis les côtés,
 * puis fait circuler des impulsions lumineuses / flux de circulation continus
 * réagissant au survol de la souris.
 */
export class StreetRootsAnimation {
  #canvas;
  #ctx;
  #width = 0;
  #height = 0;
  #dpr = 1;
  #rafId = null;
  #branches = [];
  #particles = [];
  #growStartTime = 0;
  #growDuration = 2200; // 2.2s de pousse fluide
  #isGrown = false;
  #mousePos = { x: -9999, y: -9999 };
  #isReducedMotion = false;
  #themeObserver = null;
  #screenObserver = null;
  #container = null;
  #lastTime = 0;

  constructor(canvas) {
    if (!canvas) return;
    this.#canvas = canvas;
    this.#ctx = canvas.getContext('2d');
    this.#container = canvas.closest('#landing-screen') || canvas.parentElement;

    if (typeof window !== 'undefined') {
      this.#isReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
    }

    this.#init();
  }

  #init() {
    this.resize();

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => this.resize(), { passive: true });

      if (this.#container) {
        this.#container.addEventListener(
          'pointermove',
          (e) => {
            const rect = this.#canvas.getBoundingClientRect();
            this.#mousePos.x = (e.clientX - rect.left) * this.#dpr;
            this.#mousePos.y = (e.clientY - rect.top) * this.#dpr;
          },
          { passive: true },
        );

        this.#container.addEventListener(
          'pointerleave',
          () => {
            this.#mousePos.x = -9999;
            this.#mousePos.y = -9999;
          },
          { passive: true },
        );
      }

      // Observer pour observer l'activation de l'écran landing
      if (this.#container && typeof MutationObserver !== 'undefined') {
        this.#screenObserver = new MutationObserver(() => {
          if (this.#container.classList.contains('active')) {
            this.start();
          } else {
            this.stop();
          }
        });
        this.#screenObserver.observe(this.#container, {
          attributes: true,
          attributeFilter: ['class'],
        });
      }

      // Observer pour détecter le changement de thème clair / sombre
      if (typeof MutationObserver !== 'undefined' && document.documentElement) {
        this.#themeObserver = new MutationObserver(() => {
          this.#updateColors();
        });
        this.#themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['data-theme'],
        });
      }
    }

    this.start();
  }

  resize() {
    if (!this.#canvas || !this.#container) return;

    this.#dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const rect = this.#container.getBoundingClientRect();
    this.#width = Math.max(320, Math.floor(rect.width * this.#dpr));
    this.#height = Math.max(480, Math.floor(rect.height * this.#dpr));

    this.#canvas.width = this.#width;
    this.#canvas.height = this.#height;
    this.#canvas.style.width = '100%';
    this.#canvas.style.height = '100%';

    this.#buildRoadNetwork();
  }

  #isDarkMode() {
    if (typeof document === 'undefined') return false;
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  #getColors() {
    const isDark = this.#isDarkMode();
    if (isDark) {
      return {
        roadTrunk: 'rgba(249, 115, 22, 0.72)', // Orange néon vif
        roadSecondary: 'rgba(251, 146, 60, 0.55)',
        roadAlley: 'rgba(253, 186, 116, 0.38)',
        roadHover: 'rgba(255, 237, 213, 0.95)',
        nodeBorder: 'rgba(249, 115, 22, 0.85)',
        nodeFill: 'rgba(20, 24, 38, 0.95)',
        particle: 'rgba(254, 240, 138, 1)', // Or électrique
        particleGlow: 'rgba(250, 204, 21, 0.85)',
      };
    } else {
      return {
        roadTrunk: 'rgba(2, 132, 199, 0.68)', // Bleu roi cartographique
        roadSecondary: 'rgba(14, 165, 233, 0.52)',
        roadAlley: 'rgba(56, 189, 248, 0.38)',
        roadHover: 'rgba(3, 105, 161, 0.95)',
        nodeBorder: 'rgba(2, 132, 199, 0.85)',
        nodeFill: 'rgba(255, 255, 255, 0.96)',
        particle: 'rgba(234, 88, 12, 1)', // Phare ambre vif
        particleGlow: 'rgba(249, 115, 22, 0.8)',
      };
    }
  }

  #updateColors() {
    // Les couleurs sont lues dynamiquement à chaque frame
  }

  #buildRoadNetwork() {
    this.#branches = [];
    this.#particles = [];
    const w = this.#width;
    const h = this.#height;

    const isMobile = w < 768 * this.#dpr;
    // Portée vers le centre : ~38% de la largeur sur PC, ~30% sur mobile
    const reach = isMobile ? w * 0.30 : Math.min(w * 0.38, 540 * this.#dpr);

    // Racines côté gauche (poussent de x = 0 vers la droite)
    const leftTrunkHeights = [0.22, 0.45, 0.68, 0.85];
    leftTrunkHeights.forEach((frac, i) => {
      this.#generateRootTree({
        side: 'left',
        startX: 0,
        startY: h * frac,
        angle: (Math.random() - 0.5) * 0.35, // direction générale vers l'est
        reach,
        depth: 0,
        branchId: `L_${i}`,
        timeOffset: i * 0.12,
      });
    });

    // Racines côté droit (poussent de x = width vers la gauche)
    const rightTrunkHeights = [0.18, 0.40, 0.62, 0.82];
    rightTrunkHeights.forEach((frac, i) => {
      this.#generateRootTree({
        side: 'right',
        startX: w,
        startY: h * frac,
        angle: Math.PI + (Math.random() - 0.5) * 0.35, // direction générale vers l'ouest
        reach,
        depth: 0,
        branchId: `R_${i}`,
        timeOffset: i * 0.12 + 0.08,
      });
    });

    // Création de 20 particules de circulation circulant sur le réseau
    const totalBranches = this.#branches.length;
    if (totalBranches > 0) {
      for (let p = 0; p < 24; p++) {
        const branchIndex = Math.floor(Math.random() * totalBranches);
        this.#particles.push({
          branchIndex,
          t: Math.random(),
          speed: 0.15 + Math.random() * 0.25, // vitesse relative
          size: 2.2 * this.#dpr,
          direction: Math.random() > 0.2 ? 1 : -1,
        });
      }
    }

    this.#growStartTime = performance.now();
    this.#isGrown = this.#isReducedMotion;
  }

  #generateRootTree(config) {
    const { startX, startY, angle, reach, depth, branchId, timeOffset, side } =
      config;
    if (depth > 2) return;

    // Longueur du segment selon la profondeur
    const segLength = (depth === 0 ? 0.48 : depth === 1 ? 0.35 : 0.25) * reach;

    // Contrôles de courbure Bézier pour un rendu fluide et organique
    const endX = startX + Math.cos(angle) * segLength;
    const endY = startY + Math.sin(angle) * segLength;

    const bend = ((Math.random() - 0.5) * segLength * 0.4);
    const cpX = (startX + endX) / 2 + Math.sin(angle) * bend;
    const cpY = (startY + endY) / 2 - Math.cos(angle) * bend;

    const width =
      depth === 0
        ? 3.6 * this.#dpr
        : depth === 1
          ? 2.2 * this.#dpr
          : 1.3 * this.#dpr;

    const startT = Math.min(0.9, timeOffset);
    const endT = Math.min(1.0, startT + (depth === 0 ? 0.45 : depth === 1 ? 0.35 : 0.25));

    const branch = {
      id: branchId,
      depth,
      side,
      p0: { x: startX, y: startY },
      cp: { x: cpX, y: cpY },
      p1: { x: endX, y: endY },
      width,
      startT,
      endT,
      hasNode: depth < 2,
      nodeRadius: (depth === 0 ? 4.5 : 3.2) * this.#dpr,
    };

    this.#branches.push(branch);

    // Création de 1 ou 2 sous-branches (ramifications de racines/rues)
    const childCount = depth === 0 ? 2 : depth === 1 ? (Math.random() > 0.3 ? 2 : 1) : 0;
    for (let c = 0; c < childCount; c++) {
      const spreadAngle = (c === 0 ? -1 : 1) * (0.35 + Math.random() * 0.3);
      this.#generateRootTree({
        side,
        startX: endX,
        startY: endY,
        angle: angle + spreadAngle,
        reach: reach * 0.75,
        depth: depth + 1,
        branchId: `${branchId}_${c}`,
        timeOffset: endT * 0.85,
      });
    }
  }

  start() {
    this.resize();
    if (this.#rafId) return;
    this.#growStartTime = performance.now();
    this.#lastTime = performance.now();
    this.#renderLoop(this.#lastTime);
  }

  stop() {
    if (this.#rafId) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }
  }

  #renderLoop(now) {
    const dt = Math.min(0.1, (now - this.#lastTime) / 1000);
    this.#lastTime = now;

    this.#draw(now, dt);

    if (this.#container && !this.#container.classList.contains('active')) {
      this.stop();
      return;
    }

    this.#rafId = requestAnimationFrame((t) => this.#renderLoop(t));
  }

  #getPointOnBezier(p0, cp, p1, t) {
    const u = 1 - t;
    return {
      x: u * u * p0.x + 2 * u * t * cp.x + t * t * p1.x,
      y: u * u * p0.y + 2 * u * t * cp.y + t * t * p1.y,
    };
  }

  #draw(now, dt) {
    if (!this.#ctx || this.#width === 0 || this.#height === 0) return;

    const ctx = this.#ctx;
    ctx.clearRect(0, 0, this.#width, this.#height);

    const colors = this.#getColors();
    const elapsed = now - this.#growStartTime;
    const globalProgress = this.#isReducedMotion
      ? 1
      : Math.min(1, elapsed / this.#growDuration);

    if (globalProgress >= 1) {
      this.#isGrown = true;
    }

    // 1. Dessin des voies / racines
    this.#branches.forEach((b) => {
      // Déterminer la portion visible de ce segment selon sa fenêtre startT..endT
      let segProgress = 1;
      if (!this.#isGrown) {
        if (globalProgress <= b.startT) {
          segProgress = 0;
        } else if (globalProgress >= b.endT) {
          segProgress = 1;
        } else {
          segProgress = (globalProgress - b.startT) / (b.endT - b.startT);
        }
      }

      if (segProgress <= 0) return;

      // Calcul de la distance à la souris pour l'interaction dynamique
      const mid = this.#getPointOnBezier(b.p0, b.cp, b.p1, 0.5);
      const distMouse = Math.hypot(this.#mousePos.x - mid.x, this.#mousePos.y - mid.y);
      const isHovered = distMouse < 140 * this.#dpr;

      ctx.beginPath();
      ctx.moveTo(b.p0.x, b.p0.y);

      if (segProgress >= 1) {
        ctx.quadraticCurveTo(b.cp.x, b.cp.y, b.p1.x, b.p1.y);
      } else {
        // Tracé partiel de la courbe
        const partialCp = {
          x: b.p0.x + (b.cp.x - b.p0.x) * segProgress,
          y: b.p0.y + (b.cp.y - b.p0.y) * segProgress,
        };
        const partialEnd = this.#getPointOnBezier(b.p0, b.cp, b.p1, segProgress);
        ctx.quadraticCurveTo(partialCp.x, partialCp.y, partialEnd.x, partialEnd.y);
      }

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = b.width * (isHovered ? 1.45 : 1);

      if (isHovered) {
        ctx.strokeStyle = colors.roadHover;
        ctx.shadowColor = colors.particleGlow;
        ctx.shadowBlur = 12 * this.#dpr;
      } else {
        ctx.strokeStyle =
          b.depth === 0
            ? colors.roadTrunk
            : b.depth === 1
              ? colors.roadSecondary
              : colors.roadAlley;
        ctx.shadowBlur = 0;
      }

      ctx.stroke();
      ctx.shadowBlur = 0;

      // Nœuds d'intersection (ronds-points / carrefours urbains)
      if (b.hasNode && segProgress >= 1) {
        ctx.beginPath();
        ctx.arc(b.p1.x, b.p1.y, b.nodeRadius, 0, Math.PI * 2);
        ctx.fillStyle = colors.nodeFill;
        ctx.fill();
        ctx.lineWidth = 1.6 * this.#dpr;
        ctx.strokeStyle = isHovered ? colors.roadHover : colors.nodeBorder;
        ctx.stroke();
      }
    });

    // 2. Circulation des impulsions lumineuses le long des voies (particules vivantes)
    if (this.#isGrown && !this.#isReducedMotion && this.#branches.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      this.#particles.forEach((p) => {
        p.t += dt * p.speed * p.direction;
        if (p.t > 1) {
          p.t = 0;
          p.branchIndex = Math.floor(Math.random() * this.#branches.length);
        } else if (p.t < 0) {
          p.t = 1;
          p.branchIndex = Math.floor(Math.random() * this.#branches.length);
        }

        const branch = this.#branches[p.branchIndex];
        if (!branch) return;

        const pos = this.#getPointOnBezier(branch.p0, branch.cp, branch.p1, p.t);

        // Point lumineux central (véhicule / phare)
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = colors.particle;
        ctx.shadowColor = colors.particleGlow;
        ctx.shadowBlur = 8 * this.#dpr;
        ctx.fill();
      });

      ctx.restore();
    }
  }

  destroy() {
    this.stop();
    if (this.#screenObserver) this.#screenObserver.disconnect();
    if (this.#themeObserver) this.#themeObserver.disconnect();
  }
}
