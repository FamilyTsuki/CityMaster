export class NavbarView {
  #themeToggle;
  #soundToggle;
  #navAuthLoggedOut;
  #navAuthLoggedIn;
  #navLogoutBtn;
  #navProfileLink;
  #navProfileImg;
  #navProfileName;
  #logoBrand;

  constructor() {
    this.#themeToggle = document.getElementById('theme-toggle');
    this.#soundToggle = document.getElementById('sound-toggle');
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

  onSoundToggle(callback) {
    if (this.#soundToggle) {
      this.#soundToggle.addEventListener('click', callback);
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

  setSoundState(muted) {
    if (!this.#soundToggle) return;

    const soundOnSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="theme-icon-svg"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
    const soundOffSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="theme-icon-svg"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;

    this.#soundToggle.innerHTML = muted ? soundOffSvg : soundOnSvg;
  }
}
