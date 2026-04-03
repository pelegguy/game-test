export const BATTERY_TYPES = ["IRON_DOME", "DAVIDS_SLING", "ARROW2", "ARROW3"];

export const batteryConfig = {
  IRON_DOME: { label: "Iron Dome", ammo: 38, supports: ["ROCKET", "DRONE"], baseP: 0.74, icon: "🛡️" },
  DAVIDS_SLING: { label: "David's Sling", ammo: 24, supports: ["DRONE", "CRUISE", "BALLISTIC_ENDO"], baseP: 0.69, icon: "🎯" },
  ARROW2: { label: "Arrow 2", ammo: 16, supports: ["BALLISTIC_ENDO", "BALLISTIC_EXO"], baseP: 0.67, icon: "🚀" },
  ARROW3: { label: "Arrow 3", ammo: 14, supports: ["BALLISTIC_EXO"], baseP: 0.78, icon: "☄️" }
};

export const radarConfig = {
  rangeKm: 420,
  detectBonus: 0.08
};

export const origins = {
  GAZA: { box: [[31.20, 34.17], [31.55, 34.58]], mix: ["ROCKET", "ROCKET", "DRONE"] },
  LEBANON: { box: [[33.00, 35.15], [34.55, 36.65]], mix: ["ROCKET", "DRONE", "CRUISE", "BALLISTIC_ENDO"] },
  IRAN: { box: [[31.00, 47.00], [35.80, 54.50]], mix: ["DRONE", "CRUISE", "BALLISTIC_ENDO", "BALLISTIC_EXO"] }
};

export const targets = [
  { name: "Tel Aviv", lat: 32.0853, lng: 34.7818, value: 1.0 },
  { name: "Jerusalem", lat: 31.7683, lng: 35.2137, value: 1.0 },
  { name: "Haifa", lat: 32.7940, lng: 34.9896, value: 0.85 },
  { name: "Outskirts", lat: 31.95, lng: 35.70, value: 0.55 },
  { name: "Strategic", lat: 31.55, lng: 34.95, value: 1.2 }
];

export const waves = [
  { name: "Wave 1", dur: 120, events: [{ t: 8, n: 5, o: "GAZA" }, { t: 30, n: 6, o: "GAZA" }, { t: 60, n: 7, o: "LEBANON" }] },
  { name: "Wave 2", dur: 150, events: [{ t: 12, n: 8, o: "LEBANON" }, { t: 52, n: 6, o: "IRAN" }, { t: 90, n: 8, o: "GAZA" }] },
  { name: "Wave 3", dur: 170, events: [{ t: 10, n: 9, o: "IRAN" }, { t: 45, n: 10, o: "LEBANON" }, { t: 110, n: 10, o: "IRAN" }] },
  { name: "Wave 4", dur: 190, events: [{ t: 8, n: 12, o: "GAZA" }, { t: 60, n: 11, o: "LEBANON" }, { t: 120, n: 12, o: "IRAN" }] }
];
