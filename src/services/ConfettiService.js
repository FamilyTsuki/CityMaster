export class ConfettiService {
  static launch() {
    let canvas = document.getElementById('confetti-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'confetti-canvas';
      canvas.className = 'confetti-canvas';
      document.body.appendChild(canvas);
    }

    const ctx = canvas.getContext('2d');
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const colors = ['#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6', '#fde047'];
    const particles = [];
    const count = 120;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * -height * 0.6 - 10,
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 2.5 + 2,
        gravity: 0.06 + Math.random() * 0.04,
        swayOffset: Math.random() * Math.PI * 2,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        opacity: 1
      });
    }

    let animationFrame;
    const startTime = performance.now();

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

          if (elapsed > 4500) {
            p.opacity = Math.max(0, p.opacity - 0.015);
          }

          ctx.save();
          ctx.globalAlpha = p.opacity;
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
          ctx.restore();
        }
      });

      if (activeParticles > 0 && elapsed < 8000) {
        animationFrame = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
        cancelAnimationFrame(animationFrame);
      }
    }

    requestAnimationFrame(render);
  }
}
