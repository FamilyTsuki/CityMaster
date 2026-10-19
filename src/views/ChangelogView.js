import { I18nService } from "../services/I18nService.js";

export class ChangelogView {
  #container;
  #loadingEl;
  #contentEl;
  #cachedMarkdown = null;

  constructor() {
    if (typeof document !== "undefined") {
      this.#container = document.getElementById("changelog-container");
      this.#loadingEl = document.getElementById("changelog-loading");
      this.#contentEl = document.getElementById("changelog-content");
    }
  }

  async loadAndRender() {
    if (typeof document !== "undefined") {
      this.#container = document.getElementById("changelog-container");
      this.#loadingEl = document.getElementById("changelog-loading");
      this.#contentEl = document.getElementById("changelog-content");
    }

    if (this.#loadingEl) {
      this.#loadingEl.classList.remove("hidden");
    }
    if (this.#contentEl) {
      this.#contentEl.innerHTML = "";
    }

    try {
      let rawMarkdown = this.#cachedMarkdown;

      if (!rawMarkdown) {
        try {
          const res = await fetch("/api/changelog");
          if (res.ok) {
            rawMarkdown = await res.text();
          }
        } catch (_) {}

        if (!rawMarkdown) {
          try {
            const fallbackRes = await fetch("/CHANGELOG.md");
            if (fallbackRes.ok) {
              rawMarkdown = await fallbackRes.text();
            }
          } catch (_) {}
        }

        if (rawMarkdown) {
          this.#cachedMarkdown = rawMarkdown;
        }
      }

      if (!rawMarkdown) {
        throw new Error("Changelog data unavailable");
      }

      this.#renderMarkdown(rawMarkdown);
    } catch (err) {
      this.#renderError();
    } finally {
      if (this.#loadingEl) {
        this.#loadingEl.classList.add("hidden");
      }
    }
  }

  #renderMarkdown(markdown) {
    if (!this.#contentEl) return;

    const entries = [];
    const rawBlocks = markdown.split(/\n(?=## \[[0-9])/);

    for (const block of rawBlocks) {
      const headerMatch = block.match(/^## \[([0-9.]+)\](?: - ([0-9]{4}-[0-9]{2}-[0-9]{2}))?/m);
      if (!headerMatch) continue;

      const version = headerMatch[1];
      const date = headerMatch[2] || "";
      const body = block.replace(/^## .*\n/, "").trim();

      entries.push({ version, date, body });
    }

    if (entries.length === 0) {
      this.#renderError();
      return;
    }

    const i18n = I18nService.getInstance();
    const latestLabel = i18n.t("changelog.latest_badge") || "Dernière version";

    let html = "";
    entries.forEach((entry, idx) => {
      const isLatest = idx === 0;
      html += `
        <article class="changelog-version-card">
          <header class="changelog-version-header">
            <div class="changelog-version-title-group">
              <span class="changelog-version-badge">v${entry.version}</span>
              ${isLatest ? `<span class="badge-latest">${latestLabel}</span>` : ""}
            </div>
            ${entry.date ? `<time class="changelog-version-date">${entry.date}</time>` : ""}
          </header>
          <div class="changelog-version-body">
            ${this.#parseBody(entry.body)}
          </div>
        </article>
      `;
    });

    this.#contentEl.innerHTML = html;
  }

  #parseBody(bodyText) {
    const lines = bodyText.split("\n");
    let result = "";
    let inList = false;
    let inSublist = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed || trimmed === "---") {
        if (inSublist) {
          result += "</ul>";
          inSublist = false;
        }
        if (inList) {
          result += "</ul>";
          inList = false;
        }
        continue;
      }

      if (trimmed.startsWith("### ")) {
        if (inSublist) {
          result += "</ul>";
          inSublist = false;
        }
        if (inList) {
          result += "</ul>";
          inList = false;
        }
        const title = this.#escapeHtml(trimmed.slice(4));
        result += `<h2 class="changelog-section-title">${title}</h2>`;
        continue;
      }

      if (/^\s{2,}- /.test(line)) {
        if (!inSublist) {
          result += '<ul class="changelog-sublist">';
          inSublist = true;
        }
        const text = this.#formatMarkdownText(trimmed.replace(/^-\s*/, ""));
        result += `<li class="changelog-subitem">${text}</li>`;
        continue;
      }

      if (trimmed.startsWith("- ")) {
        if (inSublist) {
          result += "</ul>";
          inSublist = false;
        }
        if (!inList) {
          result += '<ul class="changelog-list">';
          inList = true;
        }
        const text = this.#formatMarkdownText(trimmed.slice(2));
        result += `<li class="changelog-item">${text}</li>`;
        continue;
      }

      if (inSublist) {
        result += "</ul>";
        inSublist = false;
      }
      if (inList) {
        result += "</ul>";
        inList = false;
      }
      result += `<p class="changelog-paragraph">${this.#formatMarkdownText(trimmed)}</p>`;
    }

    if (inSublist) result += "</ul>";
    if (inList) result += "</ul>";

    return result;
  }

  #formatMarkdownText(text) {
    let escaped = this.#escapeHtml(text);
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    escaped = escaped.replace(/`([^`]+)`/g, "<code>$1</code>");
    return escaped;
  }

  #escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  #renderError() {
    if (!this.#contentEl) return;
    const i18n = I18nService.getInstance();
    const errorText =
      i18n.t("changelog.load_error") ||
      "Impossible de charger les notes de version.";
    const retryText = i18n.t("changelog.reload_btn") || "Réessayer";

    this.#contentEl.innerHTML = `
      <div class="changelog-error" style="padding: 2rem; text-align: center;">
        <p style="color: var(--danger); font-weight: 700; margin-bottom: 1rem;">${errorText}</p>
        <button id="changelog-retry-btn" class="btn secondary" style="width: auto; margin: auto;">${retryText}</button>
      </div>
    `;

    const retryBtn = document.getElementById("changelog-retry-btn");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => this.loadAndRender());
    }
  }
}
