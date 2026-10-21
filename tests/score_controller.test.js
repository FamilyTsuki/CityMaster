import test from "node:test";
import assert from "node:assert/strict";
import { ScoreController } from "../src/backend/controllers/ScoreController.js";
import { Score } from "../src/backend/models/Score.js";

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

test("ScoreController & Score: déduplication MAX(score) et classement par joueur", async () => {
  const testNumber = 778899;
  const playerA = "player_alpha";
  const playerB = "player_beta";
  const playerC = "player_gamma";

  await Score.create(playerA, 300, "hard", null, testNumber);
  await Score.create(playerA, 1500, "hard", null, testNumber);
  await Score.create(playerA, 800, "hard", null, testNumber);

  await Score.create(playerB, 900, "hard", null, testNumber);
  await Score.create(playerB, 450, "hard", null, testNumber);

  await Score.create(playerC, 1200, "hard", null, testNumber);

  const leaderboard = await Score.getTopTestScores(testNumber, 10);

  const usernames = leaderboard.map(s => s.username || s.player);
  assert.equal(usernames.filter(u => u === playerA).length, 1, "Player A doit apparaître exactement 1 fois");
  assert.equal(usernames.filter(u => u === playerB).length, 1, "Player B doit apparaître exactement 1 fois");
  assert.equal(usernames.filter(u => u === playerC).length, 1, "Player C doit apparaître exactement 1 fois");

  const scoreA = leaderboard.find(s => (s.username || s.player) === playerA);
  const scoreB = leaderboard.find(s => (s.username || s.player) === playerB);
  const scoreC = leaderboard.find(s => (s.username || s.player) === playerC);

  assert.equal(scoreA.score, 1500, "Le score retenu pour Player A doit être son score maximal (1500)");
  assert.equal(scoreB.score, 900, "Le score retenu pour Player B doit être son score maximal (900)");
  assert.equal(scoreC.score, 1200, "Le score retenu pour Player C doit être son score maximal (1200)");

  assert.equal(usernames[0], playerA, "Le 1er joueur doit être Player A avec 1500 pts");
  assert.equal(usernames[1], playerC, "Le 2e joueur doit être Player C avec 1200 pts");
  assert.equal(usernames[2], playerB, "Le 3e joueur doit être Player B avec 900 pts");

  const resBadTest = createMockRes();
  await ScoreController.getTestLeaderboard({ params: { testNumber: "not_a_number" } }, resBadTest);
  assert.equal(resBadTest.statusCode, 400);
  assert.equal(resBadTest.body.error, "Invalid test number");

  const resOkTest = createMockRes();
  await ScoreController.getTestLeaderboard({ params: { testNumber: String(testNumber) } }, resOkTest);
  assert.equal(resOkTest.statusCode, 200);
  assert.ok(Array.isArray(resOkTest.body));
  assert.equal(resOkTest.body.length >= 3, true);
});

