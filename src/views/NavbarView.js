export class NavbarView {
  #themeToggle;
  #langToggle;
  #langFlag;
  #navAuthLoggedOut;
  #navAuthLoggedIn;
  #navLogoutBtn;
  #navProfileLink;
  #navProfileImg;
  #navProfileName;
  #logoBrand;
  #navAdminLink;

  constructor() {
    this.#themeToggle = document.getElementById('theme-toggle');
    this.#langToggle = document.getElementById('lang-toggle');
    this.#langFlag = document.getElementById('lang-flag');
    this.#navAuthLoggedOut = document.getElementById('nav-auth-logged-out');
    this.#navAuthLoggedIn = document.getElementById('nav-auth-logged-in');
    this.#navLogoutBtn = document.getElementById('nav-logout-btn');
    this.#navProfileLink = document.getElementById('nav-profile-link');
    this.#navProfileImg = document.getElementById('nav-profile-img');
    this.#navProfileName = document.getElementById('nav-profile-name');
    this.#logoBrand = document.getElementById('logo-brand');
    this.#navAdminLink = document.getElementById('nav-admin-link');

    if (this.#navProfileImg) {
      this.#navProfileImg.onerror = () => {
        this.#navProfileImg.src = '/assets/images/default-avatar.png';
      };
    }
  }

  onThemeToggle(callback) {
    if (this.#themeToggle) {
      this.#themeToggle.addEventListener('click', callback);
    }
  }

  onLangToggle(callback) {
    if (this.#langToggle) {
      this.#langToggle.addEventListener('click', callback);
    }
  }

  setLangFlag(lang) {
    if (this.#langFlag) {
      this.#langFlag.textContent = lang === 'en' ? '🇬🇧' : '🇫🇷';
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

  setLoggedIn(username, profileImageUrl = null, isAdmin = false) {
    if (this.#navAuthLoggedOut) this.#navAuthLoggedOut.classList.add('hidden');
    if (this.#navAuthLoggedIn) {
      this.#navAuthLoggedIn.classList.remove('hidden');
    }
    
    if (this.#navAdminLink) {
      if (isAdmin) {
        this.#navAdminLink.classList.remove('hidden');
      } else {
        this.#navAdminLink.classList.add('hidden');
      }
    }

    if (this.#navProfileName) this.#navProfileName.textContent = username;
    if (this.#navProfileImg) {
      if (profileImageUrl) {
        this.#navProfileImg.src = profileImageUrl;
      } else {
        this.#navProfileImg.src = '/assets/images/default-avatar.png';
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

    this.#themeToggle.replaceChildren();

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('class', 'theme-icon-svg');

    if (theme === 'dark') {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '12');
      circle.setAttribute('cy', '12');
      circle.setAttribute('r', '5');
      svg.appendChild(circle);

      const linesCoords = [
        [12, 1, 12, 3], [12, 21, 12, 23],
        [4.22, 4.22, 5.64, 5.64], [18.36, 18.36, 19.78, 19.78],
        [1, 12, 3, 12], [21, 12, 23, 12],
        [4.22, 19.78, 5.64, 18.36], [18.36, 5.64, 19.78, 4.22]
      ];

      linesCoords.forEach(([x1, y1, x2, y2]) => {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        svg.appendChild(line);
      });
    } else {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z');
      svg.appendChild(path);
    }

    this.#themeToggle.appendChild(svg);
  }
}
