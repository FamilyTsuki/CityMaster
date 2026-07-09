export class GameView {
  #containerId;

  constructor(containerId) {
    this.#containerId = containerId;
  }

  render(gameState) {
    return this.#containerId;
  }
}
