export class Router {
  #routes;
  #currentPath;
  #beforeEachHooks = [];

  constructor(routes) {
    this.#routes = routes;
    this.#currentPath = null;

    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', () => {
        this.#handleRoute(this.#getPath());
      });

      window.addEventListener('hashchange', () => {
        this.#handleRoute(this.#getPath());
      });
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link) {
          const href = link.getAttribute('href');
          if (href && (href.startsWith('/') || href.startsWith('#/'))) {
            e.preventDefault();
            const cleanPath = href.replace(/^#/, '');
            this.navigate(cleanPath);
          }
        }

        const routeBtn = e.target.closest(
          '.btn-back-round, .legal-footer-link, .support-footer-link, #room-login-link, #legal-back-btn, #support-back-btn, #support-footer-back-btn, #moderation-back-btn',
        );
        if (routeBtn) {
          e.preventDefault();
          if (routeBtn.id === 'moderation-back-btn') {
            this.navigate('/support');
          } else if (
            routeBtn.id === 'legal-back-btn' ||
            routeBtn.id === 'support-back-btn' ||
            routeBtn.id === 'support-footer-back-btn' ||
            routeBtn.classList.contains('btn-back-round')
          ) {
            this.navigate('/');
          } else if (routeBtn.classList.contains('legal-footer-link')) {
            this.navigate('/legal');
          } else if (routeBtn.classList.contains('support-footer-link')) {
            this.navigate('/support');
          } else if (routeBtn.id === 'room-login-link') {
            this.navigate('/login');
          }
        }
      });
    }
  }

  #getPath() {
    if (typeof window !== 'undefined') {
      if (window.location.hash) {
        const cleanHash = window.location.hash.replace(/^#\/?/, '/');
        if (cleanHash && cleanHash !== '/') {
          return cleanHash;
        }
      }
      return window.location.pathname;
    }
    return '/';
  }

  beforeEach(hook) {
    if (typeof hook === 'function') {
      this.#beforeEachHooks.push(hook);
    }
    return this;
  }

  /**
   * Chemin de la route actuellement affichée.
   * @returns {string|null}
   */
  get currentPath() {
    return this.#currentPath;
  }

  init() {
    return this.#handleRoute(this.#getPath());
  }

  /**
   * Affiche la route `path` et met l'URL à jour (sans entrée d'historique
   * supplémentaire si l'URL ne change pas).
   * @param {string} path
   */
  async navigate(path) {
    if (typeof window !== 'undefined' && window.history && this.#getPath() !== path) {
      window.history.pushState({}, '', path);
    }
    await this.#handleRoute(path);
  }

  async #handleRoute(path) {
    const fromPath = this.#currentPath;
    for (const hook of this.#beforeEachHooks) {
      try {
        const canContinue = await hook(path, fromPath);
        if (canContinue === false) return;
      } catch (err) {
        console.error('Error in router beforeEach hook:', err);
      }
    }
    this.#currentPath = path;
    const normalizedPath =
      path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
    let matchedRoute = this.#routes[path] || this.#routes[normalizedPath];
    if (matchedRoute) {
      await matchedRoute({});
      return;
    }

    for (const routePattern of Object.keys(this.#routes)) {
      if (routePattern.includes('/:')) {
        const regexPattern = '^' + routePattern.replace(/\/:[^/]+/g, '/([^/]+)') + '/?$';
        const match = path.match(new RegExp(regexPattern));
        if (match) {
          const paramNames = [...routePattern.matchAll(/:([^/]+)/g)].map(m => m[1]);
          const params = {};
          paramNames.forEach((name, idx) => {
            params[name] = match[idx + 1];
          });
          
          await this.#routes[routePattern](params);
          return;
        }
      }
    }

    matchedRoute = this.#routes['/'];
    if (matchedRoute) {
      await matchedRoute({});
    }
  }
}
