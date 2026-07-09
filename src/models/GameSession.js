export class GameSession {
  #score;
  #streets;
  #currentIndex;
  #currentMode;
  #playerName;
  #city;

  constructor(playerName, city, streets, initialMode = 'target') {
    this.#playerName = playerName;
    this.#city = city;
    this.#streets = this.#shuffle(streets);
    this.#score = 0;
    this.#currentIndex = 0;
    this.#currentMode = initialMode;
  }

  get playerName() {
    return this.#playerName;
  }

  get city() {
    return this.#city;
  }

  get score() {
    return this.#score;
  }

  get currentMode() {
    return this.#currentMode;
  }

  set currentMode(mode) {
    this.#currentMode = mode;
  }

  getCurrentStreet() {
    if (this.#currentIndex >= this.#streets.length) {
      return null;
    }
    return this.#streets[this.#currentIndex];
  }

  incrementScore(points) {
    this.#score += points;
  }

  advance() {
    this.#currentIndex++;
  }

  isFinished() {
    return this.#currentIndex >= this.#streets.length;
  }

  #shuffle(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  serialize() {
    return JSON.stringify({
      playerName: this.#playerName,
      city: this.#city,
      streets: this.#streets,
      score: this.#score,
      currentIndex: this.#currentIndex,
      currentMode: this.#currentMode
    });
  }

  static deserialize(jsonString) {
    if (!jsonString) return null;
    try {
      const data = JSON.parse(jsonString);
      // On passe un tableau vide pour streets car on l'écrase juste après
      const session = new GameSession(data.playerName, data.city, []);
      session.#streets = data.streets;
      session.#score = data.score;
      session.#currentIndex = data.currentIndex;
      session.#currentMode = data.currentMode;
      return session;
    } catch (e) {
      console.error('Failed to parse game session', e);
      return null;
    }
  }
}
