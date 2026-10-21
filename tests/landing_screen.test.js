import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { StreetRootsAnimation } from '../src/views/components/StreetRootsAnimation.js';
import { LandingSimulator } from '../src/views/components/LandingSimulator.js';

test('landing screen template exists and contains valid structure without the 3 old cards', () => {
  const landingHtml = fs.readFileSync(path.resolve('public/screens/landing.html'), 'utf8');

  // Verify the 3 old cards are removed
  assert.equal(landingHtml.includes('features-grid'), false, 'Old features-grid must be removed');
  assert.equal(landingHtml.includes('feature-card'), false, 'Old feature-card must be removed');

  // Verify canvas for root streets animation
  assert.ok(landingHtml.includes('street-roots-canvas'), 'Must include #street-roots-canvas');

  // Verify floating street tags
  assert.ok(landingHtml.includes('street-roots-tags-left'), 'Must include street tags on left');
  assert.ok(landingHtml.includes('street-roots-tags-right'), 'Must include street tags on right');

  // Verify game preview stage & simulator elements
  assert.ok(landingHtml.includes('game-preview-stage'), 'Must include .game-preview-stage');
  assert.ok(landingHtml.includes('sim-console-header'), 'Must include .sim-console-header');
  assert.ok(landingHtml.includes('simulator-map-viewport'), 'Must include .simulator-map-viewport');
  assert.ok(landingHtml.includes('sim-target-reticle'), 'Must include .sim-target-reticle');
  assert.ok(landingHtml.includes('sim-score-burst'), 'Must include .sim-score-burst');

  // Verify required action buttons and footer links
  assert.ok(landingHtml.includes('hero-play-btn'), 'Must include #hero-play-btn');
  assert.ok(landingHtml.includes('hero-room-btn'), 'Must include #hero-room-btn');
  assert.ok(landingHtml.includes('landing-legal-btn'), 'Must include #landing-legal-btn');
  assert.ok(landingHtml.includes('landing-support-btn'), 'Must include #landing-support-btn');
});

test('StreetRootsAnimation and LandingSimulator can be instantiated in node environment safely', () => {
  const rootsAnim = new StreetRootsAnimation(null);
  assert.ok(rootsAnim, 'StreetRootsAnimation instance should be created');
  rootsAnim.stop();

  const simulator = new LandingSimulator(null);
  assert.ok(simulator, 'LandingSimulator instance should be created');
  simulator.stop();
});

