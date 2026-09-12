export class FlashMessageService {
  static #containerElement = null;

  static #ensureContainer() {
    if (!this.#containerElement || !document.body.contains(this.#containerElement)) {
      this.#containerElement = document.getElementById('flash-message-container');
      if (!this.#containerElement) {
        this.#containerElement = document.createElement('div');
        this.#containerElement.id = 'flash-message-container';
        this.#containerElement.className = 'flash-container';
        document.body.appendChild(this.#containerElement);
      }
    }
    return this.#containerElement;
  }

  static show(message, type = 'error', duration = 4000) {
    if (!message) return;

    const container = this.#ensureContainer();
    const flashElement = document.createElement('div');
    flashElement.className = `flash-message flash-${type}`;

    let iconMarkup = '';
    if (type === 'error') {
      iconMarkup = '<svg class="flash-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    } else if (type === 'success') {
      iconMarkup = '<svg class="flash-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
    } else {
      iconMarkup = '<svg class="flash-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }

    const closeMarkup = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

    flashElement.innerHTML = `
      ${iconMarkup}
      <span class="flash-text">${message}</span>
      <button type="button" class="flash-close-btn" aria-label="Close">${closeMarkup}</button>
    `;

    const closeButton = flashElement.querySelector('.flash-close-btn');
    const dismissHandler = () => {
      flashElement.classList.remove('show');
      flashElement.classList.add('hide');
      setTimeout(() => {
        if (flashElement.parentNode) {
          flashElement.parentNode.removeChild(flashElement);
        }
      }, 350);
    };

    if (closeButton) {
      closeButton.addEventListener('click', dismissHandler);
    }

    container.appendChild(flashElement);

    requestAnimationFrame(() => {
      flashElement.classList.add('show');
    });

    if (duration > 0) {
      setTimeout(dismissHandler, duration);
    }
  }

  static error(message, duration = 4000) {
    this.show(message, 'error', duration);
  }

  static success(message, duration = 4000) {
    this.show(message, 'success', duration);
  }

  static info(message, duration = 4000) {
    this.show(message, 'info', duration);
  }
}
