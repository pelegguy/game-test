import { threatColor } from "./utils.js";

function batteryImageSvg(icon, color) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="18" fill="${color}" fill-opacity="0.25"/>
      <circle cx="22" cy="22" r="16" stroke="${color}" stroke-width="2.2" fill="#091429"/>
      <circle cx="22" cy="22" r="12" fill="#102244"/>
      <text x="22" y="27" text-anchor="middle" font-size="16">${icon}</text>
    </svg>`
  )}`;
}

function threatImageSvg(type) {
  const color = threatColor(type);
  const icon = type === "ROCKET" ? "⬆" : type === "DRONE" ? "✈" : type === "CRUISE" ? "➤" : type === "BALLISTIC_ENDO" ? "⇧" : "☄";
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
      <circle cx="15" cy="15" r="11" fill="#0a1428" stroke="${color}" stroke-width="2"/>
      <text x="15" y="20" text-anchor="middle" font-size="13" fill="${color}">${icon}</text>
    </svg>`
  )}`;
}

export function createMapController() {
  const map = L.map("map", { zoomControl: true });
  const middleEastBounds = L.latLngBounds([23.0, 31.0], [38.5, 57.0]);
  map.fitBounds(middleEastBounds);
  const osmStandard = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 10,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);
  const osmHot = L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
    maxZoom: 10,
    attribution: "&copy; OpenStreetMap contributors"
  });
  L.control.layers(
    { "OSM Standard": osmStandard, "OSM HOT": osmHot },
    {},
    { position: "topleft", collapsed: true }
  ).addTo(map);

  const layers = {
    threats: L.layerGroup().addTo(map),
    assets: L.layerGroup().addTo(map),
    paths: L.layerGroup().addTo(map),
    intercepts: L.layerGroup().addTo(map),
    events: L.layerGroup().addTo(map)
  };

  return {
    map,
    layers,
    distanceKm(a, b) {
      return map.distance([a.lat, a.lng], [b.lat, b.lng]) / 1000;
    },
    getCenter() {
      return map.getCenter();
    },
    refreshSize() {
      map.invalidateSize();
    },
    createBatteryMarker(battery, onDrag) {
      const colors = {
        IRON_DOME: "#72ffd0",
        DAVIDS_SLING: "#8ec4ff",
        ARROW2: "#ffc884",
        ARROW3: "#ff9f8a"
      };
      const icon = L.icon({
        iconUrl: batteryImageSvg(battery.icon, colors[battery.type]),
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });
      const marker = L.marker([battery.lat, battery.lng], { draggable: true, icon, title: battery.id }).addTo(layers.assets);
      marker.bindTooltip(`${battery.icon} ${battery.id}`, { permanent: true, direction: "top", offset: [0, -10] });
      marker.on("drag", e => {
        const p = e.target.getLatLng();
        onDrag(p);
      });
      return marker;
    },
    createRadarMarker(radar, onDrag) {
      const marker = L.marker([radar.lat, radar.lng], {
        draggable: true,
        icon: L.divIcon({
          className: "",
          html: `<div style="
            width:16px;height:16px;border-radius:50%;
            background:#5ec8ff;border:2px solid #d6f3ff;
            box-shadow:0 0 10px rgba(94,200,255,.8);
          "></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        })
      }).addTo(layers.assets);
      const circle = L.circle([radar.lat, radar.lng], { radius: radar.rangeKm * 1000, color: "#5ec8ff", weight: 1, fillOpacity: 0.05 }).addTo(layers.assets);
      marker.bindTooltip(`📡 ${radar.id}`, { permanent: true, direction: "top", offset: [0, -8] });
      marker.on("drag", e => {
        const p = e.target.getLatLng();
        circle.setLatLng(p);
        onDrag(p);
      });
      return { marker, circle };
    },
    createThreatVisual(threat) {
      const marker = L.marker([threat.lat, threat.lng], {
        icon: L.icon({ iconUrl: threatImageSvg(threat.type), iconSize: [24, 24], iconAnchor: [12, 12] })
      }).addTo(layers.threats);
      marker.bindTooltip(`${threat.id} ${threat.type}`, { direction: "top" });
      const path = L.polyline([[threat.start.lat, threat.start.lng], [threat.target.lat, threat.target.lng]], {
        color: threatColor(threat.type),
        weight: 1.5,
        opacity: 0.5
      }).addTo(layers.paths);
      const trail = L.polyline([[threat.start.lat, threat.start.lng]], {
        color: threatColor(threat.type),
        weight: 2.2,
        opacity: 0.9
      }).addTo(layers.paths);
      return { marker, path, trail };
    },
    drawInterceptLine(from, to) {
      const line = L.polyline([[from.lat, from.lng], [to.lat, to.lng]], { color: "#dbe8ff", weight: 2 }).addTo(layers.intercepts);
      const missile = L.circleMarker([from.lat, from.lng], {
        radius: 4,
        color: "#ffffff",
        fillColor: "#ffffff",
        fillOpacity: 0.9,
        weight: 1
      }).addTo(layers.intercepts);
      let k = 0;
      const steps = 14;
      const timer = setInterval(() => {
        k += 1;
        const t = k / steps;
        const lat = from.lat + (to.lat - from.lat) * t;
        const lng = from.lng + (to.lng - from.lng) * t;
        missile.setLatLng([lat, lng]);
        if (k >= steps) {
          clearInterval(timer);
          missile.remove();
        }
      }, 45);
      setTimeout(() => line.remove(), 900);
    },
    markIntercept(point, label) {
      const marker = L.circleMarker([point.lat, point.lng], {
        radius: 6,
        color: "#98ffd1",
        fillColor: "#98ffd1",
        fillOpacity: 0.5,
        weight: 2
      }).addTo(layers.events);
      marker.bindTooltip(`יירוט: ${label}`, { direction: "top" });
      setTimeout(() => marker.remove(), 8000);
    },
    markImpact(point, label) {
      const marker = L.circleMarker([point.lat, point.lng], {
        radius: 7,
        color: "#ff9a9a",
        fillColor: "#ff9a9a",
        fillOpacity: 0.45,
        weight: 2
      }).addTo(layers.events);
      const zone = L.circle([point.lat, point.lng], {
        radius: 3500,
        color: "#ff7d74",
        weight: 1.5,
        fillOpacity: 0.18
      }).addTo(layers.events);
      marker.bindTooltip(`פגיעה: ${label}`, { direction: "top" });
      setTimeout(() => {
        marker.remove();
        zone.remove();
      }, 12000);
    },
    markSiren(point, cityName) {
      const center = L.circleMarker([point.lat, point.lng], {
        radius: 8,
        color: "#ff6a6a",
        fillColor: "#ff6a6a",
        fillOpacity: 0.62,
        weight: 2
      }).addTo(layers.events);
      const ring = L.circle([point.lat, point.lng], {
        radius: 14000,
        color: "#ff4040",
        weight: 2.5,
        fillOpacity: 0.22
      }).addTo(layers.events);
      center.bindTooltip(`אזעקת צבע אדום: ${cityName}`, { direction: "top" });
      setTimeout(() => {
        center.remove();
        ring.remove();
      }, 9000);
    }
  };
}
