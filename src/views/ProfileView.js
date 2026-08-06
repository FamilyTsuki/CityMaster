export class ProfileView {
  #profileName;
  #profileImg;
  #totalScore;
  #uploadInput;
  #errorMsg;
  #successMsg;
  #backBtn;
  #themeSwitch;
  #soundSwitch;
  #logoutBtn;

  #langTrigger;
  #langDropdown;
  #langCurrent;
  #langSelectInput;

  constructor() {
    this.#profileName = document.getElementById('profile-page-name');
    this.#profileImg = document.getElementById('profile-page-img');
    this.#totalScore = document.getElementById('profile-total-score');
    this.#uploadInput = document.getElementById('profile-upload');
    this.#errorMsg = document.getElementById('profile-error');
    this.#successMsg = document.getElementById('profile-success');
    this.#backBtn = document.getElementById('profile-back-arrow-btn');
    this.#themeSwitch = document.getElementById('profile-theme-switch');
    this.#soundSwitch = document.getElementById('profile-sound-switch');
    this.#logoutBtn = document.getElementById('profile-logout-btn');

    this.#langTrigger = document.getElementById('profile-lang-trigger');
    this.#langDropdown = document.getElementById('profile-lang-dropdown');
    this.#langCurrent = document.getElementById('profile-lang-current');
    this.#langSelectInput = document.getElementById('profile-lang-select');

    if (this.#profileImg) {
      this.#profileImg.onerror = () => {
        this.#profileImg.src = 'assets/images/default-avatar.png';
      };
    }

    this.#initCustomLangDropdown();
    this.#initThemeObserver();
  }

  #initThemeObserver() {
    if (!this.#themeSwitch) return;

    const syncThemeSwitch = () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      this.#themeSwitch.checked = isDark;
    };

    syncThemeSwitch();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          syncThemeSwitch();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  }

  #initCustomLangDropdown() {
    if (!this.#langTrigger || !this.#langDropdown) return;

    const closeDropdown = () => {
      this.#langDropdown.classList.add('hidden');
      this.#langTrigger.classList.remove('active');
      this.#langTrigger.setAttribute('aria-expanded', 'false');
    };

    const toggleDropdown = (e) => {
      e.stopPropagation();
      const isHidden = this.#langDropdown.classList.contains('hidden');
      if (isHidden) {
        this.#langDropdown.classList.remove('hidden');
        this.#langTrigger.classList.add('active');
        this.#langTrigger.setAttribute('aria-expanded', 'true');
      } else {
        closeDropdown();
      }
    };

    this.#langTrigger.addEventListener('click', toggleDropdown);

    const items = this.#langDropdown.querySelectorAll('.custom-select-item');
    items.forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const value = item.getAttribute('data-value');
        this.setLangSelect(value);
        closeDropdown();

        if (this.#langSelectInput) {
          const event = new Event('change', { bubbles: true });
          this.#langSelectInput.dispatchEvent(event);
        }
      });
    });

    document.addEventListener('click', (e) => {
      if (!this.#langTrigger.contains(e.target) && !this.#langDropdown.contains(e.target)) {
        closeDropdown();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeDropdown();
      }
    });
  }

  onBackClick(callback) {
    if (this.#backBtn) {
      this.#backBtn.addEventListener('click', callback);
    }
  }

  onLogoutClick(callback) {
    if (this.#logoutBtn) {
      this.#logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        callback();
      });
    }
  }

  onAvatarChange(callback) {
    if (this.#uploadInput) {
      this.#uploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          callback(file);
        }
      });
    }
  }

  onThemeChange(callback) {
    if (this.#themeSwitch) {
      this.#themeSwitch.addEventListener('change', () => {
        callback(this.#themeSwitch.checked);
      });
    }
  }

  onSoundChange(callback) {
    if (this.#soundSwitch) {
      this.#soundSwitch.addEventListener('change', () => {
        callback(!this.#soundSwitch.checked);
      });
    }
  }

  onLangChange(callback) {
    if (this.#langSelectInput) {
      this.#langSelectInput.addEventListener('change', (e) => {
        callback(e.target.value);
      });
    }
  }

  setLangSelect(lang) {
    if (this.#langSelectInput) {
      this.#langSelectInput.value = lang;
    }

    if (this.#langDropdown && this.#langCurrent) {
      const items = this.#langDropdown.querySelectorAll('.custom-select-item');
      items.forEach((item) => {
        const itemVal = item.getAttribute('data-value');
        if (itemVal === lang) {
          item.classList.add('selected');
          this.#langCurrent.textContent = item.textContent.trim();
        } else {
          item.classList.remove('selected');
        }
      });
    }
  }

  renderProfile(username, totalScore, profileImageUrl, isDarkMode, isSoundMuted = false, currentLang = 'fr') {
    if (this.#profileName) {
      this.#profileName.textContent = username;
    }
    if (this.#totalScore) {
      this.#totalScore.textContent = totalScore;
    }
    if (this.#profileImg) {
      if (profileImageUrl) {
        this.#profileImg.src = profileImageUrl;
      } else {
        this.#profileImg.src = 'assets/images/default-avatar.png';
      }
    }
    if (this.#themeSwitch) {
      this.#themeSwitch.checked = isDarkMode;
    }
    if (this.#soundSwitch) {
      this.#soundSwitch.checked = !isSoundMuted;
    }
    this.setLangSelect(currentLang);
  }

  showError(message) {
    if (this.#successMsg) {
      this.#successMsg.classList.add('hidden');
    }
    if (this.#errorMsg) {
      this.#errorMsg.textContent = message;
      this.#errorMsg.classList.remove('hidden');
    }
  }

  showSuccess(message) {
    if (this.#errorMsg) {
      this.#errorMsg.classList.add('hidden');
    }
    if (this.#successMsg) {
      this.#successMsg.textContent = message;
      this.#successMsg.classList.remove('hidden');
    }
  }
}
