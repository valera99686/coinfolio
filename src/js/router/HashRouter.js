/**
 * A small router on location.hash, no libraries: "#/item/btc" is matched against the patterns of the routes
 * ("/item/:id"), the captured parts are passed to the handler. An unknown address goes to notFound.
 * The hash never reaches the server, so it also works on a static host such as GitHub Pages.
 */
export class HashRouter {
  /**
   * @param {{ path: string, handler: (...params: string[]) => void }[]} routes
   * @param {object} [options]
   * @param {(path: string) => void} [options.notFound]
   * @param {string} [options.fallback]  where an empty hash goes ("/list")
   */
  constructor(routes, { notFound, fallback = "/list" } = {}) {
    this.routes = routes.map(({ path, handler }) => ({
      handler,
      pattern: new RegExp(`^${path.replace(/:\w+/g, "([^/]+)")}$`),
    }));
    this.notFound = notFound;
    this.fallback = fallback;
    window.addEventListener("hashchange", () => this.resolve());
  }

  get path() {
    return window.location.hash.replace(/^#/, "").split("?")[0] || this.fallback;
  }

  start() {
    this.resolve();
    return this;
  }

  resolve() {
    const path = this.path;
    for (const route of this.routes) {
      const match = path.match(route.pattern);
      if (match) {
        return route.handler(...match.slice(1).map(decodeURIComponent));
      }
    }
    return this.notFound?.(path);
  }

  navigate(path) {
    window.location.hash = path;
  }
}
