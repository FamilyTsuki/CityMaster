export class ProfileController {
  #router;
  #profileScreen;
  #profileName;
  #profileImg;
  #totalScore;
  #uploadInput;
  #errorMsg;
  #successMsg;
  #backBtn;
  
  #navProfileImg;
  #navProfileLink;

  constructor(router) {
    this.#router = router;
    
    this.#profileScreen = document.getElementById('profile-screen');
    this.#profileName = document.getElementById('profile-page-name');
    this.#profileImg = document.getElementById('profile-page-img');
    this.#totalScore = document.getElementById('profile-total-score');
    this.#uploadInput = document.getElementById('profile-upload');
    this.#errorMsg = document.getElementById('profile-error');
    this.#successMsg = document.getElementById('profile-success');
    this.#backBtn = document.getElementById('profile-back-btn');

    this.#navProfileImg = document.getElementById('nav-profile-img');
    this.#navProfileLink = document.getElementById('nav-profile-link');

    this._initEvents();
  }

  _initEvents() {
    this.#backBtn.addEventListener('click', () => {
      this.#router.navigate('/');
    });

    this.#navProfileLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.#router.navigate('/profile');
    });

    this.#uploadInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.uploadAvatar(file);
      }
    });
  }

  showError(msg) {
    this.#successMsg.classList.add('hidden');
    this.#errorMsg.textContent = msg;
    this.#errorMsg.classList.remove('hidden');
  }

  showSuccess(msg) {
    this.#errorMsg.classList.add('hidden');
    this.#successMsg.textContent = msg;
    this.#successMsg.classList.remove('hidden');
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
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('username');
          this.#router.navigate('/login');
          return;
        }
        throw new Error('Erreur lors du chargement du profil');
      }

      const data = await response.json();
      
      this.#profileName.textContent = data.username;
      this.#totalScore.textContent = data.totalScore;
      
      if (data.profileImageUrl) {
        this.#profileImg.src = data.profileImageUrl;
        this.#navProfileImg.src = data.profileImageUrl;
        this.#navProfileImg.classList.remove('hidden');
      }

      // Cacher les autres écrans et afficher le profil
      document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
      this.#profileScreen.style.display = 'flex';

    } catch (err) {
      this.showError(err.message);
    }
  }

  // Utilisé par App.js pour précharger l'avatar au lancement
  async fetchNavAvatar() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.profileImageUrl) {
          this.#navProfileImg.src = data.profileImageUrl;
          this.#navProfileImg.classList.remove('hidden');
        }
      }
    } catch (e) {
      console.error('Erreur prefetch avatar', e);
    }
  }

  async uploadAvatar(file) {
    if (file.size > 2 * 1024 * 1024) {
      this.showError("L'image est trop lourde (max 2 Mo).");
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      this.showSuccess('Envoi en cours...');
      this.#errorMsg.classList.add('hidden');

      const response = await fetch('/api/profile/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du téléversement');
      }

      this.showSuccess(data.message);
      if (data.profileImageUrl) {
        this.#profileImg.src = data.profileImageUrl;
        this.#navProfileImg.src = data.profileImageUrl;
        this.#navProfileImg.classList.remove('hidden');
      }
    } catch (err) {
      this.showError(err.message);
    } finally {
      this.#uploadInput.value = '';
    }
  }
}
