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
      let friendlyMessage = err.message;
      if (err.name === 'TypeError' || err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('connection')) {
        friendlyMessage = 'Impossible de contacter le serveur. Veuillez vérifier que le serveur est démarré et réessayez.';
      }
      this.#authView.showError(friendlyMessage);
    }
  }

  isAuthenticated() {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const profileImageUrl = localStorage.getItem('citymaster_profile_image');

    if (token && username) {
      this.#navbarView.setLoggedIn(username, profileImageUrl);
      return true;
    }

    this.#navbarView.setLoggedOut();
    return false;
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('citymaster_profile_image');
    this.isAuthenticated();
    this.#router.navigate('/');
  }
}
