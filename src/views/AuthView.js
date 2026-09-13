import { I18nService } from '../services/I18nService.js';
import { FlashMessageService } from '../services/FlashMessageService.js';

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
  #phase = 0;
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
    const cappedDt = Math.min(24, Math.max(0, deltaTime));
    this.#phase += cappedDt * baseFrequency;
    const directionMultiplier = this.#isFacingRight ? 1 : -1;

    for (let i = 0; i < this.#segments.length; i++) {
      const segment = this.#segments[i];

      if (segment.angleMultiplier === 0) {
        segment.localAngle = 0;
      } else {
        const phaseShift = i * this.#phaseOffsetStep;

        const normalizedPrimaryWave = (Math.sin(this.#phase - phaseShift) + 1.0) * 0.5;
        const normalizedSecondaryWave = (Math.cos((this.#phase * 1.6) + (phaseShift * 1.3)) + 1.0) * 0.5;

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
    desktop: {
      default:        "20,92 80,92 72,10 28,10",
      username:       "20,92 80,92 86,18 42,22",
      password:       "20,92 80,92 60,22 20,22",
      passwordShown:  "10,92 80,92 34,35 2,35"
    },
    mobile: {
      default:        "20,92 80,92 72,14 28,14",
      username:       "20,92 80,92 70,22 30,22",
      password:       "20,92 80,92 72,8 28,8",
      passwordShown:  "20,92 80,92 62,3 20,3"
    }
  }
};

const MASCOT_EYE_STATES = {
  desktop: {
    default:       { offsetX: 0,   offsetY: 0,  px: 0,    py: 0,   rx: 8.5, ry: 8.5, leftW: 1, rightW: 1, leftEar: 1, rightEar: 1 },
    username:      { offsetX: 8,   offsetY: 0,  px: 4,    py: 1,   rx: 8.5, ry: 8.5, leftW: 1, rightW: 0, leftEar: 1, rightEar: 1 },
    password:      { offsetX: -14, offsetY: 0,  px: -6,   py: 0,   rx: 7.5, ry: 7.5, leftW: 0, rightW: 1, leftEar: 1, rightEar: 1 },
    passwordShown: { offsetX: -12, offsetY: 2,  px: -5,   py: 1,   rx: 9.0, ry: 0.9, leftW: 0, rightW: 1, leftEar: 1, rightEar: 1 }
  },
  mobile: {
    default:       { offsetX: 0,  offsetY: 0,   px: 0,    py: 0,   rx: 8.5, ry: 8.5, leftW: 1, rightW: 1, leftEar: 1, rightEar: 1 },
    username:      { offsetX: 0,  offsetY: 5,   px: 0,    py: 3,   rx: 8.5, ry: 8.5, leftW: 1, rightW: 1, leftEar: 1, rightEar: 1 },
    password:      { offsetX: 0,  offsetY: -12, px: 0,    py: -5,  rx: 8.5, ry: 8.5, leftW: 1, rightW: 1, leftEar: 1, rightEar: 1 },
    passwordShown: { offsetX: 0,  offsetY: -15, px: 0,    py: -4,  rx: 9.0, ry: 0.9, leftW: 1, rightW: 1, leftEar: 1, rightEar: 1 }
  }
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
  #currentPointsGrey = [6, 92, 94, 92, 84, 10, 16, 10];
  #currentEyeState = { offsetX: 0, offsetY: 0, px: 0, py: 0, rx: 8.5, ry: 8.5, leftW: 1, rightW: 1, leftEar: 1, rightEar: 1 };
  #currentMascotStateKey = 'default';
  #animFrameIdKiko = null;
  #blinkTimeoutId = null;
  #isBlinking = false;
  #greyBlinkTimeoutId = null;
  #isGreyBlinking = false;

  #targetMouseOffset = { x: 0, y: 0 };
  #currentMouseOffset = { x: 0, y: 0 };
  #greyMouseOffset = { x: 0, y: 0 };
  #isTyping = false;
  #typingTimeoutId = null;
  #whiskerJitter = 0;
  #earTwitchOffset = 0;
  #activeTwitchEar = null;
  #earTwitchTimeoutId = null;
  #greyEarTwitchOffset = 0;
  #activeGreyTwitchEar = null;
  #greyEarTwitchTimeoutId = null;
  #continuousAnimFrameId = null;
  #mouseIdleTimeoutId = null;

  #tailPhase = 0;
  #tailSpeed = 0.0025;
  #tailAmplitude = 10;
  #tailSideFactor = 1;
  #greyTailSideFactor = -1;
  #lastAnimTime = 0;
  #tailCurrentFreq = 0.0020;
  #tailCurrentAmp = 0.24;
  #tailAnimator = new CatTailAnimator(5, 9.5, 0.42);
  #greyTailAnimator = new CatTailAnimator(5, 15.0, 0.42);

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
    this.#setupGreyBlinkLoop();
    this.#setupEarTwitchLoop();
    this.#setupGreyEarTwitchLoop();
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
    if (this.#blinkTimeoutId) clearTimeout(this.#blinkTimeoutId);
    const scheduleNext = () => {
      const delay = Math.random() * 2500 + 2500;
      this.#blinkTimeoutId = setTimeout(() => {
        if (!document.getElementById('auth-screen')) return;
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

  #setupGreyBlinkLoop() {
    if (this.#greyBlinkTimeoutId) clearTimeout(this.#greyBlinkTimeoutId);
    const scheduleNext = () => {
      const delay = Math.random() * 3200 + 2000;
      this.#greyBlinkTimeoutId = setTimeout(() => {
        if (!document.getElementById('auth-screen')) return;
        this.#triggerGreyBlink();
        scheduleNext();
      }, delay);
    };
    scheduleNext();
  }

  #triggerGreyBlink() {
    if (this.#isGreyBlinking || this.#currentMascotStateKey === 'passwordShown') return;

    this.#isGreyBlinking = true;
    const eyeBg = document.getElementById('grey-eye-bg');
    const eyePupil = document.getElementById('grey-eye-pupil');
    const eyeShine = document.getElementById('grey-eye-shine');
    if (!eyeBg) return;

    const baseRy = this.#currentEyeState.ry || 8.5;
    const startTime = performance.now();
    const duration = 160;

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
        this.#isGreyBlinking = false;
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
    if (this.#earTwitchTimeoutId) clearTimeout(this.#earTwitchTimeoutId);
    const scheduleNext = () => {
      const delay = Math.random() * 3000 + 3500;
      this.#earTwitchTimeoutId = setTimeout(() => {
        if (!document.getElementById('auth-screen')) return;
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

  #setupGreyEarTwitchLoop() {
    if (this.#greyEarTwitchTimeoutId) clearTimeout(this.#greyEarTwitchTimeoutId);
    const scheduleNext = () => {
      const delay = Math.random() * 3800 + 4000;
      this.#greyEarTwitchTimeoutId = setTimeout(() => {
        if (!document.getElementById('auth-screen')) return;
        this.#triggerGreyEarTwitch();
        scheduleNext();
      }, delay);
    };
    scheduleNext();
  }

  #triggerGreyEarTwitch() {
    if (this.#greyEarTwitchOffset !== 0) return;
    this.#activeGreyTwitchEar = Math.random() > 0.5 ? 'left' : 'right';
    const startTime = performance.now();
    const duration = 240;

    const stepTwitch = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      this.#greyEarTwitchOffset = Math.sin(progress * Math.PI * 2) * 3.0;

      if (progress < 1) {
        requestAnimationFrame(stepTwitch);
      } else {
        this.#greyEarTwitchOffset = 0;
        this.#activeGreyTwitchEar = null;
      }
    };
    requestAnimationFrame(stepTwitch);
  }

  #setupMouseTracking() {
    const handlePointerMove = (e) => {
      const mascotEl = document.getElementById('mascot-2') || document.getElementById('mascot-body') || document.getElementById('auth-mascots-container');
      if (!mascotEl) return;

      const rect = mascotEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height * 0.35;

      const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - centerX;
      const deltaY = clientY - centerY;
      const distance = Math.hypot(deltaX, deltaY);
      const angle = Math.atan2(deltaY, deltaX);

      let maxOffset = Math.min(3.8, distance / 80);
      if (deltaX < -30) {
        maxOffset = Math.min(1.5, maxOffset);
      }
      const targetX = Math.cos(angle) * maxOffset;
      const targetY = Math.sin(angle) * maxOffset;

      this.#targetMouseOffset = { x: targetX, y: targetY };
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchstart', handlePointerMove, { passive: true });
  }

  #setupContinuousAnimations() {
    if (this.#continuousAnimFrameId) {
      cancelAnimationFrame(this.#continuousAnimFrameId);
      this.#continuousAnimFrameId = null;
    }
    this.#lastAnimTime = 0;

    const tailEl = document.getElementById('cat-tail');

    const animateLoop = (now) => {
      if (!document.getElementById('auth-screen') || !document.getElementById('mascot-body')) {
        this.#continuousAnimFrameId = null;
        return;
      }

      if (!this.#lastAnimTime) this.#lastAnimTime = now;
      const dt = Math.min(32, Math.max(0, now - this.#lastAnimTime));
      this.#lastAnimTime = now;

      this.#currentMouseOffset.x += (this.#targetMouseOffset.x - this.#currentMouseOffset.x) * 0.22;
      this.#currentMouseOffset.y += (this.#targetMouseOffset.y - this.#currentMouseOffset.y) * 0.22;

      this.#greyMouseOffset.x += (this.#targetMouseOffset.x - this.#greyMouseOffset.x) * 0.12;
      this.#greyMouseOffset.y += (this.#targetMouseOffset.y - this.#greyMouseOffset.y) * 0.12;

      const kikoBreathingX = Math.sin(now * 0.0021 + 0.5) * 0.65;
      const kikoBreathingY = Math.cos(now * 0.0021 + 0.5) * 0.65;

      const kikoRenderPoints = [
        this.#currentPointsKiko[0],
        this.#currentPointsKiko[1],
        this.#currentPointsKiko[2],
        this.#currentPointsKiko[3],
        this.#currentPointsKiko[4] + kikoBreathingX,
        this.#currentPointsKiko[5] + kikoBreathingY,
        this.#currentPointsKiko[6] + kikoBreathingX,
        this.#currentPointsKiko[7] + kikoBreathingY
      ];

      this.#renderMascotFrame(kikoRenderPoints, this.#currentEyeState);

      const breathingX = Math.sin(now * 0.0016) * 0.7;
      const breathingY = Math.cos(now * 0.0016) * 0.7;

      const desiredGrey = [
        this.#currentPointsKiko[0] - 14,
        this.#currentPointsKiko[1],
        this.#currentPointsKiko[2] + 14,
        this.#currentPointsKiko[3],
        this.#currentPointsKiko[4] + 12 + breathingX,
        this.#currentPointsKiko[5] + breathingY,
        this.#currentPointsKiko[6] - 12 + breathingX,
        this.#currentPointsKiko[7] + breathingY
      ];

      for (let i = 0; i < 8; i++) {
        this.#currentPointsGrey[i] += (desiredGrey[i] - this.#currentPointsGrey[i]) * 0.13;
      }

      this.#renderGreyMascotFrame(this.#currentEyeState);

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

        const isPasswordMode = this.#currentMascotStateKey === 'password' || this.#currentMascotStateKey === 'passwordShown';
        const mouseX = isPasswordMode ? 0 : this.#currentMouseOffset.x;
        const mouseY = isPasswordMode ? 0 : this.#currentMouseOffset.y;

        const rawDx = currentPx + mouseX;
        const rawDy = currentPy + mouseY;

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
        const kikoGazeX = (this.#currentEyeState.offsetX || 0) + (this.#currentEyeState.px || 0) + this.#currentMouseOffset.x;
        const greyGazeX = (this.#currentEyeState.offsetX || 0) + (this.#currentEyeState.px || 0) + this.#greyMouseOffset.x;

        let kikoTargetSide = 1;
        if (kikoGazeX > 0.2) {
          kikoTargetSide = -1;
        } else if (kikoGazeX < -0.2) {
          kikoTargetSide = 1;
        } else if (this.#currentMascotStateKey === 'username') {
          kikoTargetSide = -1;
        } else if (this.#currentMascotStateKey === 'password' || this.#currentMascotStateKey === 'passwordShown') {
          kikoTargetSide = 1;
        }

        let greyTargetSide = -1;
        if (greyGazeX > 0.2) {
          greyTargetSide = -1;
        } else if (greyGazeX < -0.2) {
          greyTargetSide = 1;
        } else if (this.#currentMascotStateKey === 'username') {
          greyTargetSide = -1;
        } else if (this.#currentMascotStateKey === 'password' || this.#currentMascotStateKey === 'passwordShown') {
          greyTargetSide = 1;
        }

        this.#tailSideFactor += (kikoTargetSide - this.#tailSideFactor) * 0.05;
        this.#greyTailSideFactor += (greyTargetSide - this.#greyTailSideFactor) * 0.05;

        const targetFreq = this.#isTyping ? 0.0023 : 0.0020;
        const targetAmp = this.#isTyping ? 0.27 : 0.24;

        this.#tailCurrentFreq += (targetFreq - this.#tailCurrentFreq) * 0.08;
        this.#tailCurrentAmp += (targetAmp - this.#tailCurrentAmp) * 0.08;

        const kikoSide = this.#tailSideFactor;
        this.#tailAnimator.setDirection(kikoSide > 0);
        const kikoRootPosition = { x: 50 + kikoSide * 24, y: 82 };
        this.#tailAnimator.update(dt, this.#tailCurrentFreq, this.#tailCurrentAmp, kikoRootPosition);
        const kikoSegments = this.#tailAnimator.getSegments();

        const kBaseX = kikoSegments[0].startPoint.x.toFixed(2);
        const kBaseY = kikoSegments[0].startPoint.y.toFixed(2);
        const kCp1X = kikoSegments[0].endPoint.x.toFixed(2);
        const kCp1Y = kikoSegments[0].endPoint.y.toFixed(2);
        const kCp2X = kikoSegments[2].endPoint.x.toFixed(2);
        const kCp2Y = kikoSegments[2].endPoint.y.toFixed(2);
        const kTipX = kikoSegments[kikoSegments.length - 1].endPoint.x.toFixed(2);
        const kTipY = kikoSegments[kikoSegments.length - 1].endPoint.y.toFixed(2);

        tailEl.setAttribute('d', `M ${kBaseX} ${kBaseY} C ${kCp1X} ${kCp1Y}, ${kCp2X} ${kCp2Y}, ${kTipX} ${kTipY}`);

        const greyTailEl = document.getElementById('grey-cat-tail');
        if (greyTailEl) {
          const greySide = this.#greyTailSideFactor;
          this.#greyTailAnimator.setDirection(greySide > 0);
          const greyRootPosition = { x: 50 + greySide * 24, y: 82 };
          this.#greyTailAnimator.update(dt, this.#tailCurrentFreq * 0.9, this.#tailCurrentAmp, greyRootPosition);
          const greySegments = this.#greyTailAnimator.getSegments();

          const gBaseX = greySegments[0].startPoint.x.toFixed(2);
          const gBaseY = greySegments[0].startPoint.y.toFixed(2);
          const gCp1X = greySegments[0].endPoint.x.toFixed(2);
          const gCp1Y = greySegments[0].endPoint.y.toFixed(2);
          const gCp2X = greySegments[2].endPoint.x.toFixed(2);
          const gCp2Y = greySegments[2].endPoint.y.toFixed(2);
          const gTipX = greySegments[greySegments.length - 1].endPoint.x.toFixed(2);
          const gTipY = greySegments[greySegments.length - 1].endPoint.y.toFixed(2);

          greyTailEl.setAttribute('d', `M ${gBaseX} ${gBaseY} C ${gCp1X} ${gCp1Y}, ${gCp2X} ${gCp2Y}, ${gTipX} ${gTipY}`);
        }
      }

      if (this.#isTyping) {
        this.#whiskerJitter = Math.sin(now * 0.018) * 0.75;
      } else {
        this.#whiskerJitter *= 0.85;
      }

      if (eyeBg && (this.#isTyping || Math.abs(this.#whiskerJitter) > 0.01)) {
        const eyeX = parseFloat(eyeBg.getAttribute('cx') || '50');
        const eyeY = parseFloat(eyeBg.getAttribute('cy') || '35');
        const currentRx = this.#currentEyeState.rx || 8.5;
        const jitter = this.#whiskerJitter;

        const leftWhiskerStartX = eyeX - Math.max(currentRx, 6) - 2;
        const rightWhiskerStartX = eyeX + Math.max(currentRx, 6) + 2;

        const wl1 = document.getElementById('wl1');
        const wl2 = document.getElementById('wl2');
        const wl3 = document.getElementById('wl3');
        const wr1 = document.getElementById('wr1');
        const wr2 = document.getElementById('wr2');
        const wr3 = document.getElementById('wr3');

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
    }, 500);
  }

  #triggerHappyJump() {
    const mascotKiko = document.getElementById('mascot-2');
    if (mascotKiko) {
      mascotKiko.animate([
        { transform: 'translateY(0) scale(1, 1)' },
        { transform: 'translateY(-28px) scale(0.9, 1.1)', offset: 0.4 },
        { transform: 'translateY(4px) scale(1.15, 0.85)', offset: 0.8 },
        { transform: 'translateY(0) scale(1, 1)' }
      ], {
        duration: 500,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
      });
    }

    const mascotGrey = document.getElementById('mascot-1');
    if (mascotGrey) {
      setTimeout(() => {
        mascotGrey.animate([
          { transform: 'translateY(0) scale(1, 1)' },
          { transform: 'translateY(-20px) scale(0.85, 1.15)', offset: 0.45 },
          { transform: 'translateY(5px) scale(1.18, 0.82)', offset: 0.82 },
          { transform: 'translateY(0) scale(1, 1)' }
        ], {
          duration: 560,
          easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)'
        });
      }, 75);
    }

    this.#triggerBlink();
    if (!this.#isGreyBlinking) {
      setTimeout(() => this.#triggerGreyBlink(), 100);
    }
  }

  #renderMascotFrame(interpolated, pupilState = null) {
    const polygonEl = document.getElementById('mascot-body') || document.querySelector('#mascot-2 polygon');
    if (!polygonEl || !interpolated || interpolated.length !== 8) return;

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

    const pupilRx = 3.57;
    const pupilRy = Math.min(3.57, Math.max(0, (currentRy - 1.8) * 0.42));
    const shineRx = 1.3;
    const shineRy = Math.min(1.3, Math.max(0, (currentRy - 3.0) * 0.15));

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
      const pts = `${b1x.toFixed(2)},${b1y.toFixed(2)} ${tipX.toFixed(2)},${tipY.toFixed(2)} ${b2x.toFixed(2)},${b2y.toFixed(2)}`;
      earLeft.setAttribute('points', pts);

      if (earLeftInner) {
        earLeftInner.style.display = 'inline';
        const ib1x = x4 + 0.08 * dx + nx * 1.5;
        const ib1y = y4 + 0.08 * dy + ny * 1.5;
        const ib2x = x4 + 0.30 * dx + nx * 1.5;
        const ib2y = y4 + 0.30 * dy + ny * 1.5;
        const itipX = x4 + 0.13 * dx + nx * (11.5 + twitchLeft);
        const itipY = y4 + 0.13 * dy + ny * (11.5 + twitchLeft);
        const ipts = `${ib1x.toFixed(2)},${ib1y.toFixed(2)} ${itipX.toFixed(2)},${itipY.toFixed(2)} ${ib2x.toFixed(2)},${ib2y.toFixed(2)}`;
        earLeftInner.setAttribute('points', ipts);
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
      const pts = `${b1x.toFixed(2)},${b1y.toFixed(2)} ${tipX.toFixed(2)},${tipY.toFixed(2)} ${b2x.toFixed(2)},${b2y.toFixed(2)}`;
      earRight.setAttribute('points', pts);

      if (earRightInner) {
        earRightInner.style.display = 'inline';
        const ib1x = x4 + 0.70 * dx + nx * 1.5;
        const ib1y = y4 + 0.70 * dy + ny * 1.5;
        const ib2x = x4 + 0.92 * dx + nx * 1.5;
        const ib2y = y4 + 0.92 * dy + ny * 1.5;
        const itipX = x4 + 0.87 * dx + nx * (11.5 + twitchRight);
        const itipY = y4 + 0.87 * dy + ny * (11.5 + twitchRight);
        const ipts = `${ib1x.toFixed(2)},${ib1y.toFixed(2)} ${itipX.toFixed(2)},${itipY.toFixed(2)} ${ib2x.toFixed(2)},${ib2y.toFixed(2)}`;
        earRightInner.setAttribute('points', ipts);
      }
    }

    const noseX = eyeX + 0.5;
    const noseY = eyeY + Math.max(currentRy, 5) + 3;
    const nosePts = `${noseX.toFixed(2)},${(noseY + 3).toFixed(2)} ${(noseX - 2.5).toFixed(2)},${noseY.toFixed(2)} ${(noseX + 2.5).toFixed(2)},${noseY.toFixed(2)}`;
    if (catNose) {
      catNose.setAttribute('points', nosePts);
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

  #renderGreyMascotFrame(pupilState = null) {
    const greyPolygonEl = document.getElementById('grey-mascot-body');
    if (!greyPolygonEl) return;

    const points = this.#currentPointsGrey;
    const pointsAttr = `${points[0].toFixed(2)},${points[1].toFixed(2)} ${points[2].toFixed(2)},${points[3].toFixed(2)} ${points[4].toFixed(2)},${points[5].toFixed(2)} ${points[6].toFixed(2)},${points[7].toFixed(2)}`;
    greyPolygonEl.setAttribute('points', pointsAttr);

    const topCenterX = (points[4] + points[6]) / 2;
    const topCenterY = (points[5] + points[7]) / 2;
    const bottomCenterX = (points[0] + points[2]) / 2;
    const bottomCenterY = (points[1] + points[3]) / 2;

    const currentPupil = pupilState || this.#currentEyeState;
    const currentOffsetX = currentPupil.offsetX || 0;
    const currentOffsetY = currentPupil.offsetY || 0;

    const eyeX = topCenterX + (bottomCenterX - topCenterX) * 0.32 + currentOffsetX;
    const eyeY = topCenterY + (bottomCenterY - topCenterY) * 0.32 + currentOffsetY;

    const faceScale = 1.35;
    const currentRx = (currentPupil.rx || 8.5) * faceScale;
    const currentRy = (currentPupil.ry || 8.5) * faceScale;
    const currentPx = currentPupil.px || 0;
    const currentPy = currentPupil.py || 0;

    const greyEyeBg = document.getElementById('grey-eye-bg');
    const greyEyePupil = document.getElementById('grey-eye-pupil');
    const greyEyeShine = document.getElementById('grey-eye-shine');
    const greyEarLeft = document.getElementById('grey-cat-ear-left');
    const greyEarLeftInner = document.getElementById('grey-cat-ear-left-inner');
    const greyEarRight = document.getElementById('grey-cat-ear-right');
    const greyEarRightInner = document.getElementById('grey-cat-ear-right-inner');
    const greyCatNose = document.getElementById('grey-cat-nose');
    const greyWhiskersLeftGroup = document.getElementById('grey-whiskers-left');
    const greyWhiskersRightGroup = document.getElementById('grey-whiskers-right');
    const gwl1 = document.getElementById('gwl1');
    const gwl2 = document.getElementById('gwl2');
    const gwl3 = document.getElementById('gwl3');
    const gwr1 = document.getElementById('gwr1');
    const gwr2 = document.getElementById('gwr2');
    const gwr3 = document.getElementById('gwr3');

    const pupilRx = 4.8;
    const pupilRy = Math.min(4.8, Math.max(0, (currentRy - 1.8) * 0.42));
    const shineRx = 1.8;
    const shineRy = Math.min(1.8, Math.max(0, (currentRy - 3.0) * 0.16));

    const fillFactor = Math.max(0, Math.min(1, (currentRy - 1.0) / 2.5));
    const rVal = Math.round(38 + (255 - 38) * fillFactor);
    const gVal = Math.round(25 + (255 - 25) * fillFactor);
    const bVal = Math.round(15 + (255 - 15) * fillFactor);
    const fillColor = `rgb(${rVal},${gVal},${bVal})`;

    if (greyEyeBg && !this.#isGreyBlinking) {
      greyEyeBg.setAttribute('cx', eyeX.toFixed(2));
      greyEyeBg.setAttribute('cy', eyeY.toFixed(2));
      greyEyeBg.setAttribute('rx', currentRx.toFixed(2));
      greyEyeBg.setAttribute('ry', Math.max(0.6, currentRy).toFixed(2));
      greyEyeBg.setAttribute('fill', fillColor);
    }

    const isPasswordMode = this.#currentMascotStateKey === 'password' || this.#currentMascotStateKey === 'passwordShown';
    const greyMouseX = isPasswordMode ? 0 : this.#greyMouseOffset.x;
    const greyMouseY = isPasswordMode ? 0 : this.#greyMouseOffset.y;

    const rawDx = currentPx + greyMouseX;
    const rawDy = currentPy + greyMouseY;
    const clamped = this.#getClampedPupilOffset(rawDx, rawDy, currentRx, currentRy, pupilRx, pupilRy);

    if (greyEyePupil && !this.#isGreyBlinking) {
      greyEyePupil.setAttribute('cx', (eyeX + clamped.x).toFixed(2));
      greyEyePupil.setAttribute('cy', (eyeY + clamped.y).toFixed(2));
      greyEyePupil.setAttribute('rx', pupilRx.toFixed(2));
      greyEyePupil.setAttribute('ry', pupilRy.toFixed(2));
      greyEyePupil.setAttribute('opacity', pupilRy > 0.05 ? '1' : '0');
    }

    if (greyEyeShine && !this.#isGreyBlinking) {
      greyEyeShine.setAttribute('cx', (eyeX + clamped.x - currentRx * 0.22).toFixed(2));
      greyEyeShine.setAttribute('cy', (eyeY + clamped.y - currentRy * 0.22).toFixed(2));
      greyEyeShine.setAttribute('rx', shineRx.toFixed(2));
      greyEyeShine.setAttribute('ry', shineRy.toFixed(2));
      greyEyeShine.setAttribute('opacity', shineRy > 0.05 ? '1' : '0');
    }

    const x3 = points[4], y3 = points[5];
    const x4 = points[6], y4 = points[7];
    const dx = x3 - x4, dy = y3 - y4;
    const topLen = Math.hypot(dx, dy) || 1;
    const nx = dy / topLen;
    const ny = -dx / topLen;

    if (greyEarLeft) {
      greyEarLeft.style.display = 'inline';
      greyEarLeft.setAttribute('opacity', '1');
      const b1x = x4, b1y = y4;
      const b2x = x4 + 0.38 * dx, b2y = y4 + 0.38 * dy;
      const twitchLeft = this.#activeGreyTwitchEar === 'left' ? this.#greyEarTwitchOffset : 0;
      const tipX = x4 + 0.12 * dx + nx * (17.5 + twitchLeft);
      const tipY = y4 + 0.12 * dy + ny * (17.5 + twitchLeft);
      const pts = `${b1x.toFixed(2)},${b1y.toFixed(2)} ${tipX.toFixed(2)},${tipY.toFixed(2)} ${b2x.toFixed(2)},${b2y.toFixed(2)}`;
      greyEarLeft.setAttribute('points', pts);

      if (greyEarLeftInner) {
        greyEarLeftInner.style.display = 'inline';
        const ib1x = x4 + 0.08 * dx + nx * 1.5;
        const ib1y = y4 + 0.08 * dy + ny * 1.5;
        const ib2x = x4 + 0.30 * dx + nx * 1.5;
        const ib2y = y4 + 0.30 * dy + ny * 1.5;
        const itipX = x4 + 0.13 * dx + nx * (13.5 + twitchLeft);
        const itipY = y4 + 0.13 * dy + ny * (13.5 + twitchLeft);
        const ipts = `${ib1x.toFixed(2)},${ib1y.toFixed(2)} ${itipX.toFixed(2)},${itipY.toFixed(2)} ${ib2x.toFixed(2)},${ib2y.toFixed(2)}`;
        greyEarLeftInner.setAttribute('points', ipts);
      }
    }

    if (greyEarRight) {
      greyEarRight.style.display = 'inline';
      greyEarRight.setAttribute('opacity', '1');
      const b1x = x4 + 0.62 * dx, b1y = y4 + 0.62 * dy;
      const b2x = x3, b2y = y3;
      const twitchRight = this.#activeGreyTwitchEar === 'right' ? this.#greyEarTwitchOffset : 0;
      const tipX = x4 + 0.88 * dx + nx * (17.5 + twitchRight);
      const tipY = y4 + 0.88 * dy + ny * (17.5 + twitchRight);
      const pts = `${b1x.toFixed(2)},${b1y.toFixed(2)} ${tipX.toFixed(2)},${tipY.toFixed(2)} ${b2x.toFixed(2)},${b2y.toFixed(2)}`;
      greyEarRight.setAttribute('points', pts);

      if (greyEarRightInner) {
        greyEarRightInner.style.display = 'inline';
        const ib1x = x4 + 0.70 * dx + nx * 1.5;
        const ib1y = y4 + 0.70 * dy + ny * 1.5;
        const ib2x = x4 + 0.92 * dx + nx * 1.5;
        const ib2y = y4 + 0.92 * dy + ny * 1.5;
        const itipX = x4 + 0.87 * dx + nx * (13.5 + twitchRight);
        const itipY = y4 + 0.87 * dy + ny * (13.5 + twitchRight);
        const ipts = `${ib1x.toFixed(2)},${ib1y.toFixed(2)} ${itipX.toFixed(2)},${itipY.toFixed(2)} ${ib2x.toFixed(2)},${ib2y.toFixed(2)}`;
        greyEarRightInner.setAttribute('points', ipts);
      }
    }

    const noseX = eyeX + 0.5;
    const noseY = eyeY + Math.max(currentRy, 6) + 3;
    const nosePts = `${noseX.toFixed(2)},${(noseY + 4.2).toFixed(2)} ${(noseX - 3.5).toFixed(2)},${noseY.toFixed(2)} ${(noseX + 3.5).toFixed(2)},${noseY.toFixed(2)}`;
    if (greyCatNose) {
      greyCatNose.setAttribute('points', nosePts);
    }

    const leftW = currentPupil.leftW !== undefined ? currentPupil.leftW : 1;
    const rightW = currentPupil.rightW !== undefined ? currentPupil.rightW : 1;

    if (greyWhiskersLeftGroup) {
      greyWhiskersLeftGroup.style.display = leftW > 0.5 ? 'inline' : 'none';
      greyWhiskersLeftGroup.setAttribute('opacity', leftW > 0.5 ? '1' : '0');
    }
    if (greyWhiskersRightGroup) {
      greyWhiskersRightGroup.style.display = rightW > 0.5 ? 'inline' : 'none';
      greyWhiskersRightGroup.setAttribute('opacity', rightW > 0.5 ? '1' : '0');
    }

    const jitter = this.#whiskerJitter;
    const leftWhiskerStartX = eyeX - Math.max(currentRx, 7) - 2;

    if (gwl1) {
      gwl1.setAttribute('x1', leftWhiskerStartX.toFixed(2));
      gwl1.setAttribute('y1', (eyeY - 2 + jitter).toFixed(2));
      gwl1.setAttribute('x2', (leftWhiskerStartX - 16).toFixed(2));
      gwl1.setAttribute('y2', (eyeY - 7 + jitter).toFixed(2));
    }
    if (gwl2) {
      gwl2.setAttribute('x1', (leftWhiskerStartX - 1).toFixed(2));
      gwl2.setAttribute('y1', (eyeY + 3 - jitter).toFixed(2));
      gwl2.setAttribute('x2', (leftWhiskerStartX - 18).toFixed(2));
      gwl2.setAttribute('y2', (eyeY + 3 - jitter).toFixed(2));
    }
    if (gwl3) {
      gwl3.setAttribute('x1', leftWhiskerStartX.toFixed(2));
      gwl3.setAttribute('y1', (eyeY + 8 + jitter).toFixed(2));
      gwl3.setAttribute('x2', (leftWhiskerStartX - 15).toFixed(2));
      gwl3.setAttribute('y2', (eyeY + 13 + jitter).toFixed(2));
    }

    const rightWhiskerStartX = eyeX + Math.max(currentRx, 7) + 2;
    if (gwr1) {
      gwr1.setAttribute('x1', rightWhiskerStartX.toFixed(2));
      gwr1.setAttribute('y1', (eyeY - 2 - jitter).toFixed(2));
      gwr1.setAttribute('x2', (rightWhiskerStartX + 16).toFixed(2));
      gwr1.setAttribute('y2', (eyeY - 7 - jitter).toFixed(2));
    }
    if (gwr2) {
      gwr2.setAttribute('x1', (rightWhiskerStartX + 1).toFixed(2));
      gwr2.setAttribute('y1', (eyeY + 3 + jitter).toFixed(2));
      gwr2.setAttribute('x2', (rightWhiskerStartX + 18).toFixed(2));
      gwr2.setAttribute('y2', (eyeY + 3 + jitter).toFixed(2));
    }
    if (gwr3) {
      gwr3.setAttribute('x1', rightWhiskerStartX.toFixed(2));
      gwr3.setAttribute('y1', (eyeY + 8 - jitter).toFixed(2));
      gwr3.setAttribute('x2', (rightWhiskerStartX + 15).toFixed(2));
      gwr3.setAttribute('y2', (eyeY + 13 - jitter).toFixed(2));
    }
  }

  #isMobileViewport() {
    return window.innerWidth < 768;
  }

  #getMascotCoordinates(stateKey) {
    const mode = this.#isMobileViewport() ? 'mobile' : 'desktop';
    return MASCOT_COORDINATES.kiko[mode][stateKey] || MASCOT_COORDINATES.kiko[mode].default;
  }

  #getMascotEyeState(stateKey) {
    const mode = this.#isMobileViewport() ? 'mobile' : 'desktop';
    return MASCOT_EYE_STATES[mode][stateKey] || MASCOT_EYE_STATES[mode].default;
  }

  #triggerHeadShakeNo() {
    const baseStateKey = this.#currentMascotStateKey;
    const baseCoordsStr = this.#getMascotCoordinates(baseStateKey);
    const baseArr = baseCoordsStr.replace(/,/g, ' ').split(/\s+/).filter(Boolean).map(Number);
    if (baseArr.length !== 8) return;

    const basePupil = this.#getMascotEyeState(baseStateKey);

    const startTime = performance.now();
    const duration = 550;

    if (this.#animFrameIdKiko) {
      cancelAnimationFrame(this.#animFrameIdKiko);
    }

    const stepShake = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      const decay = Math.pow(1 - progress, 1.5);
      const kikoShakeOffset = Math.sin(progress * Math.PI * 7) * 12 * decay;
      const greyShakeOffset = Math.sin((progress - 0.05) * Math.PI * 6.5) * 10 * decay;

      const currentPointsKiko = [...baseArr];
      currentPointsKiko[4] += kikoShakeOffset;
      currentPointsKiko[6] += kikoShakeOffset;

      let kikoLeftW = 1;
      let kikoRightW = 1;
      if (kikoShakeOffset > 2.0) {
        kikoLeftW = 1;
        kikoRightW = 0;
      } else if (kikoShakeOffset < -2.0) {
        kikoLeftW = 0;
        kikoRightW = 1;
      }

      const currentPupilKiko = {
        ...basePupil,
        offsetX: (basePupil.offsetX || 0) + kikoShakeOffset * 0.70,
        leftW: kikoLeftW,
        rightW: kikoRightW
      };

      this.#renderMascotFrame(currentPointsKiko, currentPupilKiko);

      let greyLeftW = 1;
      let greyRightW = 1;
      if (greyShakeOffset > 2.0) {
        greyLeftW = 1;
        greyRightW = 0;
      } else if (greyShakeOffset < -2.0) {
        greyLeftW = 0;
        greyRightW = 1;
      }

      const currentPupilGrey = {
        ...basePupil,
        offsetX: (basePupil.offsetX || 0) + greyShakeOffset * 0.70,
        leftW: greyLeftW,
        rightW: greyRightW
      };

      const desiredGrey = [
        currentPointsKiko[0] - 14,
        currentPointsKiko[1],
        currentPointsKiko[2] + 14,
        currentPointsKiko[3],
        currentPointsKiko[4] + 12 + greyShakeOffset,
        currentPointsKiko[5],
        currentPointsKiko[6] - 12 + greyShakeOffset,
        currentPointsKiko[7]
      ];

      for (let i = 0; i < 8; i++) {
        this.#currentPointsGrey[i] += (desiredGrey[i] - this.#currentPointsGrey[i]) * 0.25;
      }

      this.#renderGreyMascotFrame(currentPupilGrey);

      if (progress < 1) {
        this.#animFrameIdKiko = requestAnimationFrame(stepShake);
      }
    };

    this.#animFrameIdKiko = requestAnimationFrame(stepShake);
  }

  #triggerErrorShake() {
    this.#triggerHeadShakeNo();
    this.#whiskerJitter = 4.5;

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
    const targetPupil = this.#getMascotEyeState(targetStateKey);

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
        py: startPupil.py + (targetPupil.py - startPupil.py) * eased,
        leftW: targetPupil.leftW,
        rightW: targetPupil.rightW
      };

      this.#currentPointsKiko = interpolated;
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

    let lastAppliedState = null;

    const setMascotState = (stateKey, forceRefresh = false) => {
      const state = stateKey || 'default';
      const isMobile = this.#isMobileViewport();
      const stateId = state + '_' + (isMobile ? 'mobile' : 'desktop');

      if (!forceRefresh && lastAppliedState === stateId) return;
      lastAppliedState = stateId;

      if (this.#mouseIdleTimeoutId) {
        clearTimeout(this.#mouseIdleTimeoutId);
        this.#mouseIdleTimeoutId = null;
      }
      this.#targetMouseOffset = { x: 0, y: 0 };

      this.#currentMascotStateKey = state;
      if (this.#mascotsContainer) {
        this.#mascotsContainer.className = 'auth-mascots-container state-' + state;
      }

      const polygonKiko = document.getElementById('mascot-body') || document.querySelector('#mascot-2 polygon');
      const targetPointsStr = this.#getMascotCoordinates(state);

      if (polygonKiko && targetPointsStr) {
        this.#animateMascotToPoints(polygonKiko, targetPointsStr, state, 400);
      }
    };

    const updateStateFromActiveElement = (forceRefresh = false) => {
      const active = document.activeElement;
      if (active === this.#usernameInput) {
        setMascotState('username', forceRefresh);
      } else if (active === this.#passwordInput) {
        if (this.#passwordInput.type === 'text') {
          setMascotState('passwordShown', forceRefresh);
        } else {
          setMascotState('password', forceRefresh);
        }
      } else {
        setMascotState('default', forceRefresh);
      }
    };

    window.addEventListener('resize', () => {
      updateStateFromActiveElement(true);
    });

    if (this.#usernameInput) {
      this.#usernameInput.addEventListener('focus', () => updateStateFromActiveElement());
      this.#usernameInput.addEventListener('input', () => {
        this.#handleTypingActivity();
        updateStateFromActiveElement();
      });
      this.#usernameInput.addEventListener('blur', () => {
        requestAnimationFrame(() => updateStateFromActiveElement());
      });
    }

    if (this.#passwordInput) {
      this.#passwordInput.addEventListener('focus', () => updateStateFromActiveElement());
      this.#passwordInput.addEventListener('input', () => {
        this.#handleTypingActivity();
        updateStateFromActiveElement();
      });
      this.#passwordInput.addEventListener('blur', () => {
        requestAnimationFrame(() => updateStateFromActiveElement());
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

        updateStateFromActiveElement(true);
        this.#passwordInput.focus();
      });
    }

    setMascotState('default', true);
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
    if (this.#errorMsg) {
      this.#errorMsg.classList.add('hidden');
    }

    FlashMessageService.show(message, isInfo ? 'info' : 'error');

    if (!isInfo) {
      this.#triggerErrorShake();
    }
  }

  clearInputs() {
    if (this.#usernameInput) this.#usernameInput.value = '';
    if (this.#passwordInput) this.#passwordInput.value = '';
  }
}
