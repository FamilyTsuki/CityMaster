import { I18nService } from "../services/I18nService.js";
import { escapeHTML } from "../utils/security.js";
import { isPlaceStreet } from "../services/RouteDifficultyService.js";

export class AdminView {
  #map;
  #districtsLayer;
  #routesLayer;
  #highlightedRouteLayer;
  #highlightedDistrictLayer;
  #activePolygonLayer;
  #activeLineLayer;
  #vertexMarkers;
  #activePoints;
  #activeRouteSegments;
  #activeColor;
  #editingDistrictId;
  #originalDistrictName;
  #editingRouteId;
  #originalRouteName;
  #editMode;

  constructor() {
    this.#map = null;
    this.#districtsLayer = null;
    this.#routesLayer = null;
    this.#highlightedRouteLayer = null;
    this.#highlightedDistrictLayer = null;
    this.#activePolygonLayer = null;
    this.#activeLineLayer = null;
    this.#vertexMarkers = [];
    this.#activePoints = [];
    this.#activeRouteSegments = [];
    this.#activeColor = "#f59e0b";
    this.#editingDistrictId = null;
    this.#originalDistrictName = null;
    this.#editingRouteId = null;
    this.#originalRouteName = null;
    this.#editMode = "district";
    this.onRouteMapClick = null;

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && this.#map) {
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
    const mapEl = document.getElementById("admin-map");
    if (!mapEl) return;

    if (!this.#map) {
      this.#map = L.map("admin-map", {
        zoomControl: false,
        minZoom: 11,
      }).setView([48.8566, 2.3522], 13);

      L.control.zoom({ position: "bottomright" }).addTo(this.#map);

      const key = "cb1_2cy8_1_e3fc326c9e8d112e79406187";

      const attachTileErrorRetry = (layer) => {
        if (!layer || typeof layer.on !== "function") return;
        layer.on("tileerror", (error) => {
          const tile = error && error.tile;
          if (!tile) return;
          const retryCount = Number(tile.getAttribute("data-retry-count") || 0);
          if (retryCount < 3) {
            tile.setAttribute("data-retry-count", retryCount + 1);
            const delay = (retryCount + 1) * 600;
            setTimeout(() => {
              if (tile && tile.src) {
                const rawUrl = tile.src.split("&cm_retry=")[0];
                const sep = rawUrl.includes("?") ? "&" : "?";
                tile.src = `${rawUrl}${sep}cm_retry=${Date.now()}`;
              }
            }, delay);
          }
        });
      };

      const satelliteLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 20,
          maxNativeZoom: 18,
          keepBuffer: 8,
          crossOrigin: true,
          attribution:
            "&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
        },
      );

      const streetLayer = L.tileLayer(
        `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${key}`,
        {
          maxZoom: 20,
          subdomains: "abcd",
          keepBuffer: 8,
          crossOrigin: true,
          attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
        },
      );

      const darkLayer = L.tileLayer(
        `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=${key}`,
        {
          maxZoom: 20,
          subdomains: "abcd",
          keepBuffer: 8,
          crossOrigin: true,
          attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
        },
      );

      attachTileErrorRetry(satelliteLayer);
      attachTileErrorRetry(streetLayer);
      attachTileErrorRetry(darkLayer);

      satelliteLayer.addTo(this.#map);

      const routeNamesLayer = L.layerGroup().addTo(this.#map);
      const districtNamesLayer = L.layerGroup().addTo(this.#map);

      const baseMaps = {
        "Vue Satellite": satelliteLayer,
        "Plan Urbain Standard": streetLayer,
        "Mode Sombre": darkLayer,
      };

      const overlayMaps = {
        "Noms des quartiers définis": districtNamesLayer,
        "Noms des routes définies": routeNamesLayer,
      };

      L.control
        .layers(baseMaps, overlayMaps, { position: "topright" })
        .addTo(this.#map);

      this.#map.on("overlayadd", (e) => {
        if (e.name === "Noms des routes définies") {
          this.#map.getContainer().classList.remove("hide-route-names");
        }
        if (e.name === "Noms des quartiers définis") {
          this.#map.getContainer().classList.remove("hide-district-names");
        }
      });

      this.#map.on("overlayremove", (e) => {
        if (e.name === "Noms des routes définies") {
          this.#map.getContainer().classList.add("hide-route-names");
        }
        if (e.name === "Noms des quartiers définis") {
          this.#map.getContainer().classList.add("hide-district-names");
        }
      });

      this.#map.on("baselayerchange", (e) => {
        if (e.name === "Vue Satellite") {
          this.#map.getContainer().classList.add("map-satellite-active");
        } else {
          this.#map.getContainer().classList.remove("map-satellite-active");
        }
      });

      this.#map.getContainer().classList.add("map-satellite-active");

      this.#districtsLayer = L.geoJSON(null, {
        style: (feature) => ({
          color: feature.properties?.color || "#f59e0b",
          weight: 3,
          opacity: 0.9,
          fillColor: feature.properties?.color || "#fbbf24",
          fillOpacity: 0.3,
          dashArray: "6, 6",
        }),
        onEachFeature: (feature, layer) => {
          if (feature.properties && feature.properties.name) {
            layer.bindTooltip(escapeHTML(feature.properties.name), {
              permanent: true,
              direction: "center",
              className: "district-tooltip",
            });
          }
        },
      }).addTo(this.#map);

      this.#routesLayer = L.geoJSON(null, {
        style: () => ({
          color: "#3b82f6",
          weight: 4,
          opacity: 0.8,
          fill: false,
        }),
        onEachFeature: (feature, layer) => {
          if (feature.properties && feature.properties.name) {
            layer.bindTooltip(escapeHTML(feature.properties.name), {
              permanent: true,
              direction: "center",
              className: "route-tooltip",
            });
          }
          layer.on("click", (e) => {
            L.DomEvent.stopPropagation(e);
            if (this.#editMode === "route" && this.onRouteMapClick) {
              this.onRouteMapClick(feature, layer, e);
            }
          });
        },
      }).addTo(this.#map);

      this.#map.on("click", (e) => {
        if (this.#editMode === "district") {
          const editor = document.getElementById("admin-district-editor");
          if (editor && !editor.classList.contains("hidden")) {
            this.#addVertex([e.latlng.lat, e.latlng.lng]);
          }
        } else if (this.#editMode === "route") {
          const editor = document.getElementById("admin-route-editor");
          if (editor && !editor.classList.contains("hidden")) {
            this.#addRouteVertex([e.latlng.lat, e.latlng.lng]);
          }
        }
      });

      window.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
          const activeEl = document.activeElement;
          if (
            activeEl &&
            (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")
          ) {
            return;
          }

          if (this.#editMode === "district") {
            const editor = document.getElementById("admin-district-editor");
            if (editor && !editor.classList.contains("hidden")) {
              e.preventDefault();
              this.undo();
            }
          } else if (this.#editMode === "route") {
            const editor = document.getElementById("admin-route-editor");
            if (editor && !editor.classList.contains("hidden")) {
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
    const btns = document.querySelectorAll(".color-picker-btn");
    btns.forEach((btn) => {
      btn.addEventListener("click", () => {
        btns.forEach((b) => {
          b.classList.remove("active");
        });
        btn.classList.add("active");
        this.#activeColor = btn.dataset.color || "#f59e0b";
        if (this.#activePolygonLayer) {
          this.#activePolygonLayer.setStyle({
            color: this.#activeColor,
            fillColor: this.#activeColor,
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

  clearHighlight() {
    if (this.#highlightedRouteLayer) {
      this.#highlightedRouteLayer.clearLayers();
    }
    if (this.#highlightedDistrictLayer) {
      this.#highlightedDistrictLayer.clearLayers();
    }
  }

  highlightRoute(routeFeature) {
    if (!this.#map || !routeFeature) return;
    this.clearHighlight();

    if (!this.#highlightedRouteLayer) {
      this.#highlightedRouteLayer = L.geoJSON(null, {
        style: () => ({
          color: "#f43f5e",
          weight: 8,
          opacity: 0.95,
          fill: false,
          lineCap: "round",
          lineJoin: "round",
        }),
      }).addTo(this.#map);
    }

    this.#highlightedRouteLayer.addData(routeFeature);
    this.#highlightedRouteLayer.bringToFront();

    const tempLayer = L.geoJSON(routeFeature);
    const bounds = tempLayer.getBounds();
    if (bounds.isValid()) {
      if (bounds.getSouthWest().equals(bounds.getNorthEast())) {
        this.#map.setView(bounds.getCenter(), 17);
      } else {
        this.#map.fitBounds(bounds, { maxZoom: 17, padding: [50, 50] });
      }
    }
  }

  highlightDistrict(districtFeature) {
    if (!this.#map || !districtFeature) return;
    this.clearHighlight();

    if (!this.#highlightedDistrictLayer) {
      this.#highlightedDistrictLayer = L.geoJSON(null, {
        style: (feature) => ({
          color: feature?.properties?.color || "#f59e0b",
          weight: 5,
          opacity: 1,
          fillColor: feature?.properties?.color || "#f59e0b",
          fillOpacity: 0.5,
        }),
      }).addTo(this.#map);
    }

    this.#highlightedDistrictLayer.addData(districtFeature);
    this.#highlightedDistrictLayer.bringToFront();

    const tempLayer = L.geoJSON(districtFeature);
    const bounds = tempLayer.getBounds();
    if (bounds.isValid()) {
      if (bounds.getSouthWest().equals(bounds.getNorthEast())) {
        this.#map.setView(bounds.getCenter(), 17);
      } else {
        this.#map.fitBounds(bounds, { maxZoom: 17, padding: [50, 50] });
      }
    }
  }

  renderSavedDistricts(features) {
    this.clearHighlight();
    if (this.#districtsLayer) {
      this.#districtsLayer.clearLayers();
      if (features && features.length > 0) {
        this.#districtsLayer.addData(features);
      }
    }
  }

  renderSavedRoutes(features) {
    this.clearHighlight();
    if (this.#routesLayer) {
      this.#routesLayer.clearLayers();
      if (features && features.length > 0) {
        this.#routesLayer.addData(features);
      }
    }
  }

  startEditingDistrict(districtFeature = null) {
    this.#editMode = 'district';
    this.clearHighlight();
    this.clearActiveDrawing();
    const editor = document.getElementById('admin-district-editor');
    const titleEl = document.getElementById('admin-editor-title');
    const nameInput = document.getElementById('admin-district-name');

    if (editor) {
      editor.classList.remove('hidden');
      const sidebar = editor.closest('.admin-sidebar');
      if (sidebar) sidebar.scrollTop = 0;
      editor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    if (districtFeature) {
      this.#editingDistrictId =
        districtFeature.properties?.id ||
        districtFeature.id ||
        districtFeature.properties?.name;
      this.#originalDistrictName =
        districtFeature.properties?.originalName ||
        districtFeature.properties?.name ||
        null;
      if (titleEl)
        titleEl.textContent = I18nService.getInstance().t(
          'admin.edit_district',
          {},
          'Éditer le Quartier',
        );
      if (nameInput) {
        nameInput.value = districtFeature.properties?.name || '';
        setTimeout(() => nameInput.focus(), 50);
      }
      if (districtFeature.properties?.color) {
        this.#activeColor = districtFeature.properties.color;
      }

      if (districtFeature.geometry) {
        let ring = [];
        if (districtFeature.geometry.type === 'Polygon') {
          ring = districtFeature.geometry.coordinates[0] || [];
        } else if (districtFeature.geometry.type === 'MultiPolygon') {
          const firstPoly = districtFeature.geometry.coordinates[0] || [];
          ring = firstPoly[0] || [];
        }
        if (
          ring.length > 1 &&
          ring[0][0] === ring[ring.length - 1][0] &&
          ring[0][1] === ring[ring.length - 1][1]
        ) {
          ring = ring.slice(0, -1);
        }
        ring.forEach((coord) => {
          this.#addVertex([coord[1], coord[0]]);
        });
      }
      if (this.#activePoints.length > 0 && this.#map) {
        const bounds = L.latLngBounds(this.#activePoints);
        if (bounds.isValid()) {
          this.#map.invalidateSize();
          this.#map.fitBounds(bounds, { maxZoom: 17, padding: [50, 50] });
        }
      }
    } else {
      this.#editingDistrictId = null;
      this.#originalDistrictName = null;
      if (titleEl)
        titleEl.textContent = I18nService.getInstance().t(
          'admin.new_district',
          {},
          'Nouveau Quartier',
        );
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
        weight: 3,
      }).addTo(this.#map);
    }
  }

  #renderVertexMarkers() {
    this.#vertexMarkers.forEach((m) => m.remove());
    this.#vertexMarkers = [];

    this.#activePoints.forEach((latlng, idx) => {
      const icon = L.divIcon({
        className: "vertex-handle-icon",
        html: `<div class="admin-marker" style="background: ${this.#activeColor};"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const marker = L.marker(latlng, { icon, draggable: true }).addTo(
        this.#map,
      );

      marker.on("drag", (e) => {
        const newPos = e.target.getLatLng();
        this.#activePoints[idx] = [newPos.lat, newPos.lng];
        this.#updatePolygon();
      });

      marker.on("contextmenu", (e) => {
        L.DomEvent.stopPropagation(e);
        if (this.#activePoints.length > 3) {
          this.#activePoints.splice(idx, 1);
          this.#updatePolygon();
          this.#renderVertexMarkers();
        }
      });

      marker.on("click", (e) => {
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
    this.#vertexMarkers.forEach((m) => m.remove());
    this.#vertexMarkers = [];
    if (this.#activePolygonLayer) {
      this.#activePolygonLayer.remove();
      this.#activePolygonLayer = null;
    }
    this.#editingDistrictId = null;
    this.#originalDistrictName = null;

    const editor = document.getElementById("admin-district-editor");
    if (editor) editor.classList.add("hidden");
  }

  getActiveDistrictPayload() {
    const nameInput = document.getElementById("admin-district-name");
    const name = nameInput ? nameInput.value.trim() : "";

    if (!name || this.#activePoints.length < 3) {
      return null;
    }

    const ring = this.#activePoints.map((pt) => [pt[1], pt[0]]);
    ring.push([this.#activePoints[0][1], this.#activePoints[0][0]]);

    return {
      id: this.#editingDistrictId,
      originalName: this.#originalDistrictName,
      name,
      color: this.#activeColor,
      coordinates: ring,
    };
  }

  startEditingRoute(routeFeature = null, currentDifficulty = "auto") {
    this.#editMode = "route";
    this.clearHighlight();
    this.clearActiveRouteDrawing();
    const editor = document.getElementById("admin-route-editor");
    const titleEl = document.getElementById("admin-editor-title-routes");
    const nameInput = document.getElementById("admin-route-name");
    const diffSelect = document.getElementById("admin-route-difficulty");

    if (editor) {
      editor.classList.remove("hidden");
      const sidebar = editor.closest(".admin-sidebar");
      if (sidebar) sidebar.scrollTop = 0;
      editor.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    if (diffSelect) diffSelect.value = currentDifficulty || "auto";

    if (this.#map) {
      this.#map.getContainer().classList.add("admin-editing-route");
    }

    if (routeFeature) {
      this.#editingRouteId =
        routeFeature.properties?.id ||
        routeFeature.id ||
        routeFeature.properties?.name;
      this.#originalRouteName =
        routeFeature.properties?.originalName ||
        routeFeature.properties?.name ||
        null;
      if (titleEl)
        titleEl.textContent = I18nService.getInstance().t(
          "admin.edit_route",
          {},
          "Éditer la Route",
        );
      if (nameInput) {
        nameInput.value = routeFeature.properties?.name || "";
        setTimeout(() => nameInput.focus(), 50);
      }

      if (this.#routesLayer) {
        this.#routesLayer.eachLayer((layer) => {
          if (
            layer.feature &&
            layer.getTooltip &&
            (layer.feature.properties?.name === this.#originalRouteName ||
              layer.feature.properties?.id === this.#editingRouteId ||
              String(layer.feature.id) === String(this.#editingRouteId))
          ) {
            const tooltip = layer.getTooltip();
            if (tooltip && tooltip._container) {
              tooltip._container.classList.add("editing-route-hidden");
            }
          }
        });
      }

      this.#activeRouteSegments = [];
      if (routeFeature.geometry) {
        if (routeFeature.geometry.type === "LineString") {
          const coords = routeFeature.geometry.coordinates || [];
          const seg = coords
            .filter((c) => Array.isArray(c) && c.length >= 2)
            .map((c) => [c[1], c[0]]);
          if (seg.length > 0) this.#activeRouteSegments.push(seg);
        } else if (routeFeature.geometry.type === "MultiLineString") {
          const multi = routeFeature.geometry.coordinates || [];
          multi.forEach((segment) => {
            const seg = (segment || [])
              .filter((c) => Array.isArray(c) && c.length >= 2)
              .map((c) => [c[1], c[0]]);
            if (seg.length > 0) {
              this.#activeRouteSegments.push(seg);
            }
          });
        } else if (routeFeature.geometry.type === "Point") {
          const c = routeFeature.geometry.coordinates;
          if (Array.isArray(c) && c.length >= 2) {
            this.#activeRouteSegments.push([[c[1], c[0]]]);
          }
        }
      }

      if (this.#activeRouteSegments.length === 0) {
        this.#activeRouteSegments = [[]];
      }

      this.#updateRouteLine();
      this.#renderRouteVertexMarkers();

      const allPoints = this.#activeRouteSegments.flat();
      if (allPoints.length > 0 && this.#map) {
        const bounds = L.latLngBounds(allPoints);
        if (bounds.isValid()) {
          this.#map.invalidateSize();
          this.#map.fitBounds(bounds, { maxZoom: 17, padding: [50, 50] });
        }
      }
    } else {
      this.#editingRouteId = null;
      this.#originalRouteName = null;
      this.#activeRouteSegments = [[]];
      if (titleEl)
        titleEl.textContent = I18nService.getInstance().t(
          "admin.new_route",
          {},
          "Nouvelle Route",
        );
      if (nameInput) nameInput.value = "";
    }
  }

  addNewRouteSegment() {
    if (this.#activeRouteSegments.length === 0) {
      this.#activeRouteSegments = [[]];
    } else {
      const lastSeg =
        this.#activeRouteSegments[this.#activeRouteSegments.length - 1];
      if (lastSeg.length === 0) {
        this.showToast(
          "Le tronçon actuel est encore vide. Cliquez sur la carte pour tracer.",
          "info",
        );
        return;
      }
      this.#activeRouteSegments.push([]);
    }
    this.showToast(
      "Nouveau tronçon ajouté. Cliquez sur la carte pour continuer le tracé.",
      "info",
    );
  }

  toggleRouteLabels() {
    if (!this.#map) return;
    const container = this.#map.getContainer();
    const isHidden = container.classList.toggle("hide-route-names");
    const btn = document.getElementById("admin-toggle-route-labels-btn");
    if (btn) {
      const textSpan = btn.querySelector(".map-toggle-text");
      if (textSpan) {
        textSpan.textContent = isHidden
          ? "Afficher les noms"
          : "Masquer les noms";
      }
      btn.classList.toggle("active", isHidden);
    }
  }

  #addRouteVertex(latlng) {
    if (this.#activeRouteSegments.length === 0) {
      this.#activeRouteSegments.push([latlng]);
    } else {
      const targetSeg =
        this.#activeRouteSegments[this.#activeRouteSegments.length - 1];
      targetSeg.push(latlng);
    }
    this.#updateRouteLine();
    this.#renderRouteVertexMarkers();
  }

  #updateRouteLine() {
    const validSegments = this.#activeRouteSegments.filter(
      (seg) => seg && seg.length > 0,
    );
    if (this.#activeLineLayer) {
      this.#activeLineLayer.setLatLngs(validSegments);
    } else {
      this.#activeLineLayer = L.polyline(validSegments, {
        color: "#f43f5e",
        weight: 6,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
        fill: false,
      }).addTo(this.#map);
    }
  }

  #renderRouteVertexMarkers() {
    this.#vertexMarkers.forEach((m) => m.remove());
    this.#vertexMarkers = [];

    this.#activeRouteSegments.forEach((segment, sIdx) => {
      segment.forEach((latlng, pIdx) => {
        const icon = L.divIcon({
          className: "vertex-handle-icon",
          html: `<div class="admin-marker" style="background: #f43f5e;" title="Tronçon ${sIdx + 1}, Point ${pIdx + 1}"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        const marker = L.marker(latlng, { icon, draggable: true }).addTo(
          this.#map,
        );

        marker.on("drag", (e) => {
          const newPos = e.target.getLatLng();
          this.#activeRouteSegments[sIdx][pIdx] = [newPos.lat, newPos.lng];
          this.#updateRouteLine();
        });

        const removeVertex = () => {
          this.#activeRouteSegments[sIdx].splice(pIdx, 1);
          if (
            this.#activeRouteSegments[sIdx].length === 0 &&
            this.#activeRouteSegments.length > 1
          ) {
            this.#activeRouteSegments.splice(sIdx, 1);
          }
          this.#updateRouteLine();
          this.#renderRouteVertexMarkers();
        };

        marker.on("contextmenu", (e) => {
          L.DomEvent.stopPropagation(e);
          removeVertex();
        });

        marker.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          removeVertex();
        });

        this.#vertexMarkers.push(marker);
      });
    });
  }

  undoRoute() {
    if (this.#activeRouteSegments.length > 0) {
      let lastSeg =
        this.#activeRouteSegments[this.#activeRouteSegments.length - 1];
      if (lastSeg.length === 0 && this.#activeRouteSegments.length > 1) {
        this.#activeRouteSegments.pop();
        lastSeg =
          this.#activeRouteSegments[this.#activeRouteSegments.length - 1];
      }
      if (lastSeg.length > 0) {
        lastSeg.pop();
      }
      if (lastSeg.length === 0 && this.#activeRouteSegments.length > 1) {
        this.#activeRouteSegments.pop();
      }
      this.#updateRouteLine();
      this.#renderRouteVertexMarkers();
    }
  }

  clearActiveRouteDrawing() {
    this.#activeRouteSegments = [];
    this.#vertexMarkers.forEach((m) => m.remove());
    this.#vertexMarkers = [];
    if (this.#activeLineLayer) {
      this.#activeLineLayer.remove();
      this.#activeLineLayer = null;
    }
    this.#editingRouteId = null;
    this.#originalRouteName = null;

    if (this.#map) {
      this.#map.getContainer().classList.remove("admin-editing-route");
    }

    if (this.#routesLayer) {
      this.#routesLayer.eachLayer((layer) => {
        if (layer.getTooltip) {
          const tooltip = layer.getTooltip();
          if (tooltip && tooltip._container) {
            tooltip._container.classList.remove("editing-route-hidden");
          }
        }
      });
    }

    const editor = document.getElementById("admin-route-editor");
    if (editor) editor.classList.add("hidden");
  }

  getActiveRoutePayload() {
    const nameInput = document.getElementById("admin-route-name");
    const name = nameInput ? nameInput.value.trim() : "";
    const diffSelect = document.getElementById("admin-route-difficulty");
    const difficulty = diffSelect ? diffSelect.value : "auto";

    const validSegments = this.#activeRouteSegments
      .map((seg) => seg.filter((pt) => Array.isArray(pt) && pt.length >= 2))
      .filter((seg) => seg.length > 0);

    const totalPoints = validSegments.reduce(
      (acc, seg) => acc + seg.length,
      0,
    );

    if (!name || totalPoints < 2) {
      return null;
    }

    let geometry;
    if (validSegments.length === 1) {
      geometry = {
        type: "LineString",
        coordinates: validSegments[0].map((pt) => [pt[1], pt[0]]),
      };
    } else {
      geometry = {
        type: "MultiLineString",
        coordinates: validSegments.map((seg) =>
          seg.map((pt) => [pt[1], pt[0]]),
        ),
      };
    }

    return {
      id: this.#editingRouteId,
      originalName: this.#originalRouteName,
      name,
      difficulty,
      geometry,
      coordinates:
        geometry.type === "LineString"
          ? geometry.coordinates
          : geometry.coordinates[0],
    };
  }

  showToast(message, type = "error") {
    const toastEl = document.getElementById("admin-toast");
    if (!toastEl) return;

    toastEl.textContent = message;
    toastEl.className = `admin-toast toast-${type}`;
    toastEl.classList.remove("hidden");

    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toastEl.classList.add("hidden");
    }, 4000);
  }

  renderDistrictList(districts) {
    const listEl = document.getElementById("admin-district-list");
    const countEl = document.getElementById("admin-district-count");
    if (countEl) countEl.textContent = districts.length;
    if (!listEl) return;
    listEl.replaceChildren();
    if (districts.length === 0) {
      const li = document.createElement("li");
      li.className = "district-list-empty";
      li.textContent = I18nService.getInstance().t(
        "admin.no_districts",
        {},
        "Aucun quartier défini.",
      );
      listEl.appendChild(li);
      return;
    }
    districts.forEach((d) => {
      const li = document.createElement("li");
      li.className = "route-list-item";
      li.dataset.name = d.properties.name;
      const infoDiv = document.createElement("div");
      infoDiv.className = "route-list-info";
      const colorDot = document.createElement("div");
      colorDot.className = "district-color-dot";
      colorDot.style.setProperty(
        "--dot-color",
        d.properties.color || "#3b82f6",
      );
      const strongName = document.createElement("strong");
      strongName.className = "route-list-name";
      strongName.textContent = d.properties.name;
      infoDiv.append(colorDot, strongName);

      const actionsDiv = document.createElement("div");
      actionsDiv.className = "route-list-actions";
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "btn-edit-item btn-edit-district";
      editBtn.dataset.id = d.properties?.id ?? d.id ?? d.properties?.name ?? '';
      editBtn.dataset.name = d.properties?.name ?? '';
      editBtn.textContent = I18nService.getInstance().t(
        "admin.edit",
        {},
        "Éditer",
      );

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn-delete-item btn-delete-district";
      deleteBtn.dataset.id = d.properties?.id ?? d.id ?? d.properties?.name ?? '';
      deleteBtn.dataset.name = d.properties?.name ?? '';
      deleteBtn.textContent = I18nService.getInstance().t(
        "admin.delete",
        {},
        "Supprimer",
      );

      actionsDiv.append(editBtn, deleteBtn);
      li.append(infoDiv, actionsDiv);
      listEl.appendChild(li);
    });
  }

  renderRouteList(displayRoutes, difficultyMode, groupedRoutes, options = {}) {
    const listEl = document.getElementById("admin-route-list");
    const countEl = document.getElementById("admin-route-count");
    const modeTextEl = document.getElementById("admin-route-mode-text");

    if (modeTextEl) {
      const modeLabels = {
        length: "Longueur",
        nomenclature: "Nomenclature",
        center: "Centre-ville",
      };
      modeTextEl.textContent = modeLabels[difficultyMode] || difficultyMode;
    }

    const currentFilter = options.currentFilter || "all";
    const tabAll = document.querySelector('.btn-filter-tab[data-filter="all"]');
    const tabEasy = document.querySelector(
      '.btn-filter-tab[data-filter="easy"]',
    );
    const tabMedium = document.querySelector(
      '.btn-filter-tab[data-filter="medium"]',
    );
    const tabHard = document.querySelector(
      '.btn-filter-tab[data-filter="hard"]',
    );
    const tabManual = document.querySelector(
      '.btn-filter-tab[data-filter="manual"]',
    );

    if (tabAll) {
      tabAll.textContent = `${I18nService.getInstance().t("admin.filter_all", {}, "Tous")} (${options.counts?.all ?? displayRoutes.length})`;
      tabAll.classList.toggle("active", currentFilter === "all");
    }
    if (tabEasy) {
      tabEasy.textContent = `${I18nService.getInstance().t("admin.filter_easy", {}, "Facile")} (${options.counts?.easy ?? (groupedRoutes?.easy?.length || 0)})`;
      tabEasy.classList.toggle("active", currentFilter === "easy");
    }
    if (tabMedium) {
      tabMedium.textContent = `${I18nService.getInstance().t("admin.filter_medium", {}, "Moyen")} (${options.counts?.medium ?? (groupedRoutes?.medium?.length || 0)})`;
      tabMedium.classList.toggle("active", currentFilter === "medium");
    }
    if (tabHard) {
      tabHard.textContent = `${I18nService.getInstance().t("admin.filter_hard", {}, "Difficile")} (${options.counts?.hard ?? (groupedRoutes?.hard?.length || 0)})`;
      tabHard.classList.toggle("active", currentFilter === "hard");
    }
    if (tabManual) {
      tabManual.textContent = `${I18nService.getInstance().t("admin.filter_manual", {}, "Manuels")} (${options.counts?.manual ?? 0})`;
      tabManual.classList.toggle("active", currentFilter === "manual");
    }

    if (countEl) countEl.textContent = displayRoutes.length;
    if (!listEl) return;
    listEl.replaceChildren();

    if (displayRoutes.length === 0) {
      const li = document.createElement("li");
      li.className = "district-list-empty";
      li.textContent = I18nService.getInstance().t(
        "admin.no_routes",
        {},
        "Aucune route ne correspond.",
      );
      listEl.appendChild(li);
      return;
    }

    const renderGroup = (routes, title, color) => {
      if (!routes || routes.length === 0) return;
      const header = document.createElement("div");
      header.className = "route-difficulty-header";
      header.style.setProperty("--diff-color", color);
      header.textContent = `${title} (${routes.length})`;
      listEl.appendChild(header);

      routes.forEach((r) => {
        const li = document.createElement("li");
        li.className = "route-list-item";
        li.dataset.name = r.properties.name;

        const infoDiv = document.createElement("div");
        infoDiv.className = "route-list-info";

        const svgIcon = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg",
        );
        svgIcon.setAttribute("viewBox", "0 0 24 24");
        svgIcon.setAttribute("fill", "none");
        svgIcon.setAttribute("stroke", color);
        svgIcon.setAttribute("stroke-width", "2");
        svgIcon.setAttribute("stroke-linecap", "round");
        svgIcon.setAttribute("stroke-linejoin", "round");
        svgIcon.setAttribute("class", "route-list-icon");
        const pathEl = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path",
        );
        pathEl.setAttribute(
          "d",
          "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
        );
        svgIcon.appendChild(pathEl);

        const strongName = document.createElement("strong");
        strongName.className = "route-list-name";
        strongName.textContent = r.properties.name;
        infoDiv.append(svgIcon, strongName);

        if (isPlaceStreet(r)) {
          const placeBadge = document.createElement("span");
          placeBadge.className = options.disablePlaces
            ? "badge-place-tag badge-place-disabled"
            : "badge-place-tag";
          placeBadge.textContent = options.disablePlaces
            ? I18nService.getInstance().t(
                "admin.place_disabled_tag",
                {},
                "Place (désactivée)",
              )
            : I18nService.getInstance().t("admin.place_tag", {}, "Place");
          infoDiv.append(placeBadge);
        }

        const nameLower = (r.properties.name || "").toLowerCase().trim();
        const manualDiff = options.overrides?.[nameLower];
        const isManual = Boolean(manualDiff);

        if (isManual) {
          const badge = document.createElement("span");
          badge.className = "badge-manual-diff";
          badge.textContent = I18nService.getInstance().t(
            "admin.manual",
            {},
            "Manuel",
          );
          infoDiv.appendChild(badge);
        }

        const actionsDiv = document.createElement("div");
        actionsDiv.className = "route-list-actions";

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "btn-edit-item btn-edit-route";
        editBtn.dataset.id = r.properties?.id ?? r.id ?? r.properties?.name ?? '';
        editBtn.dataset.name = r.properties?.name ?? '';
        editBtn.textContent = I18nService.getInstance().t(
          "admin.edit",
          {},
          "Éditer",
        );

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "btn-delete-item btn-delete-route";
        deleteBtn.dataset.id = r.properties?.id ?? r.id ?? r.properties?.name ?? '';
        deleteBtn.dataset.name = r.properties?.name ?? '';
        deleteBtn.textContent = I18nService.getInstance().t(
          "admin.delete",
          {},
          "Supprimer",
        );

        actionsDiv.append(editBtn, deleteBtn);
        li.append(infoDiv, actionsDiv);
        listEl.appendChild(li);
      });
    };

    const labelEasy = I18nService.getInstance().t(
      "admin.filter_easy",
      {},
      "Facile",
    );
    const labelMedium = I18nService.getInstance().t(
      "admin.filter_medium",
      {},
      "Moyen",
    );
    const labelHard = I18nService.getInstance().t(
      "admin.filter_hard",
      {},
      "Difficile",
    );
    const labelManual = I18nService.getInstance().t(
      "admin.filter_manual",
      {},
      "Manuels",
    );

    if (currentFilter === "easy") {
      renderGroup(groupedRoutes.easy, labelEasy, "#10b981");
    } else if (currentFilter === "medium") {
      renderGroup(groupedRoutes.medium, labelMedium, "#f59e0b");
    } else if (currentFilter === "hard") {
      renderGroup(groupedRoutes.hard, labelHard, "#ef4444");
    } else if (currentFilter === "manual") {
      renderGroup(displayRoutes, labelManual, "#8b5cf6");
    } else {
      renderGroup(groupedRoutes.easy, labelEasy, "#10b981");
      renderGroup(groupedRoutes.medium, labelMedium, "#f59e0b");
      renderGroup(groupedRoutes.hard, labelHard, "#ef4444");
    }
  }

  renderReportsList(reports, onResolve, onDismiss, onDelete, onCopy) {
    const grid = document.getElementById("admin-reports-grid");
    const emptyMsg = document.getElementById("admin-reports-empty");
    if (!grid) return;
    grid.replaceChildren();

    if (!reports || reports.length === 0) {
      if (emptyMsg) emptyMsg.classList.remove("hidden");
      return;
    }

    if (emptyMsg) emptyMsg.classList.add("hidden");

    const i18n = I18nService.getInstance();
    const categoryLabels = {
      street_name: i18n.t("game.report_type_name", {}, "Rue mal nommée"),
      difficulty: i18n.t("game.report_type_diff", {}, "Mauvaise difficulté"),
      map_error: i18n.t("game.report_type_map", {}, "Erreur de tracé"),
      other: i18n.t("game.report_type_other", {}, "Autre problème"),
    };

    reports.forEach((r) => {
      const card = document.createElement("div");
      card.className = "report-card";

      const lang = i18n.currentLang === "en" ? "en-US" : "fr-FR";
      const dateStr = new Date(r.created_at).toLocaleString(lang, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const categoryName = categoryLabels[r.category] || r.category;
      const statusClass = `status-${r.status || "pending"}`;
      const statusLabels = {
        pending: i18n.t("room.waiting", {}, "En attente"),
        resolved: i18n.t("admin.resolved", {}, "Résolu"),
        dismissed: i18n.t("admin.dismissed", {}, "Ignoré"),
      };
      const statusText = statusLabels[r.status] || r.status;

      const safeTarget =
        r.target_street &&
        r.target_street !== "Inconnue" &&
        r.target_street !== "N/A"
          ? r.target_street
          : null;
      const safeClicked =
        r.clicked_street && r.clicked_street !== "N/A"
          ? r.clicked_street
          : null;

      const headerDiv = document.createElement("div");
      headerDiv.className = "report-card-header";

      const catTag = document.createElement("span");
      catTag.className = "report-category-tag";
      catTag.textContent = categoryName;

      const statusBadge = document.createElement("span");
      statusBadge.className = `report-status-badge ${statusClass}`;
      statusBadge.textContent = statusText;
      headerDiv.append(catTag, statusBadge);

      const metaDiv = document.createElement("div");
      metaDiv.className = "report-meta-list";

      const dateSpan = document.createElement("span");
      const dateLabel = document.createElement("strong");
      dateLabel.textContent = i18n.t("admin.date_label", {}, "Date : ");
      dateSpan.append(dateLabel, dateStr);

      const userSpan = document.createElement("span");
      const userLabel = document.createElement("strong");
      userLabel.textContent = i18n.t("admin.player_label", {}, "Joueur : ");
      userSpan.append(
        userLabel,
        r.username || i18n.t("common.anonymous", {}, "Anonyme"),
      );

      const citySpan = document.createElement("span");
      const cityLabel = document.createElement("strong");
      cityLabel.textContent = i18n.t("admin.city_label", {}, "Commune : ");
      citySpan.append(
        cityLabel,
        `${r.city_key || "N/A"} (Mode: ${r.game_mode || "N/A"}, Diff: ${r.difficulty || "N/A"})`,
      );

      metaDiv.append(dateSpan, userSpan, citySpan);

      const targetSpan = document.createElement("span");
      const targetLabel = document.createElement("strong");
      targetLabel.textContent = i18n.t(
        "admin.target_street_label",
        {},
        "Rue cible : ",
      );
      targetSpan.append(targetLabel, `${r.target_street || "N/A"} `);

      if (safeTarget) {
        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className = "btn-copy-street";
        copyBtn.textContent = i18n.t("admin.copy_btn", {}, "Copier");
        copyBtn.addEventListener("click", () => onCopy(safeTarget));
        targetSpan.appendChild(copyBtn);
      }
      metaDiv.appendChild(targetSpan);

      if (r.clicked_street) {
        const clickedSpan = document.createElement("span");
        const clickedLabel = document.createElement("strong");
        clickedLabel.textContent = i18n.t(
          "admin.clicked_street_label",
          {},
          "Rue cliquée : ",
        );
        clickedSpan.append(clickedLabel, `${r.clicked_street} `);
        if (safeClicked) {
          const copyBtn = document.createElement("button");
          copyBtn.type = "button";
          copyBtn.className = "btn-copy-street";
          copyBtn.textContent = i18n.t("admin.copy_btn", {}, "Copier");
          copyBtn.addEventListener("click", () => onCopy(safeClicked));
          clickedSpan.appendChild(copyBtn);
        }
        metaDiv.appendChild(clickedSpan);
      }

      const descDiv = document.createElement("div");
      descDiv.className = "report-description-text";
      descDiv.textContent = r.description;

      const actionsDiv = document.createElement("div");
      actionsDiv.className = "report-card-actions";

      if (r.status !== "resolved") {
        const resolveBtn = document.createElement("button");
        resolveBtn.type = "button";
        resolveBtn.className = "btn btn-small btn-resolve-report";
        resolveBtn.textContent = i18n.t(
          "admin.mark_resolved",
          {},
          "Marquer résolu",
        );
        resolveBtn.addEventListener("click", () => onResolve(r.id));
        actionsDiv.appendChild(resolveBtn);
      }

      if (r.status !== "dismissed") {
        const dismissBtn = document.createElement("button");
        dismissBtn.type = "button";
        dismissBtn.className = "btn btn-small btn-secondary btn-dismiss-report";
        dismissBtn.textContent = i18n.t("admin.dismiss", {}, "Ignorer");
        dismissBtn.addEventListener("click", () => onDismiss(r.id));
        actionsDiv.appendChild(dismissBtn);
      }

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn btn-small btn-delete-item btn-delete-report";
      deleteBtn.textContent = i18n.t("admin.delete", {}, "Supprimer");
      deleteBtn.addEventListener("click", () => onDelete(r.id));
      actionsDiv.appendChild(deleteBtn);

      card.append(headerDiv, metaDiv, descDiv, actionsDiv);
      grid.appendChild(card);
    });
  }
}
