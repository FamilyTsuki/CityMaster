export class ProfileController {
  #router;
  #profileView;
  #navbarView;
  #gameView;
  #audioService;

  constructor(router, profileView, navbarView, gameView, audioService) {
    this.#router = router;
    this.#profileView = profileView;
    this.#navbarView = navbarView;
    this.#gameView = gameView;
    this.#audioService = audioService;

    this.#initEvents();
  }

  #initEvents() {
    this.#profileView.onBackClick(() => {
      this.#router.navigate('/');
    });

    this.#profileView.onLogoutClick(() => {
      this.logout();
    });

    this.#profileView.onAvatarChange((file) => {
      this.uploadAvatar(file);
    });

    this.#profileView.onThemeChange((isDark) => {
      const newTheme = isDark ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      this.#navbarView.setTheme(newTheme);
    });

    this.#profileView.onSoundChange((muted) => {
      if (this.#audioService.isMuted() !== muted) {
        this.#audioService.toggleMute();
      }
    });

    this.#profileView.onLangChange(async (lang) => {
      const { I18nService } = await import('../services/I18nService.js');
      await I18nService.getInstance().setLanguage(lang);
    });

    this.#navbarView.onProfileClick(() => {
      this.#router.navigate('/profile');
    });
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('citymaster_profile_image');
    this.#navbarView.setLoggedOut();
    this.#router.navigate('/');
  }

  async loadProfile() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        this.#router.navigate('/login');
        return;
      }

      const response = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          this.logout();
          return;
        }
        throw new Error('Erreur lors du chargement du profil');
      }

      const data = await response.json();
      const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
      const isSoundMuted = this.#audioService.isMuted();
      const { I18nService } = await import('../services/I18nService.js');
      const currentLang = I18nService.getInstance().currentLang;
      
      this.#profileView.renderProfile(
        data.username,
        data.totalScore,
        data.profileImageUrl,
        isDarkMode,
        isSoundMuted,
        currentLang
      );

      if (data.profileImageUrl) {
        localStorage.setItem('citymaster_profile_image', data.profileImageUrl);
        this.#navbarView.setLoggedIn(data.username, data.profileImageUrl);
      } else {
        localStorage.removeItem('citymaster_profile_image');
        this.#navbarView.setLoggedIn(data.username, null);
      }

      this.#gameView.showScreen('profile');
    } catch (err) {
      const i18n = I18nService.getInstance();
      this.#profileView.showError(i18n.formatError(err.message));
    }
  }

  async fetchNavAvatar() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const username = localStorage.getItem('username');
        if (data.profileImageUrl) {
          localStorage.setItem('citymaster_profile_image', data.profileImageUrl);
          this.#navbarView.setLoggedIn(username, data.profileImageUrl);
        } else {
          localStorage.removeItem('citymaster_profile_image');
          this.#navbarView.setLoggedIn(username, null);
        }
      } else if (response.status === 401 || response.status === 403) {
        this.logout();
      }
    } catch (e) {
      console.error('Erreur prefetch avatar', e);
    }
  }

  async uploadAvatar(file) {
    const i18n = I18nService.getInstance();

    if (file.size > 2 * 1024 * 1024) {
      this.#profileView.showError(i18n.t('errors.file_too_large'));
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      this.#profileView.showSuccess(i18n.t('loading.loading_streets'));

      const response = await fetch('/api/profile/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.status === 401 || response.status === 403) {
        this.logout();
        this.#profileView.showError(i18n.t('errors.session_expired'));
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      this.#profileView.showSuccess(data.message || i18n.t('profile.title'));
      if (data.profileImageUrl) {
        localStorage.setItem('citymaster_profile_image', data.profileImageUrl);
        const username = localStorage.getItem('username');
        this.#profileView.renderProfile(
          username,
          document.getElementById('profile-total-score').textContent,
          data.profileImageUrl,
          document.documentElement.getAttribute('data-theme') === 'dark',
          this.#audioService.isMuted()
        );
        this.#navbarView.setLoggedIn(username, data.profileImageUrl);
      }
    } catch (err) {
      this.#profileView.showError(i18n.formatError(err.message));
    }
  }
}
