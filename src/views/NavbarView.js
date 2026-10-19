import { I18nService } from '../services/I18nService.js';

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
  #navBurgerBtn;
  #navbarActions;
  #menuThemeToggle;
  #menuThemeText;
  #currentTheme = 'light';

  constructor() {
    this.#themeToggle = document.getElementById('theme-toggle');
    this.#menuThemeToggle = document.getElementById('menu-theme-toggle');
    this.#menuThemeText = document.getElementById('menu-theme-text');
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
    this.#navBurgerBtn = document.getElementById('nav-burger-btn');
    this.#navbarActions = document.getElementById('navbar-actions');

    if (this.#navProfileImg) {
      this.#navProfileImg.onerror = () => {
        this.#navProfileImg.src = '/assets/images/default-avatar.png';
      };
    }

    this.#initBurgerMenu();
    this.#initSpaceObserver();
    I18nService.getInstance().onLanguageChange(() => {
      if (this.#currentTheme) {
        this.setTheme(this.#currentTheme);
      }
    });
  }

  #initBurgerMenu() {
    if (!this.#navBurgerBtn || !this.#navbarActions) return;

    this.#navBurgerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = this.#navbarActions.classList.toggle('open');
      this.#navBurgerBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      this.#navBurgerBtn.classList.toggle('active', isOpen);
    });

    document.addEventListener('click', (e) => {
      const nav = document.getElementById('main-nav');
      if (nav && !nav.contains(e.target) && this.#navbarActions.classList.contains('open')) {
        this.closeMobileMenu();
      }
    });

    this.#navbarActions.addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.closest('a')) {
        this.closeMobileMenu();
      }
    });
  }

  closeMobileMenu() {
    if (this.#navbarActions && this.#navbarActions.classList.contains('open')) {
      this.#navbarActions.classList.remove('open');
      if (this.#navBurgerBtn) {
        this.#navBurgerBtn.setAttribute('aria-expanded', 'false');
        this.#navBurgerBtn.classList.remove('active');
      }
    }
  }

  #initSpaceObserver() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const nav = document.getElementById('main-nav');
    if (!nav) return;

    const checkSpace = () => {
      const brand = nav.querySelector('.navbar-brand');
      const actions = nav.querySelector('.navbar-header-actions');
      if (!brand || !actions) return;

      const navStyles = window.getComputedStyle(nav);
      const paddingLeft = parseFloat(navStyles.paddingLeft) || 0;
      const paddingRight = parseFloat(navStyles.paddingRight) || 0;
      const availableWidth = nav.clientWidth - paddingLeft - paddingRight;

      if (availableWidth <= 0) return;

      const themeToggleWidth = 44;
      const isCompact = nav.classList.contains('nav-compact');
      const brandWidth = brand.scrollWidth;
      const actionsWidth =
        actions.scrollWidth + (isCompact ? themeToggleWidth : 0);
      const minGap = 12;

      const isMobile = window.innerWidth <= 540;
      const lacksSpace =
        isMobile || brandWidth + actionsWidth + minGap > availableWidth;

      if (lacksSpace) {
        nav.classList.add('nav-compact');
      } else {
        nav.classList.remove('nav-compact');
      }
    };

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => checkSpace());
      ro.observe(nav);
      const brand = nav.querySelector('.navbar-brand');
      if (brand) ro.observe(brand);
    } else {
      window.addEventListener('resize', checkSpace);
    }

    setTimeout(checkSpace, 50);
  }

  onThemeToggle(callback) {
    const handleToggle = (btn, e) => {
      const isBurgerVisible =
        this.#navBurgerBtn &&
        window.getComputedStyle(this.#navBurgerBtn).display !== 'none';
      if (!isBurgerVisible && btn) {
        btn.classList.remove('rotate-spin');
        void btn.offsetWidth;
        btn.classList.add('rotate-spin');
        setTimeout(() => {
          callback(e);
        }, 250);
      } else {
        callback(e);
      }
    };

    if (this.#themeToggle) {
      this.#themeToggle.addEventListener('click', (e) =>
        handleToggle(this.#themeToggle, e),
      );
    }
    if (this.#menuThemeToggle) {
      this.#menuThemeToggle.addEventListener('click', (e) =>
        handleToggle(this.#menuThemeToggle, e),
      );
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

  onAdminClick(callback) {
    if (this.#navAdminLink) {
      this.#navAdminLink.addEventListener('click', (e) => {
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
    if (this.#navAdminLink) {
      this.#navAdminLink.classList.add('hidden');
    }
    if (this.#navProfileImg) {
      this.#navProfileImg.classList.add('hidden');
    }
  }

  setTheme(theme) {
    const createThemeSvg = () => {
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
          [12, 1, 12, 3],
          [12, 21, 12, 23],
          [4.22, 4.22, 5.64, 5.64],
          [18.36, 18.36, 19.78, 19.78],
          [1, 12, 3, 12],
          [21, 12, 23, 12],
          [4.22, 19.78, 5.64, 18.36],
          [18.36, 5.64, 19.78, 4.22],
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
      return svg;
    };

    this.#currentTheme = theme;
    const i18n = I18nService.getInstance();
    const label =
      theme === 'dark'
        ? i18n.t('nav.switch_to_light', {}, 'Passer en mode clair')
        : i18n.t('nav.switch_to_dark', {}, 'Passer en mode sombre');

    if (this.#themeToggle) {
      this.#themeToggle.replaceChildren(createThemeSvg());
      this.#themeToggle.setAttribute('title', label);
      this.#themeToggle.setAttribute('aria-label', label);
    }

    if (this.#menuThemeToggle) {
      this.#menuThemeToggle.replaceChildren();
      this.#menuThemeToggle.appendChild(createThemeSvg());
      const labelText = document.createElement('span');
      labelText.id = 'menu-theme-text';
      labelText.className = 'menu-theme-text';
      labelText.setAttribute('data-i18n', theme === 'dark' ? 'nav.light_mode' : 'nav.dark_mode');
      labelText.textContent =
        theme === 'dark'
          ? i18n.t('nav.light_mode', {}, 'Mode clair')
          : i18n.t('nav.dark_mode', {}, 'Mode sombre');
      this.#menuThemeToggle.appendChild(labelText);
      this.#menuThemeText = labelText;
      this.#menuThemeToggle.setAttribute('title', label);
      this.#menuThemeToggle.setAttribute('aria-label', label);
    }
  }
}
