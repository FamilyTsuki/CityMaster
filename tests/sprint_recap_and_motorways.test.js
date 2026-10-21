import test from 'node:test';
import assert from 'node:assert/strict';
import { isMotorway } from '../src/services/RouteDifficultyService.js';
import { getPlayableStreets } from '../src/backend/services/CityStreetsService.js';
import { CertificateView } from '../src/views/CertificateView.js';
import { writeDataFile, makeCity, makeStreet } from './helpers.js';

test("une autoroute n'est jamais proposée, même si sa longueur la classe « facile »", async () => {
  const motorway = makeStreet("L'Arverne", { lengthMeters: 16000, highway: 'motorway' });
  const link = makeStreet('Bretelle A71', { lengthMeters: 400, highway: 'motorway_link' });
  const avenue = makeStreet('Avenue de Paris', { lengthMeters: 600, lat: 47.95 });
  await writeDataFile('motorway_city.json', makeCity([motorway, link, avenue]));

  const { streets } = await getPlayableStreets('motorway_city');
  const names = streets.map((s) => s.feature.properties.name);
  assert.ok(!names.includes("L'Arverne"));
  assert.ok(!names.includes('Bretelle A71'));
  assert.ok(names.includes('Avenue de Paris'));
});

test('isMotorway ne retient que les autoroutes et leurs bretelles', () => {
  assert.equal(isMotorway(makeStreet('A', { highway: 'motorway' })), true);
  assert.equal(isMotorway(makeStreet('B', { highway: 'Motorway_link' })), true);
  assert.equal(isMotorway(makeStreet('C', { highway: 'trunk' })), false);
  assert.equal(isMotorway({ properties: { name: 'Sans type' } }), false);
});

test('bilan sprint : distances lisibles', () => {
  assert.equal(CertificateView.formatDistance(-1, 'Temps écoulé'), 'Temps écoulé');
  assert.equal(CertificateView.formatDistance(null, 'Temps écoulé'), 'Temps écoulé');
  assert.equal(CertificateView.formatDistance(42.6, '-'), '43 m');
  assert.equal(CertificateView.formatDistance(1349, '-', 'fr'), '1,3 km');
  assert.equal(CertificateView.formatDistance(1349, '-', 'en'), '1.3 km');
});
