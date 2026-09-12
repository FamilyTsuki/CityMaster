import { I18nService } from '../services/I18nService.js';

// =========================================================================
// CONFIGURATION DES 4 POINTS DES MASCOTTES PAR MOUVEMENT
// Format: "X_basGauche,Y_basGauche  X_basDroite,Y_basDroite  X_hautDroite,Y_hautDroite  X_hautGauche,Y_hautGauche"
// Les 2 points du bas restent fixes au sol (Y=92).
// Modifier les 2 points du haut pour ajuster les mouvements !
// =========================================================================
const MASCOT_COORDINATES = {
  kiko: {
    default:        "20,92 80,92 72,10 28,10",
    username:       "20,92 80,92 86,18 42,22",
    password:       "20,92 80,92 60,22 20,22",
    passwordShown:  "20,92 80,92 34,35 2,35"
  }
};

const MASCOT_EYE_STATES = {
  default:       { offsetX: 0,  offsetY: 0,  px: 0,    py: 0,   rx: 8.5, ry: 8.5 },
  username:      { offsetX: 8,  offsetY: 0,  px: 4,    py: 1,   rx: 8.5, ry: 8.5 },
  password:      { offsetX: -8, offsetY: 0,  px: -4,   py: -1,  rx: 7.5, ry: 7.5 },
  passwordShown: { offsetX: -6, offsetY: 2,  px: 0,    py: 0,   rx: 9.0, ry: 0.9 }
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
  #currentEyeState = { offsetX: 0, offsetY: 0, px: 0, py: 0, rx: 8.5, ry: 8.5 };
  #currentMascotStateKey = 'default';
  #animFrameIdKiko = null;
  #blinkTimeoutId = null;
  #isBlinking = false;

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

    this.#setupMascotInteractions();
    this.#setupBlinkLoop();
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

  #animateMascotToPoints(polygonEl, targetPointsStr, targetStateKey = 'default', duration = 400) {
    if (!polygonEl || !targetPointsStr) return;

    const targetArr = targetPointsStr.replace(/,/g, ' ').split(/\s+/).filter(Boolean).map(Number);
    if (targetArr.length !== 8) return;

    const startArr = [...this.#currentPointsKiko];
    const startPupil = { ...this.#currentEyeState };
    const targetPupil = MASCOT_EYE_STATES[targetStateKey] || MASCOT_EYE_STATES.default;

    const eyeBg = document.getElementById('eye-bg');
    const eyePupil = document.getElementById('eye-pupil');
    const eyeShine = document.getElementById('eye-shine');

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

      this.#currentPointsKiko = interpolated;

      const pointsAttr = `${interpolated[0].toFixed(2)},${interpolated[1].toFixed(2)} ${interpolated[2].toFixed(2)},${interpolated[3].toFixed(2)} ${interpolated[4].toFixed(2)},${interpolated[5].toFixed(2)} ${interpolated[6].toFixed(2)},${interpolated[7].toFixed(2)}`;

      polygonEl.setAttribute('points', pointsAttr);

      const topCenterX = (interpolated[4] + interpolated[6]) / 2;
      const topCenterY = (interpolated[5] + interpolated[7]) / 2;
      const bottomCenterX = (interpolated[0] + interpolated[2]) / 2;
      const bottomCenterY = (interpolated[1] + interpolated[3]) / 2;

      const currentOffsetX = startPupil.offsetX + (targetPupil.offsetX - startPupil.offsetX) * eased;
      const currentOffsetY = startPupil.offsetY + (targetPupil.offsetY - startPupil.offsetY) * eased;

      const eyeX = topCenterX + (bottomCenterX - topCenterX) * 0.32 + currentOffsetX;
      const eyeY = topCenterY + (bottomCenterY - topCenterY) * 0.32 + currentOffsetY;

      const currentRx = startPupil.rx + (targetPupil.rx - startPupil.rx) * eased;
      const currentRy = startPupil.ry + (targetPupil.ry - startPupil.ry) * eased;
      const currentPx = startPupil.px + (targetPupil.px - startPupil.px) * eased;
      const currentPy = startPupil.py + (targetPupil.py - startPupil.py) * eased;

      this.#currentEyeState = {
        offsetX: currentOffsetX,
        offsetY: currentOffsetY,
        px: currentPx,
        py: currentPy,
        rx: currentRx,
        ry: currentRy
      };

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

      if (eyePupil) {
        eyePupil.setAttribute('cx', (eyeX + currentPx).toFixed(2));
        eyePupil.setAttribute('cy', (eyeY + currentPy).toFixed(2));
        eyePupil.setAttribute('rx', pupilRx.toFixed(2));
        eyePupil.setAttribute('ry', pupilRy.toFixed(2));
        eyePupil.setAttribute('opacity', pupilRy > 0.05 ? '1' : '0');
      }

      if (eyeShine) {
        eyeShine.setAttribute('cx', (eyeX + currentPx - currentRx * 0.22).toFixed(2));
        eyeShine.setAttribute('cy', (eyeY + currentPy - currentRy * 0.22).toFixed(2));
        eyeShine.setAttribute('rx', shineRx.toFixed(2));
        eyeShine.setAttribute('ry', shineRy.toFixed(2));
        eyeShine.setAttribute('opacity', shineRy > 0.05 ? '1' : '0');
      }

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
      this.#currentMascotStateKey = state;
      this.#mascotsContainer.className = 'auth-mascots-container state-' + state;

      const polygonKiko = document.querySelector('#mascot-2 polygon');

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
      this.#usernameInput.addEventListener('input', updateStateFromActiveElement);
      this.#usernameInput.addEventListener('blur', () => {
        setTimeout(updateStateFromActiveElement, 50);
      });
    }

    if (this.#passwordInput) {
      this.#passwordInput.addEventListener('focus', updateStateFromActiveElement);
      this.#passwordInput.addEventListener('input', updateStateFromActiveElement);
      this.#passwordInput.addEventListener('blur', () => {
        setTimeout(updateStateFromActiveElement, 50);
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

    // Apply default coordinates immediately on load
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
      callback(username, password);
    };

    if (form) {
      form.addEventListener('submit', handler);
    } else if (this.#authMainBtn) {
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
    }
    this.#errorMsg.classList.remove('hidden');
  }

  clearInputs() {
    if (this.#usernameInput) this.#usernameInput.value = '';
    if (this.#passwordInput) this.#passwordInput.value = '';
  }
}
