import { I18nService } from '../services/I18nService.js';

class TailSegment {
  constructor(length, angleMultiplier, restingAngle = 0) {
    this.length = length;
    this.angleMultiplier = angleMultiplier;
    this.restingAngle = restingAngle;
    this.localAngle = 0;
    this.globalAngle = 0;
    this.startPoint = { x: 0, y: 0 };
    this.endPoint = { x: 0, y: 0 };
  }
}

class CatTailAnimator {
  #segments = [];
  #time = 0;
  #phaseOffsetStep;
  #isFacingRight;

  constructor(segmentCount = 5, segmentLength = 9.5, phaseOffsetStep = 0.5, isFacingRight = true) {
    this.#phaseOffsetStep = phaseOffsetStep;
    this.#isFacingRight = isFacingRight;
    this.#buildChain(segmentCount, segmentLength);
  }

  #buildChain(count, length) {
    const flatSegmentCount = Math.floor(count / 4);
    const activeSegments = count - flatSegmentCount;

    for (let i = 0; i < count; i++) {
      let flexibility = 0;
      let restingAngle = 0;

      if (i >= flatSegmentCount) {
        const activeIndex = i - flatSegmentCount;
        const progress = activeIndex / activeSegments;

        flexibility = 1.0 + (progress * 3.5);
        restingAngle = -0.22 - (Math.sin(progress * Math.PI) * 0.12);
      }

      this.#segments.push(new TailSegment(length, flexibility, restingAngle));
    }
  }

  setDirection(faceRight) {
    this.#isFacingRight = faceRight;
  }

  update(deltaTime, baseFrequency, baseAmplitude, rootPosition) {
    this.#time += deltaTime;
    const directionMultiplier = this.#isFacingRight ? 1 : -1;

    for (let i = 0; i < this.#segments.length; i++) {
      const segment = this.#segments[i];

      if (segment.angleMultiplier === 0) {
        segment.localAngle = 0;
      } else {
        const phaseShift = i * this.#phaseOffsetStep;

        const normalizedPrimaryWave = (Math.sin((this.#time * baseFrequency) - phaseShift) + 1.0) * 0.5;
        const normalizedSecondaryWave = (Math.cos((this.#time * baseFrequency * 1.6) + (phaseShift * 1.3)) + 1.0) * 0.5;

        const waveOffset = (normalizedPrimaryWave * baseAmplitude) + (normalizedSecondaryWave * (baseAmplitude * 0.4));

        segment.localAngle = segment.restingAngle - (waveOffset * segment.angleMultiplier);
      }

      if (i === 0) {
        segment.startPoint = { ...rootPosition };
        segment.globalAngle = this.#isFacingRight ? 0 : Math.PI;
      } else {
        const parent = this.#segments[i - 1];
        segment.startPoint = { ...parent.endPoint };
        segment.globalAngle = parent.globalAngle + (segment.localAngle * directionMultiplier);
      }

      segment.endPoint = {
        x: segment.startPoint.x + Math.cos(segment.globalAngle) * segment.length,
        y: segment.startPoint.y + Math.sin(segment.globalAngle) * segment.length
      };
    }
  }

  getSegments() {
    return this.#segments;
  }
}

const MASCOT_COORDINATES = {
  kiko: {
    default:        "20,92 80,92 72,10 28,10",
    username:       "20,92 80,92 86,18 42,22",
    password:       "20,92 80,92 60,22 20,22",
    passwordShown:  "10,92 80,92 34,35 2,35"
  }
};

const MASCOT_EYE_STATES = {
  default:       { offsetX: 0,  offsetY: 0,  px: 0,    py: 0,   rx: 8.5, ry: 8.5, leftW: 1, rightW: 1, leftEar: 1, rightEar: 1 },
  username:      { offsetX: 8,  offsetY: 0,  px: 4,    py: 1,   rx: 8.5, ry: 8.5, leftW: 1, rightW: 0, leftEar: 1, rightEar: 1 },
  password:      { offsetX: -8, offsetY: 0,  px: -4,   py: -1,  rx: 7.5, ry: 7.5, leftW: 0, rightW: 1, leftEar: 1, rightEar: 1 },
  passwordShown: { offsetX: -6, offsetY: 2,  px: 0,    py: 0,   rx: 9.0, ry: 0.9, leftW: 0, rightW: 1, leftEar: 1, rightEar: 1 }
};

export class AuthView {
  #usernameInput;
  #passwordInput;
  #authMainBtn;
  #authSwitchLink;
  #authSwitchText;
  #authTitle;
  #authSubtitle;
  #errorMsg;
  #mascotsContainer;
  #togglePasswordBtn;

  #currentPointsKiko = [20, 92, 80, 92, 72, 10, 28, 10];
  #currentEyeState = { offsetX: 0, offsetY: 0, px: 0, py: 0, rx: 8.5, ry: 8.5, leftW: 1, rightW: 1, leftEar: 1, rightEar: 1 };
  #currentMascotStateKey = 'default';
  #animFrameIdKiko = null;
  #blinkTimeoutId = null;
  #isBlinking = false;

  #targetMouseOffset = { x: 0, y: 0 };
  #currentMouseOffset = { x: 0, y: 0 };
  #isTyping = false;
  #typingTimeoutId = null;
  #whiskerJitter = 0;
  #earTwitchOffset = 0;
  #activeTwitchEar = null;
  #earTwitchTimeoutId = null;
  #continuousAnimFrameId = null;

  #tailPhase = 0;
  #tailSpeed = 0.0025;
  #tailAmplitude = 10;
  #tailSideFactor = 1;
  #lastAnimTime = 0;
  #tailAnimator = new CatTailAnimator(5, 9.5, 0.42);

  constructor() {
    this.#usernameInput = document.getElementById('auth-username');
    this.#passwordInput = document.getElementById('auth-password');
    this.#authMainBtn = document.getElementById('auth-main-btn');
    this.#authSwitchLink = document.getElementById('auth-switch-link');
    this.#authSwitchText = document.getElementById('auth-switch-text');
    this.#authTitle = document.getElementById('auth-title');
    this.#authSubtitle = document.getElementById('auth-subtitle');
    this.#errorMsg = document.getElementById('auth-error');
    this.#mascotsContainer = document.getElementById('auth-mascots-container');
    this.#togglePasswordBtn = document.getElementById('toggle-password-btn');

    this.#renderMascotFrame(this.#currentPointsKiko, this.#currentEyeState);
    this.#setupMascotInteractions();
    this.#setupBlinkLoop();
    this.#setupEarTwitchLoop();
    this.#setupMouseTracking();
    this.#setupContinuousAnimations();
  }

  #getClampedPupilOffset(targetDx, targetDy, rx, ry, pupilRx, pupilRy) {
    const maxX = Math.max(0.1, rx - pupilRx - 0.6);
    const maxY = Math.max(0.1, ry - pupilRy - 0.6);

    const norm = Math.hypot(targetDx / maxX, targetDy / maxY);
    if (norm > 1.0) {
      return {
        x: targetDx / norm,
        y: targetDy / norm
      };
    }
    return { x: targetDx, y: targetDy };
  }

  #setupBlinkLoop() {
    const scheduleNext = () => {
      const delay = Math.random() * 2500 + 2500;
      this.#blinkTimeoutId = setTimeout(() => {
        this.#triggerBlink();
        scheduleNext();
      }, delay);
    };
    scheduleNext();
  }

  #triggerBlink() {
    if (this.#isBlinking || this.#currentMascotStateKey === 'passwordShown') return;

    this.#isBlinking = true;
    const eyeBg = document.getElementById('eye-bg');
    const eyePupil = document.getElementById('eye-pupil');
    const eyeShine = document.getElementById('eye-shine');
    if (!eyeBg) return;

    const baseRy = this.#currentEyeState.ry || 8.5;
    const startTime = performance.now();
    const duration = 140;

    const stepBlink = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const squashFactor = Math.sin(progress * Math.PI);

      const currentRy = baseRy * (1 - squashFactor * 0.9);
      const pupilRy = Math.max(0, (currentRy - 1.8) * 0.42);
      const shineRy = Math.max(0, (currentRy - 3.0) * 0.15);

      const fillFactor = Math.max(0, Math.min(1, (currentRy - 1.0) / 2.5));
      const rVal = Math.round(38 + (255 - 38) * fillFactor);
      const gVal = Math.round(25 + (255 - 25) * fillFactor);
      const bVal = Math.round(15 + (255 - 15) * fillFactor);

      eyeBg.setAttribute('ry', Math.max(0.6, currentRy).toFixed(2));
      eyeBg.setAttribute('fill', `rgb(${rVal},${gVal},${bVal})`);
      if (eyePupil) {
        eyePupil.setAttribute('ry', pupilRy.toFixed(2));
        eyePupil.setAttribute('opacity', pupilRy > 0.05 ? '1' : '0');
      }
      if (eyeShine) {
        eyeShine.setAttribute('ry', shineRy.toFixed(2));
        eyeShine.setAttribute('opacity', shineRy > 0.05 ? '1' : '0');
      }

      if (progress < 1) {
        requestAnimationFrame(stepBlink);
      } else {
        this.#isBlinking = false;
        eyeBg.setAttribute('ry', baseRy.toFixed(2));
        eyeBg.setAttribute('fill', '#ffffff');
        if (eyePupil) {
          eyePupil.setAttribute('ry', Math.max(0, (baseRy - 1.8) * 0.42).toFixed(2));
          eyePupil.setAttribute('opacity', '1');
        }
        if (eyeShine) {
          eyeShine.setAttribute('ry', Math.max(0, (baseRy - 3.0) * 0.15).toFixed(2));
          eyeShine.setAttribute('opacity', '1');
        }
      }
    };

    requestAnimationFrame(stepBlink);
  }

  #setupEarTwitchLoop() {
    const scheduleNext = () => {
      const delay = Math.random() * 3000 + 3500;
      this.#earTwitchTimeoutId = setTimeout(() => {
        this.#triggerEarTwitch();
        scheduleNext();
      }, delay);
    };
    scheduleNext();
  }

  #triggerEarTwitch() {
    if (this.#earTwitchOffset !== 0) return;
    this.#activeTwitchEar = Math.random() > 0.5 ? 'left' : 'right';
    const startTime = performance.now();
    const duration = 200;

    const stepTwitch = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      this.#earTwitchOffset = Math.sin(progress * Math.PI * 2) * 3.5;

      if (progress < 1) {
        requestAnimationFrame(stepTwitch);
      } else {
        this.#earTwitchOffset = 0;
        this.#activeTwitchEar = null;
      }
    };
    requestAnimationFrame(stepTwitch);
  }

  #setupMouseTracking() {
    window.addEventListener('mousemove', (e) => {
      const mascotEl = document.getElementById('mascot-2') || document.getElementById('mascot-body');
      if (!mascotEl) return;
      const rect = mascotEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height * 0.35;

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      const distance = Math.hypot(deltaX, deltaY);
      const angle = Math.atan2(deltaY, deltaX);

      const maxOffset = Math.min(3.8, distance / 70);
      const targetX = Math.cos(angle) * maxOffset;
      const targetY = Math.sin(angle) * maxOffset;

      const stateKey = this.#currentMascotStateKey;
      if (stateKey === 'username' && targetX < -0.3) {
        this.#targetMouseOffset = { x: 0, y: 0 };
      } else if ((stateKey === 'password' || stateKey === 'passwordShown') && targetX > 0.3) {
        this.#targetMouseOffset = { x: 0, y: 0 };
      } else {
        this.#targetMouseOffset = { x: targetX, y: targetY };
      }
    });
  }

  #setupContinuousAnimations() {
    const tailEl = document.getElementById('cat-tail');

    const animateLoop = (now) => {
      if (!this.#lastAnimTime) this.#lastAnimTime = now;
      const dt = Math.min(32, now - this.#lastAnimTime);
      this.#lastAnimTime = now;

      this.#currentMouseOffset.x += (this.#targetMouseOffset.x - this.#currentMouseOffset.x) * 0.22;
      this.#currentMouseOffset.y += (this.#targetMouseOffset.y - this.#currentMouseOffset.y) * 0.22;

      const eyeBg = document.getElementById('eye-bg');
      const eyePupil = document.getElementById('eye-pupil');
      const eyeShine = document.getElementById('eye-shine');

      if (eyeBg && eyePupil && !this.#isBlinking) {
        const eyeX = parseFloat(eyeBg.getAttribute('cx') || '0');
        const eyeY = parseFloat(eyeBg.getAttribute('cy') || '0');
        const currentPx = this.#currentEyeState.px || 0;
        const currentPy = this.#currentEyeState.py || 0;
        const currentRx = this.#currentEyeState.rx || 8.5;
        const currentRy = parseFloat(eyeBg.getAttribute('ry') || '8.5');

        const pupilRx = Math.max(0, currentRx * 0.42);
        const pupilRy = Math.max(0, (currentRy - 1.8) * 0.42);

        const shineRx = Math.max(0, currentRx * 0.15);
        const shineRy = Math.max(0, (currentRy - 3.0) * 0.15);

        const rawDx = currentPx + this.#currentMouseOffset.x;
        const rawDy = currentPy + this.#currentMouseOffset.y;

        const clamped = this.#getClampedPupilOffset(rawDx, rawDy, currentRx, currentRy, pupilRx, pupilRy);

        eyePupil.setAttribute('cx', (eyeX + clamped.x).toFixed(2));
        eyePupil.setAttribute('cy', (eyeY + clamped.y).toFixed(2));
        eyePupil.setAttribute('rx', pupilRx.toFixed(2));
        eyePupil.setAttribute('ry', pupilRy.toFixed(2));
        eyePupil.setAttribute('opacity', pupilRy > 0.05 ? '1' : '0');

        if (eyeShine) {
          eyeShine.setAttribute('cx', (eyeX + clamped.x - currentRx * 0.22).toFixed(2));
          eyeShine.setAttribute('cy', (eyeY + clamped.y - currentRy * 0.22).toFixed(2));
          eyeShine.setAttribute('rx', shineRx.toFixed(2));
          eyeShine.setAttribute('ry', shineRy.toFixed(2));
          eyeShine.setAttribute('opacity', shineRy > 0.05 ? '1' : '0');
        }
      }

      if (tailEl) {
        let targetSide = 1;
        if (this.#currentMascotStateKey === 'username') {
          targetSide = -1;
        } else if (this.#currentMascotStateKey === 'password' || this.#currentMascotStateKey === 'passwordShown') {
          targetSide = 1;
        }

        this.#tailSideFactor += (targetSide - this.#tailSideFactor) * 0.05;
        const side = this.#tailSideFactor;
        const isRight = side > 0;

        this.#tailAnimator.setDirection(isRight);

        const baseFreq = this.#isTyping ? 0.0042 : 0.0020;
        const baseAmp = this.#isTyping ? 0.38 : 0.24;

        const rootPosition = { x: 50 + side * 24, y: 82 };
        this.#tailAnimator.update(dt, baseFreq, baseAmp, rootPosition);
        const segments = this.#tailAnimator.getSegments();

        const baseX = segments[0].startPoint.x.toFixed(2);
        const baseY = segments[0].startPoint.y.toFixed(2);
        const cp1X = segments[0].endPoint.x.toFixed(2);
        const cp1Y = segments[0].endPoint.y.toFixed(2);
        const cp2X = segments[2].endPoint.x.toFixed(2);
        const cp2Y = segments[2].endPoint.y.toFixed(2);
        const tipX = segments[segments.length - 1].endPoint.x.toFixed(2);
        const tipY = segments[segments.length - 1].endPoint.y.toFixed(2);

        tailEl.setAttribute('d', `M ${baseX} ${baseY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${tipX} ${tipY}`);
      }

      if (this.#isTyping) {
        this.#whiskerJitter = Math.sin(now * 0.012) * 0.55;
      } else {
        this.#whiskerJitter *= 0.85;
      }

      this.#continuousAnimFrameId = requestAnimationFrame(animateLoop);
    };

    this.#continuousAnimFrameId = requestAnimationFrame(animateLoop);
  }

  #handleTypingActivity() {
    this.#isTyping = true;
    if (this.#typingTimeoutId) clearTimeout(this.#typingTimeoutId);
    this.#typingTimeoutId = setTimeout(() => {
      this.#isTyping = false;
    }, 350);
  }

  #triggerHappyJump() {
    const mascotContainer = document.getElementById('mascot-2');
    if (!mascotContainer) return;

    mascotContainer.animate([
      { transform: 'translateY(0) scale(1, 1)' },
      { transform: 'translateY(-28px) scale(0.9, 1.1)', offset: 0.4 },
      { transform: 'translateY(4px) scale(1.15, 0.85)', offset: 0.8 },
      { transform: 'translateY(0) scale(1, 1)' }
    ], {
      duration: 500,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
    });

    this.#triggerBlink();
  }

  #renderMascotFrame(interpolated, pupilState = null) {
    const polygonEl = document.getElementById('mascot-body') || document.querySelector('#mascot-2 polygon');
    if (!polygonEl || !interpolated || interpolated.length !== 8) return;

    this.#currentPointsKiko = interpolated;

    const pointsAttr = `${interpolated[0].toFixed(2)},${interpolated[1].toFixed(2)} ${interpolated[2].toFixed(2)},${interpolated[3].toFixed(2)} ${interpolated[4].toFixed(2)},${interpolated[5].toFixed(2)} ${interpolated[6].toFixed(2)},${interpolated[7].toFixed(2)}`;
    polygonEl.setAttribute('points', pointsAttr);

    const topCenterX = (interpolated[4] + interpolated[6]) / 2;
    const topCenterY = (interpolated[5] + interpolated[7]) / 2;
    const bottomCenterX = (interpolated[0] + interpolated[2]) / 2;
    const bottomCenterY = (interpolated[1] + interpolated[3]) / 2;

    const currentPupil = pupilState || this.#currentEyeState;
    const currentOffsetX = currentPupil.offsetX || 0;
    const currentOffsetY = currentPupil.offsetY || 0;

    const eyeX = topCenterX + (bottomCenterX - topCenterX) * 0.32 + currentOffsetX;
    const eyeY = topCenterY + (bottomCenterY - topCenterY) * 0.32 + currentOffsetY;

    const currentRx = currentPupil.rx || 8.5;
    const currentRy = currentPupil.ry || 8.5;
    const currentPx = currentPupil.px || 0;
    const currentPy = currentPupil.py || 0;

    const eyeBg = document.getElementById('eye-bg');
    const eyePupil = document.getElementById('eye-pupil');
    const eyeShine = document.getElementById('eye-shine');
    const earLeft = document.getElementById('cat-ear-left');
    const earLeftInner = document.getElementById('cat-ear-left-inner');
    const earRight = document.getElementById('cat-ear-right');
    const earRightInner = document.getElementById('cat-ear-right-inner');
    const catNose = document.getElementById('cat-nose');
    const whiskersLeftGroup = document.getElementById('whiskers-left');
    const whiskersRightGroup = document.getElementById('whiskers-right');
    const wl1 = document.getElementById('wl1');
    const wl2 = document.getElementById('wl2');
    const wl3 = document.getElementById('wl3');
    const wr1 = document.getElementById('wr1');
    const wr2 = document.getElementById('wr2');
    const wr3 = document.getElementById('wr3');

    const pupilRx = Math.max(0, currentRx * 0.42);
    const pupilRy = Math.max(0, (currentRy - 1.8) * 0.42);
    const shineRx = Math.max(0, currentRx * 0.15);
    const shineRy = Math.max(0, (currentRy - 3.0) * 0.15);

    const fillFactor = Math.max(0, Math.min(1, (currentRy - 1.0) / 2.5));
    const rVal = Math.round(38 + (255 - 38) * fillFactor);
    const gVal = Math.round(25 + (255 - 25) * fillFactor);
    const bVal = Math.round(15 + (255 - 15) * fillFactor);
    const fillColor = `rgb(${rVal},${gVal},${bVal})`;

    if (eyeBg) {
      eyeBg.setAttribute('cx', eyeX.toFixed(2));
      eyeBg.setAttribute('cy', eyeY.toFixed(2));
      eyeBg.setAttribute('rx', currentRx.toFixed(2));
      eyeBg.setAttribute('ry', Math.max(0.6, currentRy).toFixed(2));
      eyeBg.setAttribute('fill', fillColor);
    }

    const mouseOffsetX = this.#currentMouseOffset.x;
    const mouseOffsetY = this.#currentMouseOffset.y;
    const rawDx = currentPx + mouseOffsetX;
    const rawDy = currentPy + mouseOffsetY;
    const clamped = this.#getClampedPupilOffset(rawDx, rawDy, currentRx, currentRy, pupilRx, pupilRy);

    if (eyePupil) {
      eyePupil.setAttribute('cx', (eyeX + clamped.x).toFixed(2));
      eyePupil.setAttribute('cy', (eyeY + clamped.y).toFixed(2));
      eyePupil.setAttribute('rx', pupilRx.toFixed(2));
      eyePupil.setAttribute('ry', pupilRy.toFixed(2));
      eyePupil.setAttribute('opacity', pupilRy > 0.05 ? '1' : '0');
    }

    if (eyeShine) {
      eyeShine.setAttribute('cx', (eyeX + clamped.x - currentRx * 0.22).toFixed(2));
      eyeShine.setAttribute('cy', (eyeY + clamped.y - currentRy * 0.22).toFixed(2));
      eyeShine.setAttribute('rx', shineRx.toFixed(2));
      eyeShine.setAttribute('ry', shineRy.toFixed(2));
      eyeShine.setAttribute('opacity', shineRy > 0.05 ? '1' : '0');
    }

    const x3 = interpolated[4], y3 = interpolated[5];
    const x4 = interpolated[6], y4 = interpolated[7];
    const dx = x3 - x4, dy = y3 - y4;
    const topLen = Math.hypot(dx, dy) || 1;
    const nx = dy / topLen;
    const ny = -dx / topLen;

    if (earLeft) {
      earLeft.style.display = 'inline';
      earLeft.setAttribute('opacity', '1');
      const b1x = x4, b1y = y4;
      const b2x = x4 + 0.38 * dx, b2y = y4 + 0.38 * dy;
      const twitchLeft = this.#activeTwitchEar === 'left' ? this.#earTwitchOffset : 0;
      const tipX = x4 + 0.12 * dx + nx * (15 + twitchLeft);
      const tipY = y4 + 0.12 * dy + ny * (15 + twitchLeft);
      earLeft.setAttribute('points', `${b1x.toFixed(2)},${b1y.toFixed(2)} ${tipX.toFixed(2)},${tipY.toFixed(2)} ${b2x.toFixed(2)},${b2y.toFixed(2)}`);

      if (earLeftInner) {
        earLeftInner.style.display = 'inline';
        const ib1x = x4 + 0.08 * dx + nx * 1.5;
        const ib1y = y4 + 0.08 * dy + ny * 1.5;
        const ib2x = x4 + 0.30 * dx + nx * 1.5;
        const ib2y = y4 + 0.30 * dy + ny * 1.5;
        const itipX = x4 + 0.13 * dx + nx * (11.5 + twitchLeft);
        const itipY = y4 + 0.13 * dy + ny * (11.5 + twitchLeft);
        earLeftInner.setAttribute('points', `${ib1x.toFixed(2)},${ib1y.toFixed(2)} ${itipX.toFixed(2)},${itipY.toFixed(2)} ${ib2x.toFixed(2)},${ib2y.toFixed(2)}`);
      }
    }

    if (earRight) {
      earRight.style.display = 'inline';
      earRight.setAttribute('opacity', '1');
      const b1x = x4 + 0.62 * dx, b1y = y4 + 0.62 * dy;
      const b2x = x3, b2y = y3;
      const twitchRight = this.#activeTwitchEar === 'right' ? this.#earTwitchOffset : 0;
      const tipX = x4 + 0.88 * dx + nx * (15 + twitchRight);
      const tipY = y4 + 0.88 * dy + ny * (15 + twitchRight);
      earRight.setAttribute('points', `${b1x.toFixed(2)},${b1y.toFixed(2)} ${tipX.toFixed(2)},${tipY.toFixed(2)} ${b2x.toFixed(2)},${b2y.toFixed(2)}`);

      if (earRightInner) {
        earRightInner.style.display = 'inline';
        const ib1x = x4 + 0.70 * dx + nx * 1.5;
        const ib1y = y4 + 0.70 * dy + ny * 1.5;
        const ib2x = x4 + 0.92 * dx + nx * 1.5;
        const ib2y = y4 + 0.92 * dy + ny * 1.5;
        const itipX = x4 + 0.87 * dx + nx * (11.5 + twitchRight);
        const itipY = y4 + 0.87 * dy + ny * (11.5 + twitchRight);
        earRightInner.setAttribute('points', `${ib1x.toFixed(2)},${ib1y.toFixed(2)} ${itipX.toFixed(2)},${itipY.toFixed(2)} ${ib2x.toFixed(2)},${ib2y.toFixed(2)}`);
      }
    }

    const noseX = eyeX + 0.5;
    const noseY = eyeY + Math.max(currentRy, 5) + 3;
    if (catNose) {
      catNose.setAttribute('points', `${noseX.toFixed(2)},${(noseY + 3).toFixed(2)} ${(noseX - 2.5).toFixed(2)},${noseY.toFixed(2)} ${(noseX + 2.5).toFixed(2)},${noseY.toFixed(2)}`);
    }

    const leftW = currentPupil.leftW !== undefined ? currentPupil.leftW : 1;
    const rightW = currentPupil.rightW !== undefined ? currentPupil.rightW : 1;

    if (whiskersLeftGroup) {
      whiskersLeftGroup.style.display = leftW > 0.5 ? 'inline' : 'none';
      whiskersLeftGroup.setAttribute('opacity', leftW > 0.5 ? '1' : '0');
    }
    if (whiskersRightGroup) {
      whiskersRightGroup.style.display = rightW > 0.5 ? 'inline' : 'none';
      whiskersRightGroup.setAttribute('opacity', rightW > 0.5 ? '1' : '0');
    }

    const jitter = this.#whiskerJitter;
    const leftWhiskerStartX = eyeX - Math.max(currentRx, 6) - 2;
    if (wl1) {
      wl1.setAttribute('x1', leftWhiskerStartX.toFixed(2));
      wl1.setAttribute('y1', (eyeY - 2 + jitter).toFixed(2));
      wl1.setAttribute('x2', (leftWhiskerStartX - 13).toFixed(2));
      wl1.setAttribute('y2', (eyeY - 6 + jitter).toFixed(2));
    }
    if (wl2) {
      wl2.setAttribute('x1', (leftWhiskerStartX - 1).toFixed(2));
      wl2.setAttribute('y1', (eyeY + 3 - jitter).toFixed(2));
      wl2.setAttribute('x2', (leftWhiskerStartX - 15).toFixed(2));
      wl2.setAttribute('y2', (eyeY + 3 - jitter).toFixed(2));
    }
    if (wl3) {
      wl3.setAttribute('x1', leftWhiskerStartX.toFixed(2));
      wl3.setAttribute('y1', (eyeY + 8 + jitter).toFixed(2));
      wl3.setAttribute('x2', (leftWhiskerStartX - 12).toFixed(2));
      wl3.setAttribute('y2', (eyeY + 11 + jitter).toFixed(2));
    }

    const rightWhiskerStartX = eyeX + Math.max(currentRx, 6) + 2;
    if (wr1) {
      wr1.setAttribute('x1', rightWhiskerStartX.toFixed(2));
      wr1.setAttribute('y1', (eyeY - 2 - jitter).toFixed(2));
      wr1.setAttribute('x2', (rightWhiskerStartX + 13).toFixed(2));
      wr1.setAttribute('y2', (eyeY - 6 - jitter).toFixed(2));
    }
    if (wr2) {
      wr2.setAttribute('x1', (rightWhiskerStartX + 1).toFixed(2));
      wr2.setAttribute('y1', (eyeY + 3 + jitter).toFixed(2));
      wr2.setAttribute('x2', (rightWhiskerStartX + 15).toFixed(2));
      wr2.setAttribute('y2', (eyeY + 3 + jitter).toFixed(2));
    }
    if (wr3) {
      wr3.setAttribute('x1', rightWhiskerStartX.toFixed(2));
      wr3.setAttribute('y1', (eyeY + 8 - jitter).toFixed(2));
      wr3.setAttribute('x2', (rightWhiskerStartX + 12).toFixed(2));
      wr3.setAttribute('y2', (eyeY + 11 - jitter).toFixed(2));
    }
  }

  #triggerHeadShakeNo() {
    const baseStateKey = this.#currentMascotStateKey;
    const baseCoordsStr = MASCOT_COORDINATES.kiko[baseStateKey] || MASCOT_COORDINATES.kiko.default;
    const baseArr = baseCoordsStr.replace(/,/g, ' ').split(/\s+/).filter(Boolean).map(Number);
    if (baseArr.length !== 8) return;

    const basePupil = MASCOT_EYE_STATES[baseStateKey] || MASCOT_EYE_STATES.default;

    const startTime = performance.now();
    const duration = 550;

    if (this.#animFrameIdKiko) {
      cancelAnimationFrame(this.#animFrameIdKiko);
    }

    const stepShake = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      const decay = Math.pow(1 - progress, 1.5);
      const shakeOffset = Math.sin(progress * Math.PI * 7) * 12 * decay;

      const currentPoints = [...baseArr];
      currentPoints[4] += shakeOffset;
      currentPoints[6] += shakeOffset;

      let dynamicLeftW = 1;
      let dynamicRightW = 1;
      if (shakeOffset > 2.0) {
        dynamicLeftW = 1;
        dynamicRightW = 0;
      } else if (shakeOffset < -2.0) {
        dynamicLeftW = 0;
        dynamicRightW = 1;
      }

      const currentPupil = {
        ...basePupil,
        offsetX: (basePupil.offsetX || 0) + shakeOffset * 0.70,
        leftW: dynamicLeftW,
        rightW: dynamicRightW
      };

      this.#renderMascotFrame(currentPoints, currentPupil);

      if (progress < 1) {
        this.#animFrameIdKiko = requestAnimationFrame(stepShake);
      }
    };

    this.#animFrameIdKiko = requestAnimationFrame(stepShake);
  }

  #triggerErrorShake() {
    const formCard = document.querySelector('.auth-form-container');

    if (formCard) {
      formCard.animate([
        { transform: 'translateX(0)' },
        { transform: 'translateX(-8px)', offset: 0.2 },
        { transform: 'translateX(8px)', offset: 0.4 },
        { transform: 'translateX(-5px)', offset: 0.6 },
        { transform: 'translateX(5px)', offset: 0.8 },
        { transform: 'translateX(0)' }
      ], {
        duration: 400,
        easing: 'cubic-bezier(0.36, 0.07, 0.19, 0.97)'
      });
    }

    this.#triggerHeadShakeNo();
    this.#whiskerJitter = 4.5;
    this.#triggerBlink();

    [this.#usernameInput, this.#passwordInput].forEach((input) => {
      if (input && !input.value.trim()) {
        input.classList.add('input-error-shake');
        setTimeout(() => input.classList.remove('input-error-shake'), 800);
      }
    });
  }

  #animateMascotToPoints(polygonEl, targetPointsStr, targetStateKey = 'default', duration = 400) {
    if (!polygonEl || !targetPointsStr) return;

    const targetArr = targetPointsStr.replace(/,/g, ' ').split(/\s+/).filter(Boolean).map(Number);
    if (targetArr.length !== 8) return;

    const startArr = [...this.#currentPointsKiko];
    const startPupil = { ...this.#currentEyeState };
    const targetPupil = MASCOT_EYE_STATES[targetStateKey] || MASCOT_EYE_STATES.default;

    const startTime = performance.now();

    if (this.#animFrameIdKiko) {
      cancelAnimationFrame(this.#animFrameIdKiko);
    }

    const easeOutBack = (t) => {
      const c1 = 1.2;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutBack(progress);

      const interpolated = startArr.map((startVal, i) => {
        return startVal + (targetArr[i] - startVal) * eased;
      });

      const currentPupil = {
        offsetX: startPupil.offsetX + (targetPupil.offsetX - startPupil.offsetX) * eased,
        offsetY: startPupil.offsetY + (targetPupil.offsetY - startPupil.offsetY) * eased,
        rx: startPupil.rx + (targetPupil.rx - startPupil.rx) * eased,
        ry: startPupil.ry + (targetPupil.ry - startPupil.ry) * eased,
        px: startPupil.px + (targetPupil.px - startPupil.px) * eased,
        py: startPupil.py + (targetPupil.py - startPupil.py) * eased
      };

      this.#currentEyeState = currentPupil;
      this.#renderMascotFrame(interpolated, currentPupil);

      if (progress < 1) {
        this.#animFrameIdKiko = requestAnimationFrame(step);
      }
    };

    this.#animFrameIdKiko = requestAnimationFrame(step);
  }

  #setupMascotInteractions() {
    if (!this.#mascotsContainer) return;

    const setMascotState = (stateKey) => {
      const state = stateKey || 'default';
      if (this.#currentMascotStateKey === state) return;
      this.#currentMascotStateKey = state;
      this.#mascotsContainer.className = 'auth-mascots-container state-' + state;

      const polygonKiko = document.getElementById('mascot-body') || document.querySelector('#mascot-2 polygon');

      if (polygonKiko && MASCOT_COORDINATES.kiko[state]) {
        this.#animateMascotToPoints(polygonKiko, MASCOT_COORDINATES.kiko[state], state, 400);
      }
    };

    const updateStateFromActiveElement = () => {
      const active = document.activeElement;
      if (active === this.#usernameInput) {
        setMascotState('username');
      } else if (active === this.#passwordInput) {
        if (this.#passwordInput.type === 'text') {
          setMascotState('passwordShown');
        } else {
          setMascotState('password');
        }
      } else {
        setMascotState('default');
      }
    };

    if (this.#usernameInput) {
      this.#usernameInput.addEventListener('focus', updateStateFromActiveElement);
      this.#usernameInput.addEventListener('input', () => {
        this.#handleTypingActivity();
        updateStateFromActiveElement();
      });
      this.#usernameInput.addEventListener('blur', () => {
        requestAnimationFrame(updateStateFromActiveElement);
      });
    }

    if (this.#passwordInput) {
      this.#passwordInput.addEventListener('focus', updateStateFromActiveElement);
      this.#passwordInput.addEventListener('input', () => {
        this.#handleTypingActivity();
        updateStateFromActiveElement();
      });
      this.#passwordInput.addEventListener('blur', () => {
        requestAnimationFrame(updateStateFromActiveElement);
      });
    }

    if (this.#togglePasswordBtn && this.#passwordInput) {
      this.#togglePasswordBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
      });

      this.#togglePasswordBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const isPassword = this.#passwordInput.type === 'password';
        this.#passwordInput.type = isPassword ? 'text' : 'password';
        
        updateStateFromActiveElement();
        this.#passwordInput.focus();
      });
    }

    setMascotState('default');
  }

  async initGoogleSignIn(callback) {
    try {
      const response = await fetch('/api/config');
      const config = await response.json();
      const btnContainer = document.getElementById('google-login-btn');

      if (!config || !config.googleClientId) {
        if (btnContainer) {
          btnContainer.replaceChildren();
          const infoSpan = document.createElement('span');
          infoSpan.className = 'text-muted text-small';
          infoSpan.textContent = '(Google Auth non configuré)';
          btnContainer.appendChild(infoSpan);
        }
        return;
      }

      const renderButton = () => {
        const targetBtn = document.getElementById('google-login-btn');
        if (!targetBtn) return false;

        if (window.google?.accounts?.id) {
          window.google.accounts.id.initialize({
            client_id: config.googleClientId,
            callback: (res) => {
              callback(res.credential);
            }
          });
          targetBtn.replaceChildren();
          window.google.accounts.id.renderButton(
            targetBtn,
            { theme: 'outline', size: 'large', width: 250 }
          );
          return true;
        }
        return false;
      };

      if (!renderButton()) {
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if (renderButton() || attempts >= 50) {
            clearInterval(interval);
            if (attempts >= 50 && !window.google) {
              const targetBtn = document.getElementById('google-login-btn');
              if (targetBtn && !targetBtn.children.length) {
                targetBtn.replaceChildren();
                const infoSpan = document.createElement('span');
                infoSpan.className = 'text-muted text-small';
                infoSpan.textContent = '(Google Auth indisponible)';
                targetBtn.appendChild(infoSpan);
              }
            }
          }
        }, 100);
      }
    } catch (error) {
      console.warn('Failed to load Google Auth config', error);
    }
  }

  onSubmit(callback) {
    const form = document.getElementById('auth-form');
    const handler = (e) => {
      if (e) e.preventDefault();
      const username = this.#usernameInput ? this.#usernameInput.value.trim() : '';
      const password = this.#passwordInput ? this.#passwordInput.value.trim() : '';

      if (!username || !password) {
        const i18n = I18nService.getInstance();
        this.showError(i18n.t('auth.fill_all_fields') || 'Veuillez remplir tous les champs');
        return;
      }

      this.#triggerHappyJump();
      callback(username, password);
    };

    if (form) {
      form.addEventListener('submit', handler);
    }
    if (this.#authMainBtn) {
      this.#authMainBtn.addEventListener('click', handler);
    }
  }

  onSwitchMode(callback) {
    if (this.#authSwitchLink) {
      this.#authSwitchLink.addEventListener('click', (e) => {
        e.preventDefault();
        callback();
      });
    }
  }

  setMode(isLogin) {
    if (this.#errorMsg) {
      this.#errorMsg.classList.add('hidden');
    }

    const i18n = I18nService.getInstance();

    if (isLogin) {
      if (this.#authTitle) this.#authTitle.textContent = i18n.t('auth.login_title');
      if (this.#authSubtitle) this.#authSubtitle.textContent = i18n.t('auth.login_subtitle');
      if (this.#authMainBtn) this.#authMainBtn.textContent = i18n.t('auth.login_btn');
      if (this.#authSwitchText) this.#authSwitchText.textContent = i18n.t('auth.no_account');
      if (this.#authSwitchLink) this.#authSwitchLink.textContent = i18n.t('auth.register_link');
      if (this.#passwordInput) this.#passwordInput.setAttribute('autocomplete', 'current-password');
    } else {
      if (this.#authTitle) this.#authTitle.textContent = i18n.t('auth.register_title');
      if (this.#authSubtitle) this.#authSubtitle.textContent = i18n.t('auth.register_subtitle');
      if (this.#authMainBtn) this.#authMainBtn.textContent = i18n.t('auth.register_btn');
      if (this.#authSwitchText) this.#authSwitchText.textContent = i18n.t('auth.has_account');
      if (this.#authSwitchLink) this.#authSwitchLink.textContent = i18n.t('auth.login_link');
      if (this.#passwordInput) this.#passwordInput.setAttribute('autocomplete', 'new-password');
    }
  }

  showError(message, isInfo = false) {
    if (!this.#errorMsg) return;

    this.#errorMsg.textContent = message;
    if (isInfo) {
      this.#errorMsg.classList.add('info-msg');
      this.#errorMsg.classList.remove('error-msg-default');
    } else {
      this.#errorMsg.classList.remove('info-msg');
      this.#errorMsg.classList.add('error-msg-default');
      this.#triggerErrorShake();
    }
    this.#errorMsg.classList.remove('hidden');
  }

  clearInputs() {
    if (this.#usernameInput) this.#usernameInput.value = '';
    if (this.#passwordInput) this.#passwordInput.value = '';
  }
}
