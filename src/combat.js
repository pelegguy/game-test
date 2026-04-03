import { batteryConfig, radarConfig } from "./config.js";
import { addLog } from "./state.js";
import { playInterceptFail, playInterceptSuccess, playLaunch, playSiren } from "./audio.js";
import { flashScreen, showToast } from "./effects.js";

export function compatibleBattery(battery, threat) {
  return batteryConfig[battery.type].supports.includes(threat.type) && battery.ammo > 0;
}

export function threatDetectedByRadar(state, mapCtrl, threat) {
  return state.radars.some(r => mapCtrl.distanceKm({ lat: r.lat, lng: r.lng }, { lat: threat.lat, lng: threat.lng }) <= r.rangeKm);
}

export function interceptProbability(state, mapCtrl, battery, threat, shots) {
  let p = batteryConfig[battery.type].baseP;
  const d = mapCtrl.distanceKm({ lat: battery.lat, lng: battery.lng }, { lat: threat.lat, lng: threat.lng });
  p -= Math.min(0.3, d / 2200);
  if (!threatDetectedByRadar(state, mapCtrl, threat)) p -= 0.12;
  else p += radarConfig.detectBonus;
  p -= Math.max(0, (threat.speed - 3.5) * 0.03);
  p += (battery.ammo / battery.maxAmmo) * 0.06;
  p = Math.max(0.15, Math.min(0.92, p));
  const combined = 1 - Math.pow(1 - p, shots);
  return Math.max(0.18, Math.min(0.985, combined));
}

export function manualLaunch(state, mapCtrl, decisionId, batteryId, shots) {
  const decision = state.decisions.find(d => d.id === decisionId);
  const threat = decision ? state.threats.find(t => t.id === decision.threatId && !t.resolved) : null;
  const battery = state.batteries.find(b => b.id === batteryId);
  if (!decision || !threat || !battery || !compatibleBattery(battery, threat)) {
    addLog(state, `שיגור נכשל: איום/סוללה לא תקינים`, "warn");
    return;
  }
  const n = Math.max(1, Math.min(shots, battery.ammo));
  const p = interceptProbability(state, mapCtrl, battery, threat, n);
  battery.ammo -= n;
  playLaunch();
  showToast(`שיגור מ-${battery.id} לעבר ${threat.id}`);
  mapCtrl.drawInterceptLine({ lat: battery.lat, lng: battery.lng }, { lat: threat.lat, lng: threat.lng });
  if (Math.random() <= p) {
    mapCtrl.markIntercept({ lat: threat.lat, lng: threat.lng }, `${threat.type} by ${battery.id}`);
    threat.resolved = true;
    threat.marker.remove();
    threat.path.remove();
    threat.trail.remove();
    playInterceptSuccess();
    flashScreen("flash", 180);
    showToast(`יירוט הצליח (${Math.round(p * 100)}%)`);
    addLog(state, `יירוט הצליח ${threat.type} ע"י ${battery.id} (${Math.round(p * 100)}%)`, "ok");
  } else {
    playInterceptFail();
    showToast(`יירוט נכשל (${Math.round(p * 100)}%)`);
    addLog(state, `יירוט נכשל ${threat.type} ע"י ${battery.id} (${Math.round(p * 100)}%)`, "hit");
  }
}

export function manualLaunchByThreat(state, mapCtrl, threatId, batteryId, shots) {
  const threat = state.threats.find(t => t.id === threatId && !t.resolved);
  const battery = state.batteries.find(b => b.id === batteryId);
  if (!threat || !battery || !compatibleBattery(battery, threat)) {
    addLog(state, `שיגור נדחה: אין התאמה בין ${batteryId || "N/A"} ל-${threatId || "N/A"}`, "warn");
    return;
  }
  const n = Math.max(1, Math.min(shots, battery.ammo));
  const p = interceptProbability(state, mapCtrl, battery, threat, n);
  battery.ammo -= n;
  mapCtrl.drawInterceptLine({ lat: battery.lat, lng: battery.lng }, { lat: threat.lat, lng: threat.lng });
  if (Math.random() <= p) {
    mapCtrl.markIntercept({ lat: threat.lat, lng: threat.lng }, `${threat.type} by ${battery.id}`);
    threat.resolved = true;
    threat.marker.remove();
    threat.path.remove();
    threat.trail.remove();
    addLog(state, `יירוט הצליח ${threat.type} ע"י ${battery.id} (${Math.round(p * 100)}%)`, "ok");
  } else {
    addLog(state, `יירוט נכשל ${threat.type} ע"י ${battery.id} (${Math.round(p * 100)}%)`, "hit");
  }
}

export function triggerSiren(state, mapCtrl, threatId) {
  const threat = state.threats.find(t => t.id === threatId && !t.resolved);
  if (!threat) return;
  mapCtrl.markSiren({ lat: threat.target.lat, lng: threat.target.lng }, threat.target.name);
  playSiren();
  flashScreen("red-alert", 650);
  showToast(`צבע אדום: ${threat.target.name}`);
  addLog(state, `הופעלה אזעקה באזור ${threat.target.name} עבור ${threat.type}`, "warn");
}
