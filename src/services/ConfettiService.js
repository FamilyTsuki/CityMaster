export class ConfettiService {
  /**
   * Calcule la configuration des confettis selon le score et le mode de jeu.
   * Si le score est nul ou inférieur au seuil minimal, le nombre de particules est 0 (aucun confetti).
   * Plus le score est élevé, plus la fête est grandiose (nombre de confettis, vélocité, durée et étincelles).
   */
  static getConfettiConfig(score = 0, mode = 'target') {
    const numericScore = Math.max(0, Number(score) || 0);
    const minThreshold = mode === 'sprint' ? 300 : 500;

    if (numericScore < minThreshold) {
      return {
        count: 0,
        duration: 0,
        tier: 'none',
        colors: [],
        speedMultiplier: 0,
        hasSparks: false
      };
    }

    if (mode === 'sprint') {
      if (numericScore >= 4000) {
        return {
          count: Math.min(320, Math.round(250 + ((numericScore - 4000) / 1000) * 60)),
          duration: 8000,
          tier: 'legendary',
          colors: ['#f59e0b', '#fbbf24', '#fde047', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#ffffff', '#a855f7'],
          speedMultiplier: 1.3,
          hasSparks: true
        };
      }
      if (numericScore >= 2500) {
        return {
          count: Math.round(150 + ((numericScore - 2500) / 1500) * 80),
          duration: 6500,
          tier: 'gold',
          colors: ['#f59e0b', '#fbbf24', '#fde047', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4'],
          speedMultiplier: 1.15,
          hasSparks: false
        };
      }
      if (numericScore >= 1200) {
        return {
          count: Math.round(75 + ((numericScore - 1200) / 1300) * 55),
          duration: 5000,
          tier: 'silver',
          colors: ['#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6', '#fde047'],
          speedMultiplier: 1.0,
          hasSparks: false
        };
      }
      return {
        count: Math.round(30 + ((numericScore - minThreshold) / (1200 - minThreshold)) * 35),
        duration: 3500,
        tier: 'bronze',
        colors: ['#d97706', '#f59e0b', '#3b82f6', '#10b981', '#94a3b8'],
        speedMultiplier: 0.85,
        hasSparks: false
      };
    }

    if (numericScore >= 4500) {
      return {
        count: Math.min(320, Math.round(250 + ((numericScore - 4500) / 1000) * 60)),
        duration: 8000,
        tier: 'legendary',
        colors: ['#f59e0b', '#fbbf24', '#fde047', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#ffffff', '#a855f7'],
        speedMultiplier: 1.3,
        hasSparks: true
      };
    }
    if (numericScore >= 3000) {
      return {
        count: Math.round(150 + ((numericScore - 3000) / 1500) * 80),
        duration: 6500,
        tier: 'gold',
        colors: ['#f59e0b', '#fbbf24', '#fde047', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4'],
        speedMultiplier: 1.15,
        hasSparks: false
      };
    }
    if (numericScore >= 1500) {
      return {
        count: Math.round(75 + ((numericScore - 1500) / 1500) * 55),
        duration: 5000,
        tier: 'silver',
        colors: ['#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6', '#fde047'],
        speedMultiplier: 1.0,
        hasSparks: false
      };
    }
    return {
      count: Math.round(30 + ((numericScore - minThreshold) / (1500 - minThreshold)) * 35),
      duration: 3500,
      tier: 'bronze',
      colors: ['#d97706', '#f59e0b', '#3b82f6', '#10b981', '#94a3b8'],
      speedMultiplier: 0.85,
      hasSparks: false
    };
  }

  /**
   * Lance l'animation de confettis proportionnée au score.
   * @param {number|Object} [scoreOrOptions] - Score numérique ou options ({ score, mode })
   * @param {Object} [maybeOptions] - Options additionnelles ({ mode })
   */
  static launch(scoreOrOptions = null, maybeOptions = {}) {
    let score = null;
    let options = {};

    if (scoreOrOptions !== null && typeof scoreOrOptions === 'object') {
      score = scoreOrOptions.score ?? null;
      options = scoreOrOptions;
    } else {
      score = scoreOrOptions;
      options = maybeOptions || {};
    }

    if (score === null || score === undefined) {
      const el = typeof document !== 'undefined' ? document.getElementById('cert-score') : null;
      if (el && el.textContent && el.textContent.trim() !== '') {
        const parsed = parseInt(el.textContent, 10);
        if (!Number.isNaN(parsed)) {
          score = parsed;
        }
      }
    }

    if (score === null || score === undefined) {
      score = 2500;
    }

    const mode = options.mode || 'target';
    const config = this.getConfettiConfig(score, mode);

    if (config.count <= 0) {
      if (typeof document !== 'undefined') {
        const canvas = document.getElementById('confetti-canvas');
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      return { ...config, launched: false };
    }

    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return { ...config, launched: true };
    }

    let canvas = document.getElementById('confetti-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'confetti-canvas';
      canvas.className = 'confetti-canvas';
      document.body.appendChild(canvas);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { ...config, launched: false };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const colors = config.colors;
    const particles = [];
    const count = config.count;

    for (let i = 0; i < count; i++) {
      const isSpark = config.hasSparks && Math.random() < 0.25;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * -height * 0.7 - 10,
        size: isSpark ? Math.random() * 4 + 2 : Math.random() * 8 + 6,
        color: isSpark ? '#ffffff' : colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 4 * config.speedMultiplier,
        vy: (Math.random() * 2.5 + 2) * config.speedMultiplier,
        gravity: (0.06 + Math.random() * 0.04) * (isSpark ? 1.2 : 1),
        swayOffset: Math.random() * Math.PI * 2,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8 * config.speedMultiplier,
        opacity: 1,
        isSpark
      });
    }

    let animationFrame;
    const startTime = performance.now();
    const duration = config.duration;
    const fadeStartTime = duration * 0.65;

    function render(currentTime) {
      const elapsed = currentTime - startTime;
      ctx.clearRect(0, 0, width, height);

      let activeParticles = 0;

      particles.forEach(p => {
        if (p.y <= height + p.size + 20 && p.opacity > 0) {
          activeParticles++;
          p.vy += p.gravity;
          p.x += p.vx + Math.sin(elapsed * 0.003 + p.swayOffset) * 0.7;
          p.y += p.vy;
          p.rotation += p.rotationSpeed;

          if (elapsed > fadeStartTime) {
            p.opacity = Math.max(0, p.opacity - (1 / ((duration - fadeStartTime) / 16)));
          }

          ctx.save();
          ctx.globalAlpha = p.opacity;
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;

          if (p.isSpark) {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
          }
          ctx.restore();
        }
      });

      if (activeParticles > 0 && elapsed < duration) {
        animationFrame = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
        cancelAnimationFrame(animationFrame);
      }
    }

    requestAnimationFrame(render);
    return { ...config, launched: true };
  }
}
