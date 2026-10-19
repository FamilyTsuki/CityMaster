import test from 'node:test';
import assert from 'node:assert';
import { ConfettiService } from '../src/services/ConfettiService.js';
import { CertificateView } from '../src/views/CertificateView.js';

test('ConfettiService.getConfettiConfig: score nul ou inférieur au seuil donne 0 confetti', () => {
  // Score nul ou négatif
  assert.strictEqual(ConfettiService.getConfettiConfig(0, 'target').count, 0);
  assert.strictEqual(ConfettiService.getConfettiConfig(0, 'target').tier, 'none');
  assert.strictEqual(ConfettiService.getConfettiConfig(-100, 'target').count, 0);

  // Mode classique target : seuil minimum à 500 points
  assert.strictEqual(ConfettiService.getConfettiConfig(250, 'target').count, 0);
  assert.strictEqual(ConfettiService.getConfettiConfig(499, 'target').count, 0);
  assert.strictEqual(ConfettiService.getConfettiConfig(499, 'target').tier, 'none');

  // Mode sprint : seuil minimum à 300 points
  assert.strictEqual(ConfettiService.getConfettiConfig(150, 'sprint').count, 0);
  assert.strictEqual(ConfettiService.getConfettiConfig(299, 'sprint').count, 0);
  assert.strictEqual(ConfettiService.getConfettiConfig(299, 'sprint').tier, 'none');
});

test('ConfettiService.getConfettiConfig: échelle progressive par paliers (Bronze, Argent, Or, Légendaire)', () => {
  // Bronze target (500 - 1499)
  const bronzeTarget = ConfettiService.getConfettiConfig(1000, 'target');
  assert.strictEqual(bronzeTarget.tier, 'bronze');
  assert.ok(bronzeTarget.count >= 30 && bronzeTarget.count <= 65, `Bronze count attendu [30-65], reçu: ${bronzeTarget.count}`);
  assert.strictEqual(bronzeTarget.hasSparks, false);

  // Argent target (1500 - 2999)
  const silverTarget = ConfettiService.getConfettiConfig(2200, 'target');
  assert.strictEqual(silverTarget.tier, 'silver');
  assert.ok(silverTarget.count >= 75 && silverTarget.count <= 130, `Silver count attendu [75-130], reçu: ${silverTarget.count}`);
  assert.strictEqual(silverTarget.hasSparks, false);

  // Or target (3000 - 4499)
  const goldTarget = ConfettiService.getConfettiConfig(3800, 'target');
  assert.strictEqual(goldTarget.tier, 'gold');
  assert.ok(goldTarget.count >= 150 && goldTarget.count <= 230, `Gold count attendu [150-230], reçu: ${goldTarget.count}`);

  // Légendaire target (>= 4500)
  const legendaryTarget = ConfettiService.getConfettiConfig(4900, 'target');
  assert.strictEqual(legendaryTarget.tier, 'legendary');
  assert.ok(legendaryTarget.count >= 250 && legendaryTarget.count <= 320, `Legendary count attendu [250-320], reçu: ${legendaryTarget.count}`);
  assert.strictEqual(legendaryTarget.hasSparks, true, 'Le palier légendaire doit comporter des étincelles dorées et blanches');
  assert.ok(legendaryTarget.duration >= 8000, 'La durée du palier légendaire doit être d au moins 8000ms');

  // Mode sprint
  const bronzeSprint = ConfettiService.getConfettiConfig(600, 'sprint');
  assert.strictEqual(bronzeSprint.tier, 'bronze');
  const silverSprint = ConfettiService.getConfettiConfig(1800, 'sprint');
  assert.strictEqual(silverSprint.tier, 'silver');
  const goldSprint = ConfettiService.getConfettiConfig(3200, 'sprint');
  assert.strictEqual(goldSprint.tier, 'gold');
  const legendarySprint = ConfettiService.getConfettiConfig(4500, 'sprint');
  assert.strictEqual(legendarySprint.tier, 'legendary');
});

test('ConfettiService.getConfettiConfig: croissance strictement monotone du nombre de confettis avec le score', () => {
  const scores = [0, 200, 500, 1000, 1500, 2500, 3000, 4000, 4500, 5000];
  const counts = scores.map(s => ConfettiService.getConfettiConfig(s, 'target').count);

  for (let i = 1; i < counts.length; i++) {
    assert.ok(
      counts[i] >= counts[i - 1],
      `Le nombre de confettis pour ${scores[i]} pts (${counts[i]}) doit être >= à celui pour ${scores[i - 1]} pts (${counts[i - 1]})`
    );
  }
});

test('ConfettiService.launch: déclenchement conditionné par le score', () => {
  // Score 0 ou insuffisant : aucun lancement
  const zeroResult = ConfettiService.launch(0, { mode: 'target' });
  assert.strictEqual(zeroResult.launched, false);
  assert.strictEqual(zeroResult.count, 0);

  const lowResult = ConfettiService.launch(350, { mode: 'target' });
  assert.strictEqual(lowResult.launched, false);
  assert.strictEqual(lowResult.count, 0);

  // Score suffisant : lancement actif avec bon palier
  const winResult = ConfettiService.launch(4200, { mode: 'target' });
  assert.strictEqual(winResult.launched, true);
  assert.strictEqual(winResult.tier, 'gold');
  assert.ok(winResult.count > 150);
});

test('ConfettiService.launch: lecture de secours dans le DOM (#cert-score)', () => {
  const previousDoc = global.document;

  global.document = {
    getElementById: (id) => {
      if (id === 'cert-score') return { textContent: '3600' };
      return null;
    }
  };

  try {
    const res = ConfettiService.launch(); // aucun score explicite fourni
    assert.strictEqual(res.launched, true);
    assert.strictEqual(res.tier, 'gold');
  } finally {
    global.document = previousDoc;
  }
});

test('CertificateView: mémorise lastScore et lastMode lors de render()', () => {
  const previousDoc = global.document;

  const mockEls = {
    'cert-player-name': { textContent: '', style: {} },
    'cert-score': { textContent: '' },
    'cert-percentile-text': { textContent: '' },
    'cert-rank-comparison': { classList: { add: () => {}, remove: () => {} } },
    'sprint-recap': { classList: { add: () => {}, remove: () => {} } },
    'sprint-recap-body': { replaceChildren: () => {}, appendChild: () => {} }
  };

  global.document = {
    getElementById: (id) => mockEls[id] || null
  };

  try {
    const certView = new CertificateView();
    assert.strictEqual(certView.lastScore, 0);
    assert.strictEqual(certView.lastMode, 'target');

    certView.render('Champion', 4850, 'sprint', [], null, false);
    assert.strictEqual(certView.lastScore, 4850);
    assert.strictEqual(certView.lastMode, 'sprint');
    assert.strictEqual(mockEls['cert-score'].textContent, 4850);
  } finally {
    global.document = previousDoc;
  }
});

