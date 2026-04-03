import { origins, targets, waves } from "./config.js";
import { addLog, nextId } from "./state.js";
import { pick, rand, randPointInBox } from "./utils.js";
import { flashScreen, showToast } from "./effects.js";
import { playInterceptFail } from "./audio.js";

function speedByType(type) {
  if (type === "ROCKET") return rand(4.0, 6.0);
  if (type === "DRONE") return rand(1.3, 2.0);
  if (type === "CRUISE") return rand(2.4, 3.4);
  if (type === "BALLISTIC_ENDO") return rand(5.2, 7.0);
  return rand(6.4, 8.4);
}

export function processWaveSpawns(state, mapCtrl) {
  const wave = waves[state.waveIdx];
  if (!wave._done) wave._done = {};
  for (let i = 0; i < wave.events.length; i++) {
    if (wave._done[i]) continue;
    const e = wave.events[i];
    if (state.waveTime >= e.t) {
      wave._done[i] = true;
      for (let k = 0; k < e.n; k++) {
        setTimeout(() => spawnThreat(state, mapCtrl, e.o), 250 * k);
      }
      addLog(state, `גל איומים מ-${e.o} (${e.n})`, "warn");
    }
  }
  if (state.waveTime >= wave.dur && state.waveIdx < waves.length - 1) {
    state.waveIdx++;
    state.waveTime = 0;
    addLog(state, `מעבר ל-${waves[state.waveIdx].name}`);
  }
}

export function spawnThreat(state, mapCtrl, originKey) {
  const origin = origins[originKey];
  const start = randPointInBox(origin.box);
  const target = pick(targets);
  const type = pick(origin.mix);
  const speed = speedByType(type);
  const dist = mapCtrl.distanceKm(start, target);
  const eta = Math.max(18, dist / speed);
  const id = nextId(state, "T");
  const visual = mapCtrl.createThreatVisual({ id, type, start, target, lat: start.lat, lng: start.lng });
  const threat = {
    id,
    originKey,
    type,
    target,
    start,
    lat: start.lat,
    lng: start.lng,
    speed,
    leftDist: dist,
    eta,
    marker: visual.marker,
    path: visual.path,
    trail: visual.trail,
    trailLatLngs: [[start.lat, start.lng]],
    resolved: false
  };
  state.threats.push(threat);
  state.decisions.push({ id: nextId(state, "D"), threatId: id });
}

function threatDamage(type) {
  if (type === "ROCKET") return 0.02;
  if (type === "DRONE") return 0.03;
  if (type === "CRUISE") return 0.05;
  if (type === "BALLISTIC_ENDO") return 0.08;
  return 0.11;
}

export function updateThreats(state, mapCtrl, dt) {
  state.threats.forEach(t => {
    if (t.resolved) return;
    const stepKm = t.speed * dt;
    const frac = Math.min(1, stepKm / Math.max(0.001, t.leftDist));
    t.lat += (t.target.lat - t.lat) * frac;
    t.lng += (t.target.lng - t.lng) * frac;
    t.leftDist = Math.max(0, mapCtrl.distanceKm({ lat: t.lat, lng: t.lng }, t.target));
    t.eta = t.leftDist / t.speed;
    t.marker.setLatLng([t.lat, t.lng]);
    t.trailLatLngs.push([t.lat, t.lng]);
    if (t.trailLatLngs.length > 70) t.trailLatLngs.shift();
    t.trail.setLatLngs(t.trailLatLngs);
    if (t.leftDist < 2.0) {
      t.resolved = true;
      t.marker.remove();
      t.path.remove();
      t.trail.remove();
      mapCtrl.markImpact({ lat: t.lat, lng: t.lng }, `${t.type} @ ${t.target.name}`);
      const dmg = threatDamage(t.type) * t.target.value;
      state.morale = Math.max(0, state.morale - dmg);
      state.pressure = Math.min(1, state.pressure + dmg * 1.2);
      playInterceptFail();
      flashScreen("flash", 280);
      showToast(`פגיעה באזור ${t.target.name}`);
      addLog(state, `${t.type} פגע באזור ${t.target.name}`, "hit");
    }
  });
}

export function cleanupThreats(state) {
  state.threats = state.threats.filter(t => !t.resolved);
  state.decisions = state.decisions.filter(d => state.threats.some(t => t.id === d.threatId));
}
