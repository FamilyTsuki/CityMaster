export class I18nService {
  #currentLang;
  #translations;
  #listeners;
  static #instance = null;

  constructor() {
    if (I18nService.#instance) {
      return I18nService.#instance;
    }
    const saved = localStorage.getItem('lang');
    const browser = (navigator.language || '').toLowerCase().startsWith('en') ? 'en' : 'fr';
    this.#currentLang = saved || browser;
    this.#translations = {};
    this.#listeners = [];
    I18nService.#instance = this;
  }

  static getInstance() {
    if (!I18nService.#instance) {
      I18nService.#instance = new I18nService();
    }
    return I18nService.#instance;
  }

  get currentLang() {
    return this.#currentLang;
  }

  async init() {
    await this.#loadDictionary(this.#currentLang);
    this.translateDOM();
  }

  async setLanguage(lang) {
    if (this.#currentLang === lang && this.#translations[lang]) return;
    await this.#loadDictionary(lang);
    this.#currentLang = lang;
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    this.translateDOM();
    this.#notifyListeners();
  }

  async #loadDictionary(lang) {
    if (this.#translations[lang]) return;
    try {
      const response = await fetch(`/assets/i18n/${lang}.json?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error(`Could not load dictionary for language: ${lang}`);
      }
      this.#translations[lang] = await response.json();
    } catch (err) {
      console.warn(`Failed loading ${lang}.json fallback to fr`, err);
      if (lang !== 'fr' && !this.#translations['fr']) {
        await this.#loadDictionary('fr');
      }
    }
  }

  t(keyPath, params = {}) {
    const dict = this.#translations[this.#currentLang] || this.#translations['fr'] || {};
    const keys = keyPath.split('.');
    let result = dict;

    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return keyPath;
      }
    }

    if (typeof result !== 'string') return keyPath;

    let text = result;
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    });

    return text;
  }

  translateDOM() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translated = this.t(key);
      if (translated && translated !== key) {
        el.textContent = translated;
      }
    });

    const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    placeholders.forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const translated = this.t(key);
      if (translated && translated !== key) {
        el.placeholder = translated;
      }
    });

    const titles = document.querySelectorAll('[data-i18n-title]');
    titles.forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const translated = this.t(key);
      if (translated && translated !== key) {
        el.title = translated;
      }
    });

    const arias = document.querySelectorAll('[data-i18n-aria]');
    arias.forEach(el => {
      const key = el.getAttribute('data-i18n-aria');
      const translated = this.t(key);
      if (translated && translated !== key) {
        el.setAttribute('aria-label', translated);
      }
    });
  }

  onLanguageChange(callback) {
    this.#listeners.push(callback);
  }

  #notifyListeners() {
    this.#listeners.forEach(cb => cb(this.#currentLang));
  }
}
