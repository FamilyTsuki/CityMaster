export class AuthController {
  #usernameInput;
  #passwordInput;
  #authMainBtn;
  #authSwitchLink;
  #authSwitchText;
  #authTitle;
  #authSubtitle;
  #errorMsg;
  #loggedInUserSpan;
  #themeToggle;

  #navLoginBtn;
  #navLogoutBtn;
  #navProfileName;
  #navAuthLoggedIn;
  #navAuthLoggedOut;

  #isLoginMode = true;
  #router;

  constructor(router) {
    this.#router = router;
    this.#usernameInput = document.getElementById('auth-username');
    this.#passwordInput = document.getElementById('auth-password');
    this.#authMainBtn = document.getElementById('auth-main-btn');
    this.#authSwitchLink = document.getElementById('auth-switch-link');
    this.#authSwitchText = document.getElementById('auth-switch-text');
    this.#authTitle = document.getElementById('auth-title');
    this.#authSubtitle = document.getElementById('auth-subtitle');
    this.#errorMsg = document.getElementById('auth-error');
    
    this.#loggedInUserSpan = document.getElementById('logged-in-user');
    this.#themeToggle = document.getElementById('theme-toggle');

    // Navbar elements
    this.#navLoginBtn = document.getElementById('nav-login-btn');
    this.#navLogoutBtn = document.getElementById('nav-logout-btn');
    this.#navProfileName = document.getElementById('nav-profile-name');
    this.#navAuthLoggedIn = document.getElementById('nav-auth-logged-in');
    this.#navAuthLoggedOut = document.getElementById('nav-auth-logged-out');

    this._initEvents();
    this._initTheme();
  }

  _initEvents() {
    this.#authMainBtn.addEventListener('click', () => {
      const endpoint = this.#isLoginMode ? '/api/login' : '/api/register';
      this._handleAuth(endpoint);
    });

    this.#authSwitchLink.addEventListener('click', (e) => {
      e.preventDefault();
      this._toggleMode();
    });

    this.#navLoginBtn.addEventListener('click', () => {
      this.#router.navigate('/login');
    });

    this.#navLogoutBtn.addEventListener('click', () => {
      this.logout();
    });
    
    this.#themeToggle.addEventListener('click', () => {
      const currentTheme = document.body.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.body.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      this.#themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    });
  }

  _toggleMode() {
    if (this.#isLoginMode) {
      this.#router.navigate('/register');
    } else {
      this.#router.navigate('/login');
    }
  }

  setMode(isLogin) {
    this.#isLoginMode = isLogin;
    this.#errorMsg.classList.add('hidden');
    
    if (this.#isLoginMode) {
      this.#authTitle.textContent = 'Connexion';
      this.#authSubtitle.textContent = 'Connectez-vous pour enregistrer vos scores.';
      this.#authMainBtn.textContent = 'Se connecter';
      this.#authSwitchText.textContent = 'Pas encore de compte ?';
      this.#authSwitchLink.textContent = 'Créer un compte';
    } else {
      this.#authTitle.textContent = 'Créer un compte';
      this.#authSubtitle.textContent = 'Rejoignez-nous pour jouer !';
      this.#authMainBtn.textContent = "S'inscrire";
      this.#authSwitchText.textContent = 'Déjà un compte ?';
      this.#authSwitchLink.textContent = 'Se connecter';
    }
  }

  _initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.body.setAttribute('data-theme', 'dark');
      this.#themeToggle.textContent = '☀️';
    } else {
      this.#themeToggle.textContent = '🌙';
    }
  }

  async _handleAuth(endpoint) {
    const username = this.#usernameInput.value.trim();
    const password = this.#passwordInput.value.trim();

    if (!username || !password) {
      this._showError('Veuillez remplir tous les champs.');
      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur d'authentification");
      }

      if (endpoint === '/api/login') {
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        this.#usernameInput.value = '';
        this.#passwordInput.value = '';
        this.#router.navigate('/');
      } else {
        // Registration success, auto-login
        this._showError('Compte créé ! Connexion...', true);
        await this._handleAuth('/api/login');
      }
    } catch (err) {
      this._showError(err.message);
    }
  }

  _showError(msg, isSuccess = false) {
    this.#errorMsg.textContent = msg;
    this.#errorMsg.style.color = isSuccess ? 'var(--success)' : 'var(--danger)';
    this.#errorMsg.classList.remove('hidden');
  }

  isAuthenticated() {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');

    if (token && username) {
      this.#loggedInUserSpan.textContent = username;
      this.#navProfileName.textContent = username;
      this.#navAuthLoggedIn.classList.remove('hidden');
      this.#navAuthLoggedOut.classList.add('hidden');
      return true;
    }
    
    this.#navAuthLoggedIn.classList.add('hidden');
    this.#navAuthLoggedOut.classList.remove('hidden');
    return false;
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    this.isAuthenticated(); // to update navbar
    this.#router.navigate('/');
  }
}
