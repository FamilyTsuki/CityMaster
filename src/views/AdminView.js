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
    const cartoUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const satelliteLayer = L.tileLayer(satelliteUrl, { maxZoom: 20, maxNativeZoom: 18 });
    const cartoLayer = L.tileLayer(cartoUrl, { maxZoom: 19 });

    this.#tileLayer = satelliteLayer;
    satelliteLayer.addTo(this.#map);

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
        });
        btn.classList.add('active');
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

  showToast(message, type = 'error') {
    const toastEl = document.getElementById('admin-toast');
    if (!toastEl) return;

    toastEl.textContent = message;
    toastEl.className = `admin-toast toast-${type}`;
    toastEl.classList.remove('hidden');

    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toastEl.classList.add('hidden');
    }, 4000);
  }

  renderDistrictList(districts) {
    const listEl = document.getElementById('admin-district-list');
    const countEl = document.getElementById('admin-district-count');
    if (countEl) countEl.textContent = districts.length;
    if (!listEl) return;
    listEl.replaceChildren();
    if (districts.length === 0) {
      const li = document.createElement('li');
      li.className = 'district-list-empty';
      li.textContent = 'Aucun quartier défini.';
      listEl.appendChild(li);
      return;
    }
    districts.forEach(d => {
      const li = document.createElement('li');
      li.className = 'route-list-item';
      const infoDiv = document.createElement('div');
      infoDiv.className = 'route-list-info';
      const colorDot = document.createElement('div');
      colorDot.className = 'district-color-dot';
      colorDot.style.setProperty('--dot-color', d.properties.color || '#3b82f6');
      const strongName = document.createElement('strong');
      strongName.className = 'route-list-name';
      strongName.textContent = d.properties.name;
      infoDiv.append(colorDot, strongName);

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'route-list-actions';
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn-edit-item btn-edit-district';
      editBtn.dataset.id = d.properties.id || d.properties.name;
      editBtn.dataset.name = d.properties.name;
      editBtn.textContent = 'Éditer';

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn-delete-item btn-delete-district';
      deleteBtn.dataset.id = d.properties.id || d.properties.name;
      deleteBtn.textContent = 'Supprimer';

      actionsDiv.append(editBtn, deleteBtn);
      li.append(infoDiv, actionsDiv);
      listEl.appendChild(li);
    });
  }

  renderRouteList(displayRoutes, difficultyMode, groupedRoutes) {
    const listEl = document.getElementById('admin-route-list');
    const countEl = document.getElementById('admin-route-count');
    const modeTextEl = document.getElementById('admin-route-mode-text');

    if (modeTextEl) {
      const modeLabels = {
        length: 'Par longueur (Longueur >800m / 250m-800m / <250m)',
        nomenclature: 'Par nomenclature (Grands axes vs Voies secondaires)',
        center: 'Par centre-ville (Densité de croisements)'
      };
      modeTextEl.textContent = modeLabels[difficultyMode] || difficultyMode;
    }

    if (countEl) countEl.textContent = displayRoutes.length;
    if (!listEl) return;
    listEl.replaceChildren();

    if (displayRoutes.length === 0) {
      const li = document.createElement('li');
      li.className = 'district-list-empty';
      li.textContent = 'Aucune route ne correspond.';
      listEl.appendChild(li);
      return;
    }

    const renderGroup = (routes, title, color) => {
      if (routes.length === 0) return;
      const header = document.createElement('div');
      header.className = 'route-difficulty-header';
      header.style.setProperty('--diff-color', color);
      header.textContent = `${title} (${routes.length})`;
      listEl.appendChild(header);

      routes.forEach(r => {
        const li = document.createElement('li');
        li.className = 'route-list-item';
        li.dataset.name = r.properties.name;

        const infoDiv = document.createElement('div');
        infoDiv.className = 'route-list-info';
        
        const svgIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgIcon.setAttribute('viewBox', '0 0 24 24');
        svgIcon.setAttribute('fill', 'none');
        svgIcon.setAttribute('stroke', color);
        svgIcon.setAttribute('stroke-width', '2');
        svgIcon.setAttribute('stroke-linecap', 'round');
        svgIcon.setAttribute('stroke-linejoin', 'round');
        svgIcon.setAttribute('class', 'route-list-icon');
        const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z');
        svgIcon.appendChild(pathEl);

        const strongName = document.createElement('strong');
        strongName.className = 'route-list-name';
        strongName.textContent = r.properties.name;
        infoDiv.append(svgIcon, strongName);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'route-list-actions';
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'btn-edit-item btn-edit-route';
        editBtn.dataset.id = r.properties.id || r.properties.name;
        editBtn.dataset.name = r.properties.name;
        editBtn.textContent = 'Éditer';

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn-delete-item btn-delete-route';
        deleteBtn.dataset.id = r.properties.id || r.properties.name;
        deleteBtn.textContent = 'Supprimer';

        actionsDiv.append(editBtn, deleteBtn);
        li.append(infoDiv, actionsDiv);
        listEl.appendChild(li);
      });
    };

    renderGroup(groupedRoutes.easy, 'Facile', '#10b981');
    renderGroup(groupedRoutes.medium, 'Moyen', '#f59e0b');
    renderGroup(groupedRoutes.hard, 'Difficile', '#ef4444');
  }

  renderReportsList(reports, onResolve, onDismiss, onDelete, onCopy) {
    const grid = document.getElementById('admin-reports-grid');
    const emptyMsg = document.getElementById('admin-reports-empty');
    if (!grid) return;
    grid.replaceChildren();

    if (!reports || reports.length === 0) {
      if (emptyMsg) emptyMsg.classList.remove('hidden');
      return;
    }

    if (emptyMsg) emptyMsg.classList.add('hidden');

    const categoryLabels = {
      street_name: 'Rue mal nommée',
      difficulty: 'Mauvaise difficulté',
      map_error: 'Erreur de tracé',
      other: 'Autre problème'
    };

    reports.forEach(r => {
      const card = document.createElement('div');
      card.className = 'report-card';

      const dateStr = new Date(r.created_at).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const categoryName = categoryLabels[r.category] || r.category;
      const statusClass = `status-${r.status || 'pending'}`;
      const statusLabels = { pending: 'En attente', resolved: 'Résolu', dismissed: 'Ignoré' };
      const statusText = statusLabels[r.status] || r.status;

      const safeTarget = (r.target_street && r.target_street !== 'Inconnue' && r.target_street !== 'N/A') ? r.target_street : null;
      const safeClicked = (r.clicked_street && r.clicked_street !== 'N/A') ? r.clicked_street : null;

      const headerDiv = document.createElement('div');
      headerDiv.className = 'report-card-header';
      
      const catTag = document.createElement('span');
      catTag.className = 'report-category-tag';
      catTag.textContent = categoryName;
      
      const statusBadge = document.createElement('span');
      statusBadge.className = `report-status-badge ${statusClass}`;
      statusBadge.textContent = statusText;
      headerDiv.append(catTag, statusBadge);

      const metaDiv = document.createElement('div');
      metaDiv.className = 'report-meta-list';

      const dateSpan = document.createElement('span');
      const dateLabel = document.createElement('strong');
      dateLabel.textContent = 'Date : ';
      dateSpan.append(dateLabel, dateStr);

      const userSpan = document.createElement('span');
      const userLabel = document.createElement('strong');
      userLabel.textContent = 'Joueur : ';
      userSpan.append(userLabel, r.username || 'Anonyme');

      const citySpan = document.createElement('span');
      const cityLabel = document.createElement('strong');
      cityLabel.textContent = 'Commune : ';
      citySpan.append(cityLabel, `${r.city_key || 'N/A'} (Mode: ${r.game_mode || 'N/A'}, Diff: ${r.difficulty || 'N/A'})`);

      metaDiv.append(dateSpan, userSpan, citySpan);

      const targetSpan = document.createElement('span');
      const targetLabel = document.createElement('strong');
      targetLabel.textContent = 'Rue cible : ';
      targetSpan.append(targetLabel, `${r.target_street || 'N/A'} `);

      if (safeTarget) {
        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'btn-copy-street';
        copyBtn.textContent = '📋 Copier';
        copyBtn.addEventListener('click', () => onCopy(safeTarget));
        targetSpan.appendChild(copyBtn);
      }
      metaDiv.appendChild(targetSpan);

      if (r.clicked_street) {
        const clickedSpan = document.createElement('span');
        const clickedLabel = document.createElement('strong');
        clickedLabel.textContent = 'Rue cliquée : ';
        clickedSpan.append(clickedLabel, `${r.clicked_street} `);
        if (safeClicked) {
          const copyBtn = document.createElement('button');
          copyBtn.type = 'button';
          copyBtn.className = 'btn-copy-street';
          copyBtn.textContent = '📋 Copier';
          copyBtn.addEventListener('click', () => onCopy(safeClicked));
          clickedSpan.appendChild(copyBtn);
        }
        metaDiv.appendChild(clickedSpan);
      }

      const descDiv = document.createElement('div');
      descDiv.className = 'report-description-text';
      descDiv.textContent = r.description;

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'report-card-actions';

      if (r.status !== 'resolved') {
        const resolveBtn = document.createElement('button');
        resolveBtn.type = 'button';
        resolveBtn.className = 'btn btn-small btn-resolve-report';
        resolveBtn.textContent = 'Marquer résolu';
        resolveBtn.addEventListener('click', () => onResolve(r.id));
        actionsDiv.appendChild(resolveBtn);
      }

      if (r.status !== 'dismissed') {
        const dismissBtn = document.createElement('button');
        dismissBtn.type = 'button';
        dismissBtn.className = 'btn btn-small btn-secondary btn-dismiss-report';
        dismissBtn.textContent = 'Ignorer';
        dismissBtn.addEventListener('click', () => onDismiss(r.id));
        actionsDiv.appendChild(dismissBtn);
      }

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-small btn-delete-item btn-delete-report';
      deleteBtn.textContent = 'Supprimer';
      deleteBtn.addEventListener('click', () => onDelete(r.id));
      actionsDiv.appendChild(deleteBtn);

      card.append(headerDiv, metaDiv, descDiv, actionsDiv);
      grid.appendChild(card);
    });
  }
}
