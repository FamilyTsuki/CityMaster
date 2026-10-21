import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("landing screen template exists and contains valid structure with the 3 feature cards", () => {
  const landingHtml = fs.readFileSync(
    path.resolve("public/screens/landing.html"),
    "utf8",
  );

  // Verify the 3 feature cards and features-grid are present
  assert.ok(
    landingHtml.includes("features-grid"),
    "Must include .features-grid",
  );
  const cardMatches = landingHtml.match(/class="feature-card/g);
  assert.equal(
    cardMatches ? cardMatches.length : 0,
    3,
    "Must include exactly 3 feature-card elements",
  );

  // Verify cards contain their paper styling and icons
  assert.ok(
    landingHtml.includes("sheet-tilt-left"),
    "Must include sheet-tilt-left",
  );
  assert.ok(
    landingHtml.includes("sheet-straight"),
    "Must include sheet-straight",
  );
  assert.ok(
    landingHtml.includes("sheet-tilt-right"),
    "Must include sheet-tilt-right",
  );
  assert.ok(
    landingHtml.includes("open-install-modal"),
    "Must include install guide button",
  );

  // Verify paper filter
  assert.ok(
    landingHtml.includes("paper-wobbly-line"),
    "Must include SVG filter paper-wobbly-line",
  );

  // Verify root animation and simulator are absent
  assert.equal(
    landingHtml.includes("street-roots-canvas"),
    false,
    "Should not include #street-roots-canvas",
  );
  assert.equal(
    landingHtml.includes("game-preview-stage"),
    false,
    "Should not include .game-preview-stage",
  );

  // Verify required action buttons and footer links
  assert.ok(
    landingHtml.includes("hero-play-btn"),
    "Must include #hero-play-btn",
  );
  assert.ok(
    landingHtml.includes("hero-room-btn"),
    "Must include #hero-room-btn",
  );
  assert.ok(
    landingHtml.includes("landing-legal-btn"),
    "Must include #landing-legal-btn",
  );
  assert.ok(
    landingHtml.includes("landing-support-btn"),
    "Must include #landing-support-btn",
  );
});
