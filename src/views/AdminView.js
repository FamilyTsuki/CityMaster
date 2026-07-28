export class AdminView {
  #map;
  #tileLayer;
  #districtsLayer;
  #activePolygonLayer;
  #vertexMarkers;
  #activePoints;
  #activeColor;
  #editingDistrictId;

  constructor() {
    this.#map = null;
    this.#tileLayer = null;
    this.#districtsLayer = null;
    this.#activePolygonLayer = null;
    this.#vertexMarkers = [];
    this.#activePoints = [];
    this.#activeColor = '#f59e0b';
    this.#editingDistrictId = null;

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
      }
    });
  }

  initMap() {
    const mapEl = document.getElementById('admin-map');
    if (!mapEl) return;

    if (!this.#map) {

    this.#map = L.map('admin-map', {
      zoomControl: false,
      minZoom: 11
    }).setView([48.8566, 2.3522], 13);

    L.control.zoom({ position: 'bottomright' }).addTo(this.#map);

    const tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

    this.#tileLayer = L.tileLayer(tileUrl, { maxZoom: 20, maxNativeZoom: 18 }).addTo(this.#map);

    this.#districtsLayer = L.geoJSON(null, {
      style: (feature) => ({
        color: feature.properties?.color || '#f59e0b',
        weight: 3,
        opacity: 0.9,
        fillColor: feature.properties?.color || '#fbbf24',
        fillOpacity: 0.3,
        dashArray: '6, 6'
      }),
      onEachFeature: (feature, layer) => {
        if (feature.properties && feature.properties.name) {
          layer.bindTooltip(feature.properties.name, { permanent: true, direction: 'center', className: 'district-tooltip' });
        }
      }
    }).addTo(this.#map);

    this.#map.on('click', (e) => {
      const editor = document.getElementById('admin-district-editor');
      if (editor && !editor.classList.contains('hidden')) {
        this.#addVertex([e.latlng.lat, e.latlng.lng]);
      }
    });

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        const editor = document.getElementById('admin-district-editor');
        if (editor && !editor.classList.contains('hidden')) {
          const activeEl = document.activeElement;
          if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
            return;
          }
          e.preventDefault();
          this.undo();
        }
      }
    });

    this.#initColorPicker();
    }

    setTimeout(() => {
      if (this.#map) {
        this.#map.invalidateSize();
      }
    }, 100);
  }

  #initColorPicker() {
    const btns = document.querySelectorAll('.color-picker-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => {
          b.classList.remove('active');
          b.style.borderColor = 'transparent';
        });
        btn.classList.add('active');
        btn.style.borderColor = '#fff';
        this.#activeColor = btn.dataset.color || '#f59e0b';
        if (this.#activePolygonLayer) {
          this.#activePolygonLayer.setStyle({
            color: this.#activeColor,
            fillColor: this.#activeColor
          });
        }
      });
    });
  }

  setMapCenter(lat, lng, zoom = 14) {
    if (this.#map) {
      this.#map.setView([lat, lng], zoom);
    }
  }

  renderSavedDistricts(features) {
    if (this.#districtsLayer) {
      this.#districtsLayer.clearLayers();
      if (features && features.length > 0) {
        this.#districtsLayer.addData(features);
      }
    }
  }

  startEditingDistrict(districtFeature = null) {
    this.clearActiveDrawing();
    const editor = document.getElementById('admin-district-editor');
    const titleEl = document.getElementById('admin-editor-title');
    const nameInput = document.getElementById('admin-district-name');

    if (editor) editor.classList.remove('hidden');

    if (districtFeature) {
      this.#editingDistrictId = districtFeature.properties.id;
      if (titleEl) titleEl.textContent = 'Éditer le Quartier';
      if (nameInput) nameInput.value = districtFeature.properties.name || '';
      if (districtFeature.properties.color) {
        this.#activeColor = districtFeature.properties.color;
      }

      if (districtFeature.geometry && districtFeature.geometry.type === 'Polygon') {
        const ring = districtFeature.geometry.coordinates[0] || [];
        ring.forEach(coord => {
          this.#addVertex([coord[1], coord[0]]);
        });
      }
    } else {
      this.#editingDistrictId = null;
      if (titleEl) titleEl.textContent = 'Nouveau Quartier';
      if (nameInput) nameInput.value = '';
    }
  }

  #addVertex(latlng) {
    this.#activePoints.push(latlng);
    this.#updatePolygon();
    this.#renderVertexMarkers();
  }

  #updatePolygon() {
    if (this.#activePolygonLayer) {
      this.#activePolygonLayer.setLatLngs(this.#activePoints);
    } else {
      this.#activePolygonLayer = L.polygon(this.#activePoints, {
        color: this.#activeColor,
        fillColor: this.#activeColor,
        fillOpacity: 0.35,
        weight: 3
      }).addTo(this.#map);
    }
  }

  #renderVertexMarkers() {
    this.#vertexMarkers.forEach(m => m.remove());
    this.#vertexMarkers = [];

    this.#activePoints.forEach((latlng, idx) => {
      const icon = L.divIcon({
        className: 'vertex-handle-icon',
        html: `<div style="width: 14px; height: 14px; background: ${this.#activeColor}; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 8px rgba(0,0,0,0.5); cursor: move;"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      const marker = L.marker(latlng, { icon, draggable: true }).addTo(this.#map);

      marker.on('drag', (e) => {
        const newPos = e.target.getLatLng();
        this.#activePoints[idx] = [newPos.lat, newPos.lng];
        this.#updatePolygon();
      });

      marker.on('contextmenu', (e) => {
        L.DomEvent.stopPropagation(e);
        if (this.#activePoints.length > 3) {
          this.#activePoints.splice(idx, 1);
          this.#updatePolygon();
          this.#renderVertexMarkers();
        }
      });

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
      });

      this.#vertexMarkers.push(marker);
    });
  }

  undo() {
    if (this.#activePoints.length > 0) {
      this.#activePoints.pop();
      if (this.#activePoints.length === 0) {
        if (this.#activePolygonLayer) {
          this.#activePolygonLayer.remove();
          this.#activePolygonLayer = null;
        }
      } else {
        this.#updatePolygon();
      }
      this.#renderVertexMarkers();
    }
  }

  clearActiveDrawing() {
    this.#activePoints = [];
    this.#vertexMarkers.forEach(m => m.remove());
    this.#vertexMarkers = [];
    if (this.#activePolygonLayer) {
      this.#activePolygonLayer.remove();
      this.#activePolygonLayer = null;
    }
    this.#editingDistrictId = null;

    const editor = document.getElementById('admin-district-editor');
    if (editor) editor.classList.add('hidden');
  }

  getActiveDistrictPayload() {
    const nameInput = document.getElementById('admin-district-name');
    const name = nameInput ? nameInput.value.trim() : '';

    if (!name || this.#activePoints.length < 3) {
      return null;
    }

    const ring = this.#activePoints.map(pt => [pt[1], pt[0]]);
    ring.push([this.#activePoints[0][1], this.#activePoints[0][0]]);

    return {
      id: this.#editingDistrictId,
      name,
      color: this.#activeColor,
      coordinates: ring
    };
  }
}
