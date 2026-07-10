export class Router {
  #routes;
  #currentPath;

  constructor(routes) {
    this.#routes = routes;
    this.#currentPath = window.location.pathname;

    window.addEventListener('popstate', () => {
      this.#handleRoute(window.location.pathname);
    });
  }

  init() {
    this.#handleRoute(this.#currentPath);
  }

  navigate(path) {
    if (this.#currentPath === path) return;
    this.#currentPath = path;
    window.history.pushState({}, '', path);
    this.#handleRoute(path);
  }

  #handleRoute(path) {
    let matchedRoute = this.#routes[path];
    
    if (!matchedRoute) {
      matchedRoute = this.#routes['/'];
      if (!matchedRoute) return;
    }

    matchedRoute();
  }
}
