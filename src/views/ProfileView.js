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

  constructor() {
    this.#profileName = document.getElementById('profile-page-name');
    this.#profileImg = document.getElementById('profile-page-img');
    this.#totalScore = document.getElementById('profile-total-score');
    this.#uploadInput = document.getElementById('profile-upload');
    this.#errorMsg = document.getElementById('profile-error');
    this.#successMsg = document.getElementById('profile-success');
    this.#backBtn = document.getElementById('profile-back-btn');
    this.#themeSwitch = document.getElementById('profile-theme-switch');
    this.#soundSwitch = document.getElementById('profile-sound-switch');
    this.#logoutBtn = document.getElementById('profile-logout-btn');

    if (this.#profileImg) {
      this.#profileImg.onerror = () => {
        this.#profileImg.src = 'assets/images/default-avatar.png';
      };
    }
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
    const langSelect = document.getElementById('profile-lang-select');
    if (langSelect) {
      langSelect.addEventListener('change', (e) => {
        callback(e.target.value);
      });
    }
  }

  setLangSelect(lang) {
    const langSelect = document.getElementById('profile-lang-select');
    if (langSelect) {
      langSelect.value = lang;
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
