export class GameSession {
  #score;
  #currentMode;
  #playerName;
  #city;
  #sprintHistory;
  #roundHistory;
  #roundIndex;
  #gameToken;
  #currentPrompt;
  #isFinished;
  #difficulty;
  #testNumber;

  constructor(playerName, city, initialMode = 'target', gameToken = null, initialPrompt = null, difficulty = 'hard', testNumber = null) {
    this.#playerName = playerName;
    this.#city = city;
    this.#currentMode = initialMode;
    this.#score = 0;
    this.#sprintHistory = [];
    this.#roundHistory = [];
    this.#roundIndex = (initialPrompt && typeof initialPrompt.roundIndex === 'number') ? initialPrompt.roundIndex + 1 : 1;
    this.#gameToken = gameToken;
    this.#currentPrompt = initialPrompt;
    this.#isFinished = false;
    this.#difficulty = difficulty;
    this.#testNumber = testNumber;
  }

  get testNumber() {
    return this.#testNumber;
  }

  get difficulty() {
    return this.#difficulty;
  }

  set difficulty(diff) {
    this.#difficulty = diff;
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

  set score(value) {
    this.#score = value;
  }

  get currentMode() {
    return this.#currentMode;
  }

  set currentMode(mode) {
    this.#currentMode = mode;
  }

  get sprintHistory() {
    return this.#sprintHistory;
  }

  set sprintHistory(history) {
    this.#sprintHistory = history || [];
  }

  get roundHistory() {
    return this.#roundHistory;
  }

  set roundHistory(history) {
    this.#roundHistory = history || [];
  }

  get roundIndex() {
    return this.#roundIndex;
  }

  set roundIndex(val) {
    this.#roundIndex = val;
  }

  get totalRounds() {
    if (this.#currentPrompt && typeof this.#currentPrompt.totalRounds === 'number') {
      return this.#currentPrompt.totalRounds;
    }
    return this.#roundHistory && this.#roundHistory.length > 0 ? Math.max(5, this.#roundHistory.length) : 5;
  }

  addRoundResult(result) {
    this.#roundHistory.push(result);
  }

  get gameToken() {
    return this.#gameToken;
  }

  set gameToken(token) {
    this.#gameToken = token;
  }

  get currentPrompt() {
    return this.#currentPrompt;
  }

  set currentPrompt(prompt) {
    this.#currentPrompt = prompt;
    if (prompt && typeof prompt.roundIndex === 'number') {
      this.#roundIndex = prompt.roundIndex + 1;
    }
  }

  isFinished() {
    return this.#isFinished;
  }

  setFinished(finished) {
    this.#isFinished = finished;
  }

  serialize() {
    return JSON.stringify({
      playerName: this.#playerName,
      city: this.#city,
      currentMode: this.#currentMode,
      score: this.#score,
      sprintHistory: this.#sprintHistory,
      roundHistory: this.#roundHistory,
      roundIndex: this.#roundIndex,
      gameToken: this.#gameToken,
      currentPrompt: this.#currentPrompt,
      isFinished: this.#isFinished,
      difficulty: this.#difficulty
    });
  }

  static deserialize(jsonString) {
    if (!jsonString) return null;
    try {
      const data = JSON.parse(jsonString);
      const session = new GameSession(
        data.playerName,
        data.city,
        data.currentMode,
        data.gameToken,
        data.currentPrompt,
        data.difficulty
      );
      session.score = data.score;
      session.sprintHistory = data.sprintHistory || [];
      session.roundHistory = data.roundHistory || [];
      session.roundIndex = data.roundIndex || 1;
      session.setFinished(data.isFinished || false);
      return session;
    } catch (e) {
      console.error('Failed to parse game session', e);
      return null;
    }
  }
}
