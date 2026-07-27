export class CustomLotissementService {
  static getCustomLotissements(cityKey) {
    if (!cityKey) return [];
    try {
      const data = localStorage.getItem('citymaster_custom_lotissements');
      if (!data) return [];
      const parsed = JSON.parse(data);
      return parsed[cityKey] || [];
    } catch (e) {
      console.error('Failed to load custom lotissements', e);
      return [];
    }
  }

  static addCustomLotissement(cityKey, name, lat, lng, radiusInMeters = 120) {
    if (!cityKey || !name || typeof lat !== 'number' || typeof lng !== 'number') {
      return null;
    }

    const points = [];
    const numPoints = 16;
    const latRad = (lat * Math.PI) / 180;
    const radiusLat = radiusInMeters / 111320;
    const radiusLng = radiusInMeters / (111320 * Math.cos(latRad));

    for (let i = 0; i <= numPoints; i++) {
      const theta = (i / numPoints) * 2 * Math.PI;
      const ptLat = lat + radiusLat * Math.sin(theta);
      const ptLng = lng + radiusLng * Math.cos(theta);
      points.push([ptLng, ptLat]);
    }

    const feature = {
      type: 'Feature',
      properties: {
        name: name.trim(),
        isLotissement: true,
        isCustom: true,
        itemType: 'lotissement',
        id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      },
      geometry: {
        type: 'Polygon',
        coordinates: [points]
      }
    };

    try {
      const raw = localStorage.getItem('citymaster_custom_lotissements');
      const all = raw ? JSON.parse(raw) : {};
      if (!all[cityKey]) {
        all[cityKey] = [];
      }
      all[cityKey].push(feature);
      localStorage.setItem('citymaster_custom_lotissements', JSON.stringify(all));
      return feature;
    } catch (e) {
      console.error('Failed to save custom lotissement', e);
      return null;
    }
  }

  static deleteCustomLotissement(cityKey, featureId) {
    if (!cityKey || !featureId) return false;
    try {
      const raw = localStorage.getItem('citymaster_custom_lotissements');
      if (!raw) return false;
      const all = JSON.parse(raw);
      if (!all[cityKey]) return false;

      all[cityKey] = all[cityKey].filter(f => f.properties && f.properties.id !== featureId);
      localStorage.setItem('citymaster_custom_lotissements', JSON.stringify(all));
      return true;
    } catch (e) {
      console.error('Failed to delete custom lotissement', e);
      return false;
    }
  }
}
