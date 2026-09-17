import { test } from "node:test";
import assert from "node:assert/strict";
import { GameSession } from "../src/models/GameSession.js";

test("GameSession initial state", () => {
  const initialPrompt = {
    roundIndex: 0,
    totalRounds: 5,
    streetName: "Rue de Rivoli",
  };
  const session = new GameSession(
    "Player1",
    { key: "paris", center: [48.85, 2.35] },
    "target",
    "token1",
    initialPrompt,
  );

  assert.equal(session.roundIndex, 1);
  assert.equal(session.currentPrompt.streetName, "Rue de Rivoli");
  assert.equal(session.nextPrompt, null);
  assert.equal(session.totalRounds, 5);
  assert.equal(session.isFinished(), false);
});

test("Setting nextPrompt preserves currentPrompt and roundIndex during feedback", () => {
  const initialPrompt = {
    roundIndex: 0,
    totalRounds: 5,
    streetName: "Rue de Rivoli",
  };
  const session = new GameSession(
    "Player1",
    { key: "paris" },
    "target",
    "token1",
    initialPrompt,
  );

  const nextPrompt = {
    roundIndex: 1,
    totalRounds: 5,
    streetName: "Boulevard Saint-Germain",
  };
  session.nextPrompt = nextPrompt;

  // During feedback screen:
  assert.equal(
    session.currentPrompt.streetName,
    "Rue de Rivoli",
    "currentPrompt must remain the active question during feedback",
  );
  assert.equal(
    session.roundIndex,
    1,
    "roundIndex must not increment prematurely during feedback",
  );
  assert.equal(session.nextPrompt.streetName, "Boulevard Saint-Germain");
});

test("Promoting nextPrompt updates currentPrompt and roundIndex", () => {
  const initialPrompt = {
    roundIndex: 0,
    totalRounds: 5,
    streetName: "Rue de Rivoli",
  };
  const session = new GameSession(
    "Player1",
    { key: "paris" },
    "target",
    "token1",
    initialPrompt,
  );

  const nextPrompt = {
    roundIndex: 1,
    totalRounds: 5,
    streetName: "Boulevard Saint-Germain",
  };
  session.nextPrompt = nextPrompt;

  // When next question is loaded:
  if (session.nextPrompt) {
    session.currentPrompt = session.nextPrompt;
    session.nextPrompt = null;
  }

  assert.equal(session.currentPrompt.streetName, "Boulevard Saint-Germain");
  assert.equal(session.roundIndex, 2);
  assert.equal(session.nextPrompt, null);
});

test("Serialization and deserialization preserves nextPrompt", () => {
  const initialPrompt = {
    roundIndex: 0,
    totalRounds: 5,
    streetName: "Rue de Rivoli",
  };
  const session = new GameSession(
    "Player1",
    { key: "paris" },
    "target",
    "token1",
    initialPrompt,
  );
  session.nextPrompt = {
    roundIndex: 1,
    totalRounds: 5,
    streetName: "Boulevard Saint-Germain",
  };

  const serialized = session.serialize();
  const restored = GameSession.deserialize(serialized);

  assert.equal(restored.currentPrompt.streetName, "Rue de Rivoli");
  assert.equal(restored.roundIndex, 1);
  assert.equal(restored.nextPrompt.streetName, "Boulevard Saint-Germain");
});

test("Deserializing legacy session without nextPrompt defaults to null", () => {
  const legacyData = JSON.stringify({
    playerName: "Player1",
    city: { key: "paris" },
    currentMode: "target",
    score: 100,
    roundHistory: [],
    roundIndex: 2,
    gameToken: "token123",
    currentPrompt: {
      roundIndex: 1,
      totalRounds: 5,
      streetName: "Rue de la Paix",
    },
    isFinished: false,
  });

  const session = GameSession.deserialize(legacyData);
  assert.equal(session.currentPrompt.streetName, "Rue de la Paix");
  assert.equal(session.roundIndex, 2);
  assert.equal(session.nextPrompt, null);
});

test("Last round preserves currentPrompt and totalRounds when nextPrompt is null and finished", () => {
  const round5Prompt = {
    roundIndex: 4,
    totalRounds: 5,
    streetName: "Place de la Concorde",
  };
  const session = new GameSession(
    "Player1",
    { key: "paris" },
    "target",
    "token5",
    round5Prompt,
  );

  session.nextPrompt = null;
  session.setFinished(true);

  assert.equal(session.currentPrompt.streetName, "Place de la Concorde");
  assert.equal(session.totalRounds, 5);
  assert.equal(session.isFinished(), true);
});
