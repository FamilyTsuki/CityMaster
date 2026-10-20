import test from 'node:test';
import assert from 'node:assert';
import { RouteDifficultyService } from '../src/services/RouteDifficultyService.js';
import { CityController } from '../src/backend/controllers/CityController.js';

test('RouteDifficultyService.getFeatureLengthMeters: calcule correctement la longueur métrique', () => {
  
  const microFeature = {
    type: 'Feature',
    properties: { name: 'Rue du Commandant Marchand' },
    geometry: {
      type: 'LineString',
      coordinates: [
        [-0.579200, 44.837800],
        [-0.579225, 44.837800] 
      ]
    }
  };

  const len = RouteDifficultyService.getFeatureLengthMeters(microFeature);
  assert.ok(len > 0 && len < 5, `Longueur attendue < 5m, reçu: ${len}m`);

  const normalFeature = {
    type: 'Feature',
    properties: { name: 'Boulevard Central' },
    geometry: {
      type: 'LineString',
      coordinates: [
        [1.900, 47.900],
        [1.906, 47.903] 
      ]
    }
  };
  const normalLen = RouteDifficultyService.getFeatureLengthMeters(normalFeature);
  assert.ok(normalLen >= 450, `Longueur attendue >= 450m, reçu: ${normalLen}m`);
});

test('CityController.convertToGeoJSON: élimine automatiquement les micro-segments de moins de 15m', () => {
  const overpassData = {
    elements: [
      {
        type: 'way',
        tags: { name: 'Micro Ruelle 2m', highway: 'residential' },
        geometry: [
          { lat: 47.900000, lon: 1.900000 },
          { lat: 47.900018, lon: 1.900000 } 
        ]
      },
      {
        type: 'way',
        tags: { name: 'Avenue Principale 200m', highway: 'secondary' },
        geometry: [
          { lat: 47.9000, lon: 1.9000 },
          { lat: 47.9018, lon: 1.9000 } 
        ]
      }
    ]
  };

  const geojson = CityController.convertToGeoJSON(overpassData);
  const names = geojson.features.map(f => f.properties.name);

  assert.ok(
    !names.includes('Micro Ruelle 2m'),
    'Les micro-segments de 2 mètres doivent être éliminés de la génération GeoJSON'
  );
  assert.ok(
    names.includes('Avenue Principale 200m'),
    'Les voies normales doivent être conservées dans le GeoJSON'
  );
});

