import { I18nService } from '../services/I18nService.js';

export class AuthView {
  #usernameInput;
  #passwordInput;
  #authMainBtn;
  #authSwitchLink;
  #authSwitchText;
  #authTitle;
  #authSubtitle;
  #errorMsg;

  constructor() {
    this.#usernameInput = document.getElementById('auth-username');
    this.#passwordInput = document.getElementById('auth-password');
    this.#authMainBtn = document.getElementById('auth-main-btn');
    this.#authSwitchLink = document.getElementById('auth-switch-link');
    this.#authSwitchText = document.getElementById('auth-switch-text');
    this.#authTitle = document.getElementById('auth-title');
    this.#authSubtitle = document.getElementById('auth-subtitle');
    this.#errorMsg = document.getElementById('auth-error');
  }

  async initGoogleSignIn(callback) {
    try {
      const response = await fetch('/api/config');
      const config = await response.json();
      
      if (config.googleClientId && window.google) {
        window.google.accounts.id.initialize({
          client_id: config.googleClientId,
          callback: (response) => {
            callback(response.credential);
          }
        });
        window.google.accounts.id.renderButton(
          document.getElementById('google-login-btn'),
          { theme: 'outline', size: 'large', width: 250 }
        );
      } else {
        const btnContainer = document.getElementById('google-login-btn');
        if (btnContainer) {
          btnContainer.innerHTML = `<span style="font-size: 12px; color: var(--text-muted);">(Google Auth non configuré)</span>`;
        }
      }
    } catch (error) {
      console.warn('Failed to load Google Auth config', error);
    }
  }

  onSubmit(callback) {
    const form = document.getElementById('auth-form');
    const handler = (e) => {
      if (e) e.preventDefault();
      const username = this.#usernameInput.value.trim();
      const password = this.#passwordInput.value.trim();
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
      this.#errorMsg.style.color = 'var(--text-success)';
      this.#errorMsg.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
      this.#errorMsg.style.borderColor = 'rgba(16, 185, 129, 0.2)';
    } else {
      this.#errorMsg.style.color = '';
      this.#errorMsg.style.backgroundColor = '';
      this.#errorMsg.style.borderColor = '';
    }
    this.#errorMsg.classList.remove('hidden');
  }

  clearInputs() {
    if (this.#usernameInput) this.#usernameInput.value = '';
    if (this.#passwordInput) this.#passwordInput.value = '';
  }
}
