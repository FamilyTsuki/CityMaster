export class GameSession {
  #score;
  #remainingStreets;
  #currentMode;

  constructor(streets, mode) {
    this.#score = 0;
    this.#remainingStreets = [...streets];
    this.#currentMode = mode;
  }

  get score() {
    return this.#score;
  }

  get remainingStreets() {
    return this.#remainingStreets;
  }

  get currentMode() {
    return this.#currentMode;
  }

  incrementScore(points) {
    this.#score += points;
  }

  nextStreet() {
    return this.#remainingStreets.pop();
  }
}
