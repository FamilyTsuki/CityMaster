export class CertificateView {
  #containerId;

  constructor(containerId) {
    this.#containerId = containerId;
  }

  render(player, score) {
    return this.#containerId;
  }
}
