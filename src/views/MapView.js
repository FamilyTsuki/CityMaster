import { I18nService } from '../services/I18nService.js';
import { sanitizeStreetFeature } from '../services/SpatialService.js';

const ONLINE_MAX_NATIVE_ZOOM = 18;
// Tuiles téléchargées d'avance pour jouer hors-ligne : au-delà, Leaflet agrandit
// les tuiles du dernier niveau disponible.
const PREFETCH_MIN_ZOOM = 13;
const PREFETCH_MAX_ZOOM = 16;
const PREFETCH_MAX_TILES = 800;
const PREFETCH_CONCURRENCY = 4;
const TILE_SUBDOMAINS = 'abcd';

export class MapView {
  #map;
  #streetLayer;
  #lotissementLayer;
  #selectionLayer;
  #clickCallback;
  #tempMarker;
  #feedbackMarkers;
  #feedbackLine;
  #boundaryRect;
  #tileLayer;
  #hideLabels;
  #isSatellite;
  #currentStyle;
  #resizeObserver;
  #prefetchedTemplates;

  constructor() {
    this.#map = null;
    this.#streetLayer = null;
    this.#lotissementLayer = null;
    this.#selectionLayer = null;
    this.#clickCallback = null;
    this.#tempMarker = null;
    this.#feedbackMarkers = [];
    this.#feedbackLine = null;
    this.#boundaryRect = null;
    this.#tileLayer = null;
    this.#hideLabels = false;
    this.#isSatellite = false;
    this.#currentStyle = 'street';
    this.#resizeObserver = null;
    this.#prefetchedTemplates = new Set();

    this.#initThemeObserver();
    this.#initSatelliteButton();
    this.#initVisibilityFix();
    this.#initResizeObserver();
  }

  #initVisibilityFix() {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.#map) {
        if (this.#map.dragging && this.#map.dragging.enabled()) {
          this.#map.dragging.disable();
          this.#map.dragging.enable();
        }
        if (this.#map.touchZoom && this.#map.touchZoom.enabled()) {
          this.#map.touchZoom.disable();
          this.#map.touchZoom.enable();
        }
        this.invalidateSize();
      }
    });
  }

  #initResizeObserver() {
    if (typeof ResizeObserver === 'undefined' || typeof document === 'undefined') return;
    const mapEl = document.getElementById('map');
    if (!mapEl) return;

    this.#resizeObserver = new ResizeObserver(() => {
      if (this.#map) {
        this.invalidateSize();
      }
    });
    this.#resizeObserver.observe(mapEl);
  }

  #initThemeObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          this.updateTileUrl();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  }

  #initSatelliteButton() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('#satellite-toggle-btn');
      if (btn) {
        this.toggleSatellite();
      }
    });
  }

  toggleSatellite() {
    this.#isSatellite = !this.#isSatellite;
    this.setMapStyle(this.#isSatellite ? 'satellite' : 'street');
  }

  #getTileUrl() {
    const key = 'cb1_2cy8_1_e3fc326c9e8d112e79406187';
    if (this.#currentStyle === 'satellite' || this.#isSatellite) {
      return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    }

    if (this.#currentStyle === 'dark') {
      return this.#hideLabels
        ? `https://{s}.basemaps.cartocdn.com/rastertiles/dark_nolabels/{z}/{x}/{y}{r}.png?key=${key}`
        : `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=${key}`;
    }

    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    if (theme === 'dark') {
      return this.#hideLabels
        ? `https://{s}.basemaps.cartocdn.com/rastertiles/dark_nolabels/{z}/{x}/{y}{r}.png?key=${key}`
        : `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=${key}`;
    }

    return this.#hideLabels
      ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png?key=${key}`
      : `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${key}`;
  }

  /**
   * Hors-ligne, la carte n'affiche que les niveaux de zoom téléchargés d'avance
   * (agrandis au-delà) au lieu de tuiles grises.
   * @param {boolean} offline
   */
  setOfflineMode(offline) {
    if (!this.#tileLayer) return;
    const maxNativeZoom = offline ? PREFETCH_MAX_ZOOM : ONLINE_MAX_NATIVE_ZOOM;
    if (this.#tileLayer.options.maxNativeZoom === maxNativeZoom) return;
    this.#tileLayer.options.maxNativeZoom = maxNativeZoom;
    this.#tileLayer.redraw();
  }

  /**
   * Télécharge en arrière-plan les tuiles du style courant couvrant la ville,
   * pour qu'elle reste jouable hors-ligne. Le service worker les conserve.
   * Les niveaux de zoom sont ajoutés tant que le total reste sous
   * PREFETCH_MAX_TILES ; rien n'est fait en mode économie de données.
   * @param {string|null} bboxString "sud,ouest,nord,est"
   */
  async prefetchCityTiles(bboxString) {
    if (!bboxString || typeof L === 'undefined') return;
    if (typeof navigator !== 'undefined' && navigator.connection?.saveData) return;

    const parts = bboxString.split(',').map(Number);
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return;
    const south = Math.min(parts[0], parts[2]);
    const north = Math.max(parts[0], parts[2]);
    const west = Math.min(parts[1], parts[3]);
    const east = Math.max(parts[1], parts[3]);

    const template = this.#getTileUrl();
    const prefetchKey = `${template}|${bboxString}`;
    if (this.#prefetchedTemplates.has(prefetchKey)) return;
    this.#prefetchedTemplates.add(prefetchKey);

    const urls = [];
    for (let z = PREFETCH_MIN_ZOOM; z <= PREFETCH_MAX_ZOOM; z++) {
      const xMin = lngToTileX(west, z);
      const xMax = lngToTileX(east, z);
      const yMin = latToTileY(north, z);
      const yMax = latToTileY(south, z);
      const count = (xMax - xMin + 1) * (yMax - yMin + 1);
      if (urls.length + count > PREFETCH_MAX_TILES) break;
      for (let x = xMin; x <= xMax; x++) {
        for (let y = yMin; y <= yMax; y++) {
          urls.push(
            L.Util.template(template, {
              s: TILE_SUBDOMAINS[Math.abs(x + y) % TILE_SUBDOMAINS.length],
              x,
              y,
              z,
              r: L.Browser.retina ? '@2x' : '',
            }),
          );
        }
      }
    }

    let next = 0;
    const worker = async () => {
      while (next < urls.length) {
        const url = urls[next++];
        try {
          await fetch(url, { mode: 'cors', credentials: 'omit' });
        } catch {
          return;
        }
      }
    };
    await Promise.all(Array.from({ length: PREFETCH_CONCURRENCY }, worker));
  }

  updateTileUrl() {
    if (!this.#tileLayer) return;
    this.#tileLayer.setUrl(this.#getTileUrl());
  }

  setMapStyle(styleType) {
    this.#currentStyle = styleType;
    this.#isSatellite = styleType === 'satellite';
    const mapEl = document.getElementById('map');
    const btn = document.getElementById('satellite-toggle-btn');
    if (mapEl) {
      if (this.#isSatellite) {
        mapEl.classList.add('map-satellite-active');
      } else {
        mapEl.classList.remove('map-satellite-active');
      }
    }
    if (btn) {
      if (this.#isSatellite) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
    this.updateTileUrl();
  }

  initMap(centerCoordinates = [48.8566, 2.3522], zoom = 14, bboxString = null, hideLabels = false) {
    this.#hideLabels = hideLabels;
    const tileUrl = this.#getTileUrl();

    if (this.#map) {
      if (this.#tileLayer) {
        this.#tileLayer.setUrl(tileUrl);
      }
      this.showMapLoader(null, true);
      this.#map.setView(centerCoordinates, zoom);
      if (bboxString) {
        const parts = bboxString.split(',').map(Number);
        if (parts.length === 4) {
          const rawBounds = L.latLngBounds([parts[0], parts[1]], [parts[2], parts[3]]);
          const bounds = rawBounds.pad(0.30);
          this.#map.setMaxBounds(bounds);
          const calculatedMinZoom = Math.max(10, this.#map.getBoundsZoom(bounds, true));
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
        this.#map.setMinZoom(10);
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
      minZoom: 10,
      maxBoundsViscosity: 1.0,
      preferCanvas: true
    };

    if (bboxString) {
      const parts = bboxString.split(',').map(Number);
      if (parts.length === 4) {
        const rawBounds = L.latLngBounds([parts[0], parts[1]], [parts[2], parts[3]]);
        options.maxBounds = rawBounds.pad(0.30);
      }
    }

    this.#map = L.map('map', options).setView(centerCoordinates, zoom);

    if (bboxString && options.maxBounds) {
      const calculatedMinZoom = Math.max(10, this.#map.getBoundsZoom(options.maxBounds, true));
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

    this.#tileLayer = L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
      maxNativeZoom: ONLINE_MAX_NATIVE_ZOOM,
      keepBuffer: 8,
      updateWhenIdle: false,
      updateInterval: 100,
      crossOrigin: true
    }).addTo(this.#map);

    this.#attachTileAutoRetry(this.#tileLayer);
    this.#initResizeObserver();

    this.showMapLoader(null, true);

    this.#streetLayer = L.geoJSON(null, {
      style: (feature) => {
        const isPoly = feature && (
          feature.properties?.isLotissement ||
          feature.geometry?.type === 'Polygon' ||
          feature.geometry?.type === 'MultiPolygon'
        );
        if (isPoly) {
          return {
            color: feature.properties?.color || '#2563eb',
            weight: 3,
            opacity: 0.9,
            fillColor: feature.properties?.color || '#3b82f6',
            fillOpacity: 0.35,
            dashArray: '6, 6'
          };
        }
        return {
          color: '#2563eb',
          weight: 4,
          opacity: 0.8
        };
      }
    }).addTo(this.#map);

    this.#lotissementLayer = L.geoJSON(null, {
      style: () => {
        return {
          color: '#6b7280',
          weight: 2,
          opacity: 0.6,
          fillOpacity: 0,
          interactive: false,
          dashArray: '4, 4'
        };
      }
    }).addTo(this.#map);

    this.#selectionLayer = L.geoJSON(null, {
      style: (feature) => {
        const isPoly = feature && (
          feature.properties?.isLotissement ||
          feature.geometry?.type === 'Polygon' ||
          feature.geometry?.type === 'MultiPolygon'
        );
        if (isPoly) {
          return {
            color: feature.properties?.color || '#f59e0b',
            weight: 3,
            opacity: 0.9,
            fillColor: feature.properties?.color || '#fbbf24',
            fillOpacity: 0.35,
            dashArray: '6, 6'
          };
        }
        return {
          color: '#10b981',
          weight: 8,
          opacity: 0.9
        };
      }
    }).addTo(this.#map);

    this.#map.on('click', (event) => {
      if (this.#clickCallback) {
        this.#clickCallback(event.latlng.lat, event.latlng.lng);
      }
    });

    let resizeTimeout = null;
    window.addEventListener('resize', () => {
      if (resizeTimeout) cancelAnimationFrame(resizeTimeout);
      resizeTimeout = requestAnimationFrame(() => {
        this.invalidateSize();
      });
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

  renderLotissements(features) {
    if (this.#lotissementLayer) {
      this.#lotissementLayer.clearLayers();
      if (features && features.length > 0) {
        this.#lotissementLayer.addData({ type: 'FeatureCollection', features });
      }
    }
  }

  renderStreet(streetGeoJSON, visible = true) {
    if (this.#streetLayer) {
      this.#streetLayer.clearLayers();
    }
    if (visible && streetGeoJSON) {
      const sanitized = sanitizeStreetFeature(streetGeoJSON);
      this.#streetLayer.addData(sanitized);
    }
  }

  renderSelection(streetGeoJSON, visible = true) {
    if (this.#selectionLayer) {
      this.#selectionLayer.clearLayers();
    }
    if (visible && streetGeoJSON) {
      const sanitized = sanitizeStreetFeature(streetGeoJSON);
      this.#selectionLayer.addData(sanitized);
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
    if (this.#lotissementLayer) {
      this.#lotissementLayer.clearLayers();
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
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => {
          if (this.#map) {
            this.#map.invalidateSize();
          }
        });
      }
      setTimeout(() => {
        if (this.#map) {
          this.#map.invalidateSize();
        }
      }, 200);
      setTimeout(() => {
        if (this.#map) {
          this.#map.invalidateSize();
        }
      }, 500);
    }
  }

  #attachTileAutoRetry(layer) {
    if (!layer || typeof layer.on !== 'function') return;
    layer.on('tileerror', (error) => {
      const tile = error && error.tile;
      if (!tile) return;
      const retryCount = Number(tile.getAttribute('data-retry-count') || 0);
      if (retryCount < 3) {
        tile.setAttribute('data-retry-count', retryCount + 1);
        const delay = (retryCount + 1) * 600;
        setTimeout(() => {
          if (tile && tile.src) {
            const rawUrl = tile.src.split('&cm_retry=')[0];
            const separator = rawUrl.includes('?') ? '&' : '?';
            tile.src = `${rawUrl}${separator}cm_retry=${Date.now()}`;
          }
        }, delay);
      }
    });
  }

  showMapLoader(message = null, autoHide = false) {
    const mapLoader = document.getElementById('map-loader');
    const mapLoaderMessage = document.getElementById('map-loader-message');
    if (!mapLoader) return;

    if (mapLoaderMessage) {
      mapLoaderMessage.textContent =
        message ||
        I18nService.getInstance().t(
          'game.loading_geo',
          {},
          'Chargement des données géographiques...',
        );
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

function lngToTileX(lng, zoom) {
  return Math.floor(((lng + 180) / 360) * 2 ** zoom);
}

function latToTileY(lat, zoom) {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom,
  );
}
