export class MapView {
  #map;
  #streetLayer;
  #selectionLayer;
  #clickCallback;
  #tempMarker;
  #feedbackMarkers;
  #feedbackLine;
  #boundaryRect;
  #tileLayer;

  constructor() {
    this.#map = null;
    this.#streetLayer = null;
    this.#selectionLayer = null;
    this.#clickCallback = null;
    this.#tempMarker = null;
    this.#feedbackMarkers = [];
    this.#feedbackLine = null;
    this.#boundaryRect = null;
    this.#tileLayer = null;
  }

  initMap(centerCoordinates = [48.8566, 2.3522], zoom = 14, bboxString = null) {
    if (this.#map) {
      this.showMapLoader('Chargement de la carte...', true);
      this.#map.setView(centerCoordinates, zoom);
      if (bboxString) {
        const parts = bboxString.split(',').map(Number);
        if (parts.length === 4) {
          const bounds = L.latLngBounds([parts[0], parts[1]], [parts[2], parts[3]]);
          this.#map.setMaxBounds(bounds);
          const calculatedMinZoom = Math.max(12, this.#map.getBoundsZoom(bounds, true));
          this.#map.setMinZoom(calculatedMinZoom);
          
          if (this.#boundaryRect) this.#boundaryRect.remove();
          this.#boundaryRect = L.rectangle(bounds, {
            color: '#3b82f6',
            weight: 2,
            fill: false,
            dashArray: '5, 5'
          }).addTo(this.#map);
        }
      } else {
        this.#map.setMaxBounds(null);
        this.#map.setMinZoom(12);
        if (this.#boundaryRect) {
          this.#boundaryRect.remove();
          this.#boundaryRect = null;
        }
      }
      this.clearStreets();
      return this.#getTilesLoadedPromise();
    }

    const options = {
      zoomControl: false,
      minZoom: 12,
      maxBoundsViscosity: 1.0,
      preferCanvas: true
    };

    if (bboxString) {
      const parts = bboxString.split(',').map(Number);
      if (parts.length === 4) {
        options.maxBounds = L.latLngBounds([parts[0], parts[1]], [parts[2], parts[3]]);
      }
    }

    this.#map = L.map('map', options).setView(centerCoordinates, zoom);

    if (bboxString && options.maxBounds) {
      const calculatedMinZoom = Math.max(12, this.#map.getBoundsZoom(options.maxBounds, true));
      this.#map.setMinZoom(calculatedMinZoom);

      this.#boundaryRect = L.rectangle(options.maxBounds, {
        color: '#3b82f6',
        weight: 2,
        fill: false,
        dashArray: '5, 5'
      }).addTo(this.#map);
    }

    L.control.zoom({
      position: 'bottomright'
    }).addTo(this.#map);

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const tileUrl = isDark 
      ? 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';

    this.#tileLayer = L.tileLayer(tileUrl, {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(this.#map);

    this.showMapLoader('Chargement de la carte...', true);

    this.#streetLayer = L.geoJSON(null, {
      style: {
        color: '#06b6d4',
        weight: 4,
        opacity: 0.8
      }
    }).addTo(this.#map);

    this.#selectionLayer = L.geoJSON(null, {
      style: {
        color: '#f59e0b',
        weight: 6,
        opacity: 0.7
      }
    }).addTo(this.#map);

    this.#map.on('click', (event) => {
      if (this.#clickCallback) {
        this.#clickCallback(event.latlng.lat, event.latlng.lng);
      }
    });

    return this.#getTilesLoadedPromise();
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

  renderSelection(streetGeoJSON, visible = true) {
    if (this.#selectionLayer) {
      this.#selectionLayer.clearLayers();
    }
    if (visible && streetGeoJSON) {
      this.#selectionLayer.addData(streetGeoJSON);
    }
  }

  fitToGuessAndStreet(guessLat, guessLng, targetLat, targetLng) {
    if (!this.#map) return;
    const bounds = L.latLngBounds([[guessLat, guessLng], [targetLat, targetLng]]);
    this.#map.fitBounds(bounds, { padding: [100, 100], maxZoom: 16 });
  }

  clearStreets() {
    if (this.#streetLayer) {
      this.#streetLayer.clearLayers();
    }
    if (this.#selectionLayer) {
      this.#selectionLayer.clearLayers();
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

  showFeedbackLine(guessLat, guessLng, targetLat, targetLng, isCorrect) {
    this.clearFeedback();
    if (this.#selectionLayer) {
      this.#selectionLayer.clearLayers();
    }
    
    this.showFeedback(guessLat, guessLng, isCorrect);
    
    const targetMarker = L.circleMarker([targetLat, targetLng], {
      radius: 8,
      fillColor: '#10b981',
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8
    }).addTo(this.#map);
    this.#feedbackMarkers.push(targetMarker);

    const color = isCorrect ? '#10b981' : '#ef4444';
    this.#feedbackLine = L.polyline([[guessLat, guessLng], [targetLat, targetLng]], {
      color: color,
      weight: 3,
      dashArray: '5, 10',
      opacity: 0.8
    }).addTo(this.#map);
  }

  clearFeedback() {
    this.#feedbackMarkers.forEach(marker => marker.remove());
    this.#feedbackMarkers = [];
    if (this.#feedbackLine) {
      this.#feedbackLine.remove();
      this.#feedbackLine = null;
    }
  }

  setView(center, zoom) {
    this.#map.setView(center, zoom);
  }

  invalidateSize() {
    if (this.#map) {
      this.#map.invalidateSize();
    }
  }

  showMapLoader(message = 'Chargement...', autoHide = false) {
    const mapLoader = document.getElementById('map-loader');
    const mapLoaderMessage = document.getElementById('map-loader-message');
    if (!mapLoader) return;

    if (mapLoaderMessage) {
      mapLoaderMessage.textContent = message;
    }
    mapLoader.classList.remove('hidden');

    if (autoHide) {
      const hideFn = () => this.hideMapLoader();
      if (this.#tileLayer) {
        this.#tileLayer.once('load', hideFn);
      }
      setTimeout(hideFn, 1500);
    }
  }

  hideMapLoader() {
    const mapLoader = document.getElementById('map-loader');
    if (mapLoader) {
      mapLoader.classList.add('hidden');
    }
  }

  #getTilesLoadedPromise() {
    return new Promise((resolve) => {
      if (!this.#tileLayer) {
        resolve();
        return;
      }

      const onTilesLoaded = () => {
        resolve();
      };

      this.#tileLayer.once('load', onTilesLoaded);
      setTimeout(onTilesLoaded, 1500);
    });
  }
}
