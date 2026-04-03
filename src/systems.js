import { BATTERY_TYPES, batteryConfig, radarConfig } from "./config.js";
import { addLog, nextId } from "./state.js";
import { rand } from "./utils.js";

export function initDefaultAssets(state, mapCtrl) {
  addBattery(state, mapCtrl, "IRON_DOME", 32.1, 34.85);
  addBattery(state, mapCtrl, "DAVIDS_SLING", 31.95, 35.1);
  addBattery(state, mapCtrl, "ARROW2", 31.8, 34.9);
  addBattery(state, mapCtrl, "ARROW3", 32.25, 34.95);
  addRadar(state, mapCtrl, 31.95, 35.0);
  addRadar(state, mapCtrl, 32.7, 35.1);
}

export function addBattery(state, mapCtrl, type, lat, lng) {
  const id = nextId(state, "B");
  const cfg = batteryConfig[type];
  const battery = {
    id,
    type,
    icon: cfg.icon,
    lat,
    lng,
    ammo: cfg.ammo,
    maxAmmo: cfg.ammo,
    reloadT: 0,
    marker: null
  };
  battery.marker = mapCtrl.createBatteryMarker(battery, p => {
    battery.lat = p.lat;
    battery.lng = p.lng;
  });
  state.batteries.push(battery);
  addLog(state, `נוספה סוללה ${id} (${cfg.label})`);
}

export function addRadar(state, mapCtrl, lat, lng) {
  const id = nextId(state, "R");
  const radar = {
    id,
    lat,
    lng,
    rangeKm: radarConfig.rangeKm,
    marker: null,
    circle: null
  };
  const visual = mapCtrl.createRadarMarker(radar, p => {
    radar.lat = p.lat;
    radar.lng = p.lng;
  });
  radar.marker = visual.marker;
  radar.circle = visual.circle;
  state.radars.push(radar);
  addLog(state, `נוסף מכ"ם ${id}`);
}

export function addRandomBatteryNearCenter(state, mapCtrl) {
  const type = BATTERY_TYPES[Math.floor(Math.random() * BATTERY_TYPES.length)];
  const center = mapCtrl.getCenter();
  addBattery(state, mapCtrl, type, center.lat + rand(-0.25, 0.25), center.lng + rand(-0.25, 0.25));
}

export function addRandomRadarNearCenter(state, mapCtrl) {
  const center = mapCtrl.getCenter();
  addRadar(state, mapCtrl, center.lat + rand(-0.2, 0.2), center.lng + rand(-0.2, 0.2));
}

export function updateAssets(state, dt) {
  state.batteries.forEach(b => {
    b.reloadT += dt;
    if (b.reloadT >= 18 && b.ammo < b.maxAmmo) {
      b.ammo += 1;
      b.reloadT = 0;
    }
  });
}
