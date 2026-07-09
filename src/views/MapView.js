export class MapView {
  #map;
  #streetLayer;
  #clickCallback;
  #tempMarker;
  #feedbackMarkers;

  constructor() {
    this.#map = null;
    this.#streetLayer = null;
    this.#clickCallback = null;
    this.#tempMarker = null;
    this.#feedbackMarkers = [];
  }

  initMap(centerCoordinates = [48.8566, 2.3522], zoom = 14) {
    if (this.#map) {
      this.#map.setView(centerCoordinates, zoom);
      this.clearStreets();
      return;
    }

    this.#map = L.map('map', {
      zoomControl: false
    }).setView(centerCoordinates, zoom);

    L.control.zoom({
      position: 'bottomright'
    }).addTo(this.#map);

    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const tileUrl = isDark 
      ? 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(this.#map);

    this.#streetLayer = L.geoJSON(null, {
      style: {
        color: '#06b6d4',
        weight: 4,
        opacity: 0.8
      }
    }).addTo(this.#map);

    this.#map.on('click', (event) => {
      if (this.#clickCallback) {
        this.#clickCallback(event.latlng.lat, event.latlng.lng);
      }
    });
  }

  onClickMap(callback) {
    this.#clickCallback = callback;
  }

  placeTempMarker(latitude, longitude) {
    if (this.#tempMarker) {
      this.#tempMarker.setLatLng([latitude, longitude]);
    } else {
      this.#tempMarker = L.marker([latitude, longitude]).addTo(this.#map);
    }
  }

  getTempMarkerLatLng() {
    return this.#tempMarker ? this.#tempMarker.getLatLng() : null;
  }

  clearTempMarker() {
    if (this.#tempMarker) {
      this.#tempMarker.remove();
      this.#tempMarker = null;
    }
  }

  renderStreet(streetGeoJSON, visible = true) {
    if (this.#streetLayer) {
      this.#streetLayer.clearLayers();
    }
    if (visible && streetGeoJSON) {
      this.#streetLayer.addData(streetGeoJSON);
    }
  }

  fitToGuessAndStreet(guessLat, guessLng) {
    if (!this.#map || !this.#streetLayer) return;
    const bounds = L.latLngBounds([guessLat, guessLng]);
    const streetBounds = this.#streetLayer.getBounds();
    if (streetBounds.isValid()) {
      bounds.extend(streetBounds);
    }
    this.#map.fitBounds(bounds, { padding: [80, 80], maxZoom: 16 });
  }

  clearStreets() {
    if (this.#streetLayer) {
      this.#streetLayer.clearLayers();
    }
    this.clearTempMarker();
    this.clearFeedback();
  }

  showFeedback(latitude, longitude, isCorrect) {
    const color = isCorrect ? '#10b981' : '#ef4444';
    const marker = L.circleMarker([latitude, longitude], {
      radius: 8,
      fillColor: color,
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8
    }).addTo(this.#map);
    this.#feedbackMarkers.push(marker);
  }

  clearFeedback() {
    this.#feedbackMarkers.forEach(marker => marker.remove());
    this.#feedbackMarkers = [];
  }

  setView(center, zoom) {
    this.#map.setView(center, zoom);
  }
}
