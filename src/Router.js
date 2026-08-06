export class Router {
  #routes;
  #currentPath;

  constructor(routes) {
    this.#routes = routes;
    this.#currentPath = this.#getPath();

    window.addEventListener('popstate', () => {
      this.#currentPath = this.#getPath();
      this.#handleRoute(this.#currentPath);
    });

    window.addEventListener('hashchange', () => {
      this.#currentPath = this.#getPath();
      this.#handleRoute(this.#currentPath);
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
    });
  }

  #getPath() {
    if (window.location.hash && window.location.hash.startsWith('#/')) {
      return window.location.hash.replace(/^#/, '');
    }
    return window.location.pathname;
  }

  init() {
    this.#handleRoute(this.#currentPath);
  }

  navigate(path, force = false) {
    if (this.#currentPath === path && !force) {
      this.#handleRoute(path);
      return;
    }
    this.#currentPath = path;
    window.history.pushState({}, '', path);
    this.#handleRoute(path);
  }

  #handleRoute(path) {
    let matchedRoute = this.#routes[path];
    if (matchedRoute) {
      matchedRoute({});
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
          
          this.#routes[routePattern](params);
          return;
        }
      }
    }

    matchedRoute = this.#routes['/'];
    if (matchedRoute) {
      matchedRoute({});
    }
  }
}
