/**
 * Centralized API client service.
 * Handles base URLs, JWT authentication headers, JSON encoding/decoding,
 * and standard HTTP methods (GET, POST, PUT, PATCH, DELETE).
 */
export class ApiService {
  static #tokenKey = "token";

  /**
   * Retrieves the current JWT authentication token.
   * @returns {string|null}
   */
  static getToken() {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(this.#tokenKey);
  }

  /**
   * Sets or removes the JWT authentication token.
   * @param {string|null} token
   */
  static setToken(token) {
    if (typeof localStorage === "undefined") return;
    if (token) {
      localStorage.setItem(this.#tokenKey, token);
    } else {
      localStorage.removeItem(this.#tokenKey);
    }
  }

  /**
   * Clears the current authentication token.
   */
  static clearToken() {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(this.#tokenKey);
  }

  /**
   * Builds request headers including Authorization if token is present.
   * @param {Record<string, string>} customHeaders
   * @param {boolean} includeAuth
   * @returns {Record<string, string>}
   */
  static getHeaders(customHeaders = {}, includeAuth = true) {
    const headers = { ...customHeaders };
    if (includeAuth) {
      const token = this.getToken();
      if (token && !headers["Authorization"]) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  /**
   * Normalizes the endpoint URL to ensure the `/api` prefix.
   * @param {string} endpoint
   * @returns {string}
   */
  static formatEndpoint(endpoint) {
    if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
      return endpoint;
    }
    if (endpoint.startsWith("/assets/")) {
      return endpoint;
    }
    if (!endpoint.startsWith("/")) {
      return `/api/${endpoint}`;
    }
    if (
      !endpoint.startsWith("/api/") &&
      !endpoint.startsWith("/api?") &&
      endpoint !== "/api"
    ) {
      return `/api${endpoint}`;
    }
    return endpoint;
  }

  /**
   * Dispatches a fetch request with automatic headers and JSON body serialization.
   * @param {string} endpoint
   * @param {RequestInit & { includeAuth?: boolean, body?: any }} options
   * @returns {Promise<{ ok: boolean, status: number, data: any, response: Response|null, error?: string }>}
   */
  static async request(endpoint, options = {}) {
    const url = this.formatEndpoint(endpoint);
    const method = (options.method || "GET").toUpperCase();
    const headers = this.getHeaders(
      options.headers || {},
      options.includeAuth !== false,
    );

    const config = {
      ...options,
      method,
      headers,
    };

    if (options.body !== undefined && options.body !== null) {
      if (
        typeof options.body === "object" &&
        !(options.body instanceof FormData)
      ) {
        if (!headers["Content-Type"]) {
          headers["Content-Type"] = "application/json";
        }
        config.body = JSON.stringify(options.body);
      } else {
        config.body = options.body;
      }
    }

    try {
      const res = await fetch(url, config);

      let data = null;
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        try {
          data = await res.json();
        } catch {
          data = null;
        }
      } else {
        try {
          data = await res.text();
        } catch {
          data = null;
        }
      }

      return {
        ok: res.ok,
        status: res.status,
        data,
        response: res,
      };
    } catch (err) {
      return {
        ok: false,
        status: 0,
        data: null,
        error: err.message,
        response: null,
      };
    }
  }

  /**
   * HTTP GET
   * @param {string} endpoint
   * @param {object} options
   */
  static async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: "GET" });
  }

  /**
   * HTTP POST
   * @param {string} endpoint
   * @param {any} body
   * @param {object} options
   */
  static async post(endpoint, body = null, options = {}) {
    return this.request(endpoint, { ...options, method: "POST", body });
  }

  /**
   * HTTP PUT
   * @param {string} endpoint
   * @param {any} body
   * @param {object} options
   */
  static async put(endpoint, body = null, options = {}) {
    return this.request(endpoint, { ...options, method: "PUT", body });
  }

  /**
   * HTTP PATCH
   * @param {string} endpoint
   * @param {any} body
   * @param {object} options
   */
  static async patch(endpoint, body = null, options = {}) {
    return this.request(endpoint, { ...options, method: "PATCH", body });
  }

  /**
   * HTTP DELETE
   * @param {string} endpoint
   * @param {object} options
   */
  static async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: "DELETE" });
  }
}
