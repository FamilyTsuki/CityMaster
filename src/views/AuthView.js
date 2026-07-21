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

    if (isLogin) {
      if (this.#authTitle) this.#authTitle.textContent = 'Connexion';
      if (this.#authSubtitle) this.#authSubtitle.textContent = 'Connectez-vous pour enregistrer vos scores.';
      if (this.#authMainBtn) this.#authMainBtn.textContent = 'Se connecter';
      if (this.#authSwitchText) this.#authSwitchText.textContent = 'Pas encore de compte ?';
      if (this.#authSwitchLink) this.#authSwitchLink.textContent = 'Créer un compte';
      if (this.#passwordInput) this.#passwordInput.setAttribute('autocomplete', 'current-password');
    } else {
      if (this.#authTitle) this.#authTitle.textContent = 'Créer un compte';
      if (this.#authSubtitle) this.#authSubtitle.textContent = 'Rejoignez-nous pour jouer !';
      if (this.#authMainBtn) this.#authMainBtn.textContent = "S'inscrire";
      if (this.#authSwitchText) this.#authSwitchText.textContent = 'Déjà un compte ?';
      if (this.#authSwitchLink) this.#authSwitchLink.textContent = 'Se connecter';
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
