export class AuthController {
  #router;
  #authView;
  #navbarView;
  #isLoginMode = true;

  constructor(router, authView, navbarView) {
    this.#router = router;
    this.#authView = authView;
    this.#navbarView = navbarView;

    this.#initEvents();
    this.#initTheme();
  }

  #initEvents() {
    this.#authView.onSubmit((username, password) => this.#handleAuthSubmit(username, password));
    this.#authView.onSwitchMode(() => this.#toggleMode());
    this.#authView.initGoogleSignIn((credential) => this.#handleGoogleLogin(credential));

    this.#navbarView.onThemeToggle(() => this.#toggleTheme());
    this.#navbarView.onLoginClick(() => this.#router.navigate('/login'));
    this.#navbarView.onLogoutClick(() => this.logout());
  }

  #initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const activeTheme = savedTheme || systemTheme;
    document.documentElement.setAttribute('data-theme', activeTheme);
    this.#navbarView.setTheme(activeTheme);
  }

  #toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    this.#navbarView.setTheme(newTheme);
  }

  #toggleMode() {
    this.#isLoginMode = !this.#isLoginMode;
    if (this.#isLoginMode) {
      this.#router.navigate('/login');
    } else {
      this.#router.navigate('/register');
    }
  }

  setMode(isLogin) {
    this.#isLoginMode = isLogin;
    this.#authView.setMode(isLogin);
  }

  async #handleAuthSubmit(username, password) {
    if (!username || !password) {
      this.#authView.showError('Veuillez remplir tous les champs.');
      return;
    }

    const endpoint = this.#isLoginMode ? '/api/login' : '/api/register';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur de connexion');
      }

      if (this.#isLoginMode) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        if (data.isAdmin) {
          localStorage.setItem('is_admin', 'true');
        } else {
          localStorage.removeItem('is_admin');
        }
        if (data.profileImageUrl) {
          localStorage.setItem('citymaster_profile_image', data.profileImageUrl);
        }
        this.#authView.clearInputs();
        window.location.href = '/';
      } else {
        this.#authView.showError('Compte créé ! Connexion...', true);
        this.#isLoginMode = true;
        await this.#handleAuthSubmit(username, password);
      }
    } catch (err) {
      const { I18nService } = await import('../services/I18nService.js');
      const i18n = I18nService.getInstance();
      let friendlyMessage = err.message;
      if (err.name === 'TypeError' || err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('connection')) {
        friendlyMessage = i18n.t('errors.network_error');
      }
      this.#authView.showError(friendlyMessage);
    }
  }

  async #handleGoogleLogin(credential) {
    try {
      const response = await fetch('/api/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur Google Auth');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      if (data.isAdmin) {
        localStorage.setItem('is_admin', 'true');
      } else {
        localStorage.removeItem('is_admin');
      }
      if (data.profile_image_url) {
        localStorage.setItem('citymaster_profile_image', data.profile_image_url);
      }
      this.#authView.clearInputs();
      window.location.href = '/';
    } catch (err) {
      this.#authView.showError('Erreur de connexion via Google: ' + err.message);
    }
  }

  isAuthenticated() {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const profileImageUrl = localStorage.getItem('citymaster_profile_image');
    const isAdmin = localStorage.getItem('is_admin') === 'true';

    if (token && username) {
      this.#navbarView.setLoggedIn(username, profileImageUrl, isAdmin);
      return true;
    }

    this.#navbarView.setLoggedOut();
    return false;
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('is_admin');
    localStorage.removeItem('citymaster_profile_image');
    this.isAuthenticated();
    this.#router.navigate('/');
  }
}
