export class Player {
  #name;
  #highScores;

  constructor(name) {
    this.#name = name;
    this.#highScores = {};
  }

  get name() {
    return this.#name;
  }

  getHighScores() {
    return this.#highScores;
  }

  saveHighScore(level, score) {
    if (!this.#highScores[level] || score > this.#highScores[level]) {
      this.#highScores[level] = score;
    }
  }
}
