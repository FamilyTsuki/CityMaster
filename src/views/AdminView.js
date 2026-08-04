export class AdminView {
  #map;
  #tileLayer;
  #districtsLayer;
  #routesLayer;
  #activePolygonLayer;
  #activeLineLayer;
  #vertexMarkers;
  #activePoints;
  #activeRoutePoints;
  #activeColor;
  #editingDistrictId;
  #editingRouteId;
  #editMode;

  constructor() {
    this.#map = null;
    this.#tileLayer = null;
    this.#districtsLayer = null;
    this.#routesLayer = null;
    this.#activePolygonLayer = null;
    this.#activeLineLayer = null;
    this.#vertexMarkers = [];
    this.#activePoints = [];
    this.#activeRoutePoints = [];
    this.#activeColor = '#f59e0b';
    this.#editingDistrictId = null;
    this.#editingRouteId = null;
    this.#editMode = 'district';
    this.onRouteMapClick = null;

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

  setEditMode(mode) {
    this.#editMode = mode;
    this.clearActiveDrawing();
    this.clearActiveRouteDrawing();
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

    const satelliteUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    const cartoUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    const labelsUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png';

    const satelliteLayer = L.tileLayer(satelliteUrl, { maxZoom: 20, maxNativeZoom: 18 });
    const cartoLayer = L.tileLayer(cartoUrl, { maxZoom: 19 });
    const labelsLayer = L.tileLayer(labelsUrl, { maxZoom: 19 });

    this.#tileLayer = satelliteLayer;
    satelliteLayer.addTo(this.#map);
    labelsLayer.addTo(this.#map);

    const routeNamesLayer = L.layerGroup().addTo(this.#map);
    const districtNamesLayer = L.layerGroup().addTo(this.#map);

    const baseMaps = {
      "Satellite": satelliteLayer,
      "Plan (Carto)": cartoLayer
    };

    const overlayMaps = {
      "Nomenclature (Rues)": labelsLayer,
      "Noms des quartiers définis": districtNamesLayer,
      "Noms des routes définies": routeNamesLayer
    };

    L.control.layers(baseMaps, overlayMaps, { position: 'topright' }).addTo(this.#map);

    this.#map.on('overlayadd', (e) => {
      if (e.name === "Noms des routes définies") {
        this.#map.getContainer().classList.remove('hide-route-names');
      }
      if (e.name === "Noms des quartiers définis") {
        this.#map.getContainer().classList.remove('hide-district-names');
      }
    });

    this.#map.on('overlayremove', (e) => {
      if (e.name === "Noms des routes définies") {
        this.#map.getContainer().classList.add('hide-route-names');
      }
      if (e.name === "Noms des quartiers définis") {
        this.#map.getContainer().classList.add('hide-district-names');
      }
    });

    this.#map.on('baselayerchange', (e) => {
      if (e.name === "Satellite") {
        this.#map.getContainer().classList.add('map-satellite-active');
      } else {
        this.#map.getContainer().classList.remove('map-satellite-active');
      }
    });
    
    this.#map.getContainer().classList.add('map-satellite-active');

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

    this.#routesLayer = L.geoJSON(null, {
      style: () => ({
        color: '#3b82f6',
        weight: 4,
        opacity: 0.8,
        fill: false
      }),
      onEachFeature: (feature, layer) => {
        if (feature.properties && feature.properties.name) {
          layer.bindTooltip(feature.properties.name, { permanent: true, direction: 'center', className: 'route-tooltip' });
        }
        layer.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          if (this.#editMode === 'route' && this.onRouteMapClick) {
            this.onRouteMapClick(feature);
          }
        });
      }
    }).addTo(this.#map);

    this.#map.on('click', (e) => {
      if (this.#editMode === 'district') {
        const editor = document.getElementById('admin-district-editor');
        if (editor && !editor.classList.contains('hidden')) {
          this.#addVertex([e.latlng.lat, e.latlng.lng]);
        }
      } else if (this.#editMode === 'route') {
        const editor = document.getElementById('admin-route-editor');
        if (editor && !editor.classList.contains('hidden')) {
          this.#addRouteVertex([e.latlng.lat, e.latlng.lng]);
        }
      }
    });

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
          return;
        }
        
        if (this.#editMode === 'district') {
          const editor = document.getElementById('admin-district-editor');
          if (editor && !editor.classList.contains('hidden')) {
            e.preventDefault();
            this.undo();
          }
        } else if (this.#editMode === 'route') {
          const editor = document.getElementById('admin-route-editor');
          if (editor && !editor.classList.contains('hidden')) {
            e.preventDefault();
            this.undoRoute();
          }
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

  renderSavedRoutes(features) {
    if (this.#routesLayer) {
      this.#routesLayer.clearLayers();
      if (features && features.length > 0) {
        this.#routesLayer.addData(features);
      }
    }
  }



  startEditingDistrict(districtFeature = null) {
    this.#editMode = 'district';
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
      if (this.#activePoints.length > 0 && this.#map) {
        const bounds = L.latLngBounds(this.#activePoints);
        if (bounds.isValid()) {
          this.#map.fitBounds(bounds, { maxZoom: 17, padding: [50, 50] });
        }
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
        html: `<div class="admin-marker" style="background: ${this.#activeColor};"></div>`,
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

  startEditingRoute(routeFeature = null) {
    this.#editMode = 'route';
    this.clearActiveRouteDrawing();
    const editor = document.getElementById('admin-route-editor');
    const titleEl = document.getElementById('admin-editor-title-routes');
    const nameInput = document.getElementById('admin-route-name');

    if (editor) editor.classList.remove('hidden');

    if (routeFeature) {
      this.#editingRouteId = routeFeature.properties.id || routeFeature.properties.name;
      if (titleEl) titleEl.textContent = 'Éditer la Route';
      if (nameInput) nameInput.value = routeFeature.properties.name || '';

      if (routeFeature.geometry) {
        let line = [];
        if (routeFeature.geometry.type === 'LineString') {
          line = routeFeature.geometry.coordinates || [];
        } else if (routeFeature.geometry.type === 'MultiLineString') {
          const coordsArr = routeFeature.geometry.coordinates || [];
          line = coordsArr.length > 0 ? coordsArr[0] : [];
        } else if (routeFeature.geometry.type === 'Point') {
          line = [routeFeature.geometry.coordinates];
        }
        line.forEach(coord => {
          if (Array.isArray(coord) && coord.length >= 2) {
            this.#addRouteVertex([coord[1], coord[0]]);
          }
        });
      }

      if (this.#activeRoutePoints.length > 0 && this.#map) {
        const bounds = L.latLngBounds(this.#activeRoutePoints);
        if (bounds.isValid()) {
          this.#map.fitBounds(bounds, { maxZoom: 17, padding: [50, 50] });
        }
      }
    } else {
      this.#editingRouteId = null;
      if (titleEl) titleEl.textContent = 'Nouvelle Route';
      if (nameInput) nameInput.value = '';
    }
  }

  #addRouteVertex(latlng) {
    this.#activeRoutePoints.push(latlng);
    this.#updateRouteLine();
    this.#renderRouteVertexMarkers();
  }

  #updateRouteLine() {
    if (this.#activeLineLayer) {
      this.#activeLineLayer.setLatLngs(this.#activeRoutePoints);
    } else {
      this.#activeLineLayer = L.polyline(this.#activeRoutePoints, {
        color: '#f43f5e',
        weight: 5,
        fill: false
      }).addTo(this.#map);
    }
  }

  #renderRouteVertexMarkers() {
    this.#vertexMarkers.forEach(m => m.remove());
    this.#vertexMarkers = [];

    this.#activeRoutePoints.forEach((latlng, idx) => {
      const icon = L.divIcon({
        className: 'vertex-handle-icon',
        html: `<div class="admin-marker" style="background: #f43f5e;"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      const marker = L.marker(latlng, { icon, draggable: true }).addTo(this.#map);

      marker.on('drag', (e) => {
        const newPos = e.target.getLatLng();
        this.#activeRoutePoints[idx] = [newPos.lat, newPos.lng];
        this.#updateRouteLine();
      });

      marker.on('contextmenu', (e) => {
        L.DomEvent.stopPropagation(e);
        if (this.#activeRoutePoints.length > 2) {
          this.#activeRoutePoints.splice(idx, 1);
          this.#updateRouteLine();
          this.#renderRouteVertexMarkers();
        }
      });

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
      });

      this.#vertexMarkers.push(marker);
    });
  }

  undoRoute() {
    if (this.#activeRoutePoints.length > 0) {
      this.#activeRoutePoints.pop();
      if (this.#activeRoutePoints.length === 0) {
        if (this.#activeLineLayer) {
          this.#activeLineLayer.remove();
          this.#activeLineLayer = null;
        }
      } else {
        this.#updateRouteLine();
      }
      this.#renderRouteVertexMarkers();
    }
  }

  clearActiveRouteDrawing() {
    this.#activeRoutePoints = [];
    this.#vertexMarkers.forEach(m => m.remove());
    this.#vertexMarkers = [];
    if (this.#activeLineLayer) {
      this.#activeLineLayer.remove();
      this.#activeLineLayer = null;
    }
    this.#editingRouteId = null;

    const editor = document.getElementById('admin-route-editor');
    if (editor) editor.classList.add('hidden');
  }

  getActiveRoutePayload() {
    const nameInput = document.getElementById('admin-route-name');
    const name = nameInput ? nameInput.value.trim() : '';

    if (!name || this.#activeRoutePoints.length < 2) {
      return null;
    }

    const line = this.#activeRoutePoints.map(pt => [pt[1], pt[0]]);

    return {
      id: this.#editingRouteId,
      name,
      coordinates: line
    };
  }
}
