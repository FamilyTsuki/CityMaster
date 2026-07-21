export class NavbarView {
  #themeToggle;
  #navAuthLoggedOut;
  #navAuthLoggedIn;
  #navLogoutBtn;
  #navProfileLink;
  #navProfileImg;
  #navProfileName;
  #logoBrand;

  constructor() {
    this.#themeToggle = document.getElementById('theme-toggle');
    this.#navAuthLoggedOut = document.getElementById('nav-auth-logged-out');
    this.#navAuthLoggedIn = document.getElementById('nav-auth-logged-in');
    this.#navLogoutBtn = document.getElementById('nav-logout-btn');
    this.#navProfileLink = document.getElementById('nav-profile-link');
    this.#navProfileImg = document.getElementById('nav-profile-img');
    this.#navProfileName = document.getElementById('nav-profile-name');
    this.#logoBrand = document.getElementById('logo-brand');

    if (this.#navProfileImg) {
      this.#navProfileImg.onerror = () => {
        this.#navProfileImg.src = 'assets/images/default-avatar.png';
      };
    }
  }

  onThemeToggle(callback) {
    if (this.#themeToggle) {
      this.#themeToggle.addEventListener('click', callback);
    }
  }

  onLoginClick(callback) {
    const navLoginBtn = document.getElementById('nav-login-btn');
    if (navLoginBtn) {
      navLoginBtn.addEventListener('click', callback);
    }
  }

  onLogoutClick(callback) {
    if (this.#navLogoutBtn) {
      this.#navLogoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        callback();
      });
    }
  }

  onProfileClick(callback) {
    if (this.#navProfileLink) {
      this.#navProfileLink.addEventListener('click', (e) => {
        e.preventDefault();
        callback();
      });
    }
  }

  onLogoClick(callback) {
    if (this.#logoBrand) {
      this.#logoBrand.addEventListener('click', (e) => {
        e.preventDefault();
        callback();
      });
    }
  }

  setLoggedIn(username, profileImageUrl) {
    if (this.#navAuthLoggedOut) {
      this.#navAuthLoggedOut.classList.add('hidden');
    }
    if (this.#navAuthLoggedIn) {
      this.#navAuthLoggedIn.classList.remove('hidden');
    }
    if (this.#navProfileName) {
      this.#navProfileName.textContent = username;
    }
    if (this.#navProfileImg) {
      if (profileImageUrl) {
        this.#navProfileImg.src = profileImageUrl;
      } else {
        this.#navProfileImg.src = 'assets/images/default-avatar.png';
      }
      this.#navProfileImg.classList.remove('hidden');
    }
  }

  setLoggedOut() {
    if (this.#navAuthLoggedIn) {
      this.#navAuthLoggedIn.classList.add('hidden');
    }
    if (this.#navAuthLoggedOut) {
      this.#navAuthLoggedOut.classList.remove('hidden');
    }
    if (this.#navProfileImg) {
      this.#navProfileImg.classList.add('hidden');
    }
  }

  setTheme(theme) {
    if (!this.#themeToggle) return;

    const sunSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="theme-icon-svg"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    const moonSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="theme-icon-svg"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

    this.#themeToggle.innerHTML = theme === 'dark' ? sunSvg : moonSvg;
  }
}
