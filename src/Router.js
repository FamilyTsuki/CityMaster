export class Router {
  #routes;
  #currentPath;
  #beforeEachHooks = [];

  constructor(routes) {
    this.#routes = routes;
    this.#currentPath = this.#getPath();

    window.addEventListener('popstate', () => {
      this.#handleRoute(this.#getPath());
    });

    window.addEventListener('hashchange', () => {
      this.#handleRoute(this.#getPath());
    });

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

      const routeBtn = e.target.closest('.btn-back-round, .legal-footer-link, #room-login-link, #legal-back-btn');
      if (routeBtn) {
        e.preventDefault();
        if (routeBtn.id === 'legal-back-btn' || routeBtn.classList.contains('btn-back-round')) {
          this.navigate('/');
        } else if (routeBtn.classList.contains('legal-footer-link')) {
          this.navigate('/legal');
        } else if (routeBtn.id === 'room-login-link') {
          this.navigate('/login');
        }
      }
    });
  }

  #getPath() {
    if (window.location.hash && window.location.hash.startsWith('#/')) {
      return window.location.hash.replace(/^#/, '');
    }
    return window.location.pathname;
  }

  beforeEach(hook) {
    if (typeof hook === 'function') {
      this.#beforeEachHooks.push(hook);
    }
    return this;
  }

  init() {
    this.#handleRoute(this.#currentPath);
  }

  async navigate(path, force = false) {
    if (this.#currentPath === path && !force) {
      await this.#handleRoute(path);
      return;
    }
    window.history.pushState({}, '', path);
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

    let matchedRoute = this.#routes[path];
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
