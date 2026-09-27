import { I18nService } from "../services/I18nService.js";
import { ApiService } from "../services/ApiService.js";

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

  setRouter(router) {
    this.#router = router;
  }

  #initEvents() {
    this.#profileView.onBackClick(() => {
      this.#router.navigate("/");
    });

    this.#profileView.onLogoutClick(() => {
      this.logout();
    });

    this.#profileView.onAvatarChange((file) => {
      this.uploadAvatar(file);
    });

    this.#profileView.onThemeChange((isDark) => {
      const newTheme = isDark ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("theme", newTheme);
      this.#navbarView.setTheme(newTheme);
    });

    this.#profileView.onSoundChange((muted) => {
      if (this.#audioService.isMuted() !== muted) {
        this.#audioService.toggleMute();
      }
    });

    this.#profileView.onLangChange(async (lang) => {
      await I18nService.getInstance().setLanguage(lang);
    });

    this.#navbarView.onProfileClick(() => {
      this.#router.navigate("/profile");
    });
  }

  logout() {
    ApiService.clearToken();
    localStorage.removeItem("username");
    localStorage.removeItem("citymaster_profile_image");
    localStorage.removeItem("is_admin");
    this.#navbarView.setLoggedOut();
    this.#router.navigate("/");
  }

  #updateNavUser(username, profileImageUrl, isAdmin) {
    if (isAdmin) {
      localStorage.setItem("is_admin", "true");
    } else {
      localStorage.removeItem("is_admin");
    }

    if (profileImageUrl) {
      localStorage.setItem("citymaster_profile_image", profileImageUrl);
      this.#navbarView.setLoggedIn(username, profileImageUrl, isAdmin);
    } else {
      localStorage.removeItem("citymaster_profile_image");
      this.#navbarView.setLoggedIn(username, null, isAdmin);
    }
  }

  async loadProfile() {
    try {
      if (!ApiService.getToken()) {
        this.#router.navigate("/login");
        return;
      }

      const res = await ApiService.get("/profile");

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          this.logout();
          return;
        }
        throw new Error(
          res.data?.error || "Erreur lors du chargement du profil",
        );
      }

      const data = res.data;
      const isDarkMode =
        document.documentElement.getAttribute("data-theme") === "dark";
      const isSoundMuted = this.#audioService.isMuted();
      const currentLang = I18nService.getInstance().currentLang;

      this.#profileView.renderProfile(
        data.username,
        data.totalScore,
        data.profileImageUrl,
        isDarkMode,
        isSoundMuted,
        currentLang,
      );

      this.#updateNavUser(
        data.username,
        data.profileImageUrl,
        data.isAdmin === true,
      );

      this.#gameView.showScreen("profile");
    } catch (err) {
      const i18n = I18nService.getInstance();
      this.#profileView.showError(i18n.formatError(err.message));
    }
  }

  async fetchNavAvatar() {
    if (!ApiService.getToken()) return;

    try {
      const res = await ApiService.get("/profile");
      if (res.ok && res.data) {
        const data = res.data;
        const username = localStorage.getItem("username");
        this.#updateNavUser(
          username,
          data.profileImageUrl,
          data.isAdmin === true,
        );
      }
    } catch (e) {
      console.error("Error prefetching avatar", e);
    }
  }

  async uploadAvatar(file) {
    const i18n = I18nService.getInstance();

    if (file.size > 2 * 1024 * 1024) {
      this.#profileView.showError(i18n.t("errors.file_too_large"));
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    if (!ApiService.getToken()) return;

    try {
      this.#profileView.showSuccess(i18n.t("loading.loading_streets"));

      const res = await ApiService.post("/profile/upload", formData);

      if (res.status === 401 || res.status === 403) {
        this.logout();
        this.#profileView.showError(i18n.t("errors.session_expired"));
        return;
      }

      if (!res.ok) {
        throw new Error(res.data?.error);
      }

      const data = res.data;
      this.#profileView.showSuccess(data.message || i18n.t("profile.title"));
      if (data.profileImageUrl) {
        localStorage.setItem("citymaster_profile_image", data.profileImageUrl);
        const username = localStorage.getItem("username");
        this.#profileView.renderProfile(
          username,
          document.getElementById("profile-total-score").textContent,
          data.profileImageUrl,
          document.documentElement.getAttribute("data-theme") === "dark",
          this.#audioService.isMuted(),
        );
        this.#navbarView.setLoggedIn(username, data.profileImageUrl);
      }
    } catch (err) {
      this.#profileView.showError(i18n.formatError(err.message));
    }
  }
}
