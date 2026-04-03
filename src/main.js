import { waves } from "./config.js";
import { createState, addLog } from "./state.js";
import { createMapController } from "./map.js";
import { initDefaultAssets, addRandomBatteryNearCenter, addRandomRadarNearCenter, updateAssets } from "./systems.js";
import { processWaveSpawns, updateThreats, cleanupThreats } from "./threats.js";
import { bindThreatLaunch, renderAll } from "./ui.js";
import { rand } from "./utils.js";
import { unlockAudio } from "./audio.js";
import { showToast } from "./effects.js";

if (!document.getElementById("map")) {
  throw new Error("Map container #map is missing from HTML.");
}
if (typeof window.L === "undefined") {
  throw new Error("Leaflet failed to load. Check <script src='leaflet.js'> in index.html.");
}
if (typeof rand !== "function") {
  throw new Error("utils.js failed to load correctly.");
}

const state = createState();
const mapCtrl = createMapController();
let uiAccumulator = 0;
const UI_REFRESH_INTERVAL = 0.2;

initDefaultAssets(state, mapCtrl);
bindThreatLaunch(state, mapCtrl);

function setSpeed(v) {
  state.simSpeed = v;
  document.getElementById("speed1Btn").classList.toggle("active", v === 1);
  document.getElementById("speed2Btn").classList.toggle("active", v === 2);
  document.getElementById("speed4Btn").classList.toggle("active", v === 4);
}

document.getElementById("pauseBtn").addEventListener("click", () => {
  state.paused = !state.paused;
  document.getElementById("pauseBtn").textContent = state.paused ? "Resume" : "Pause";
  renderAll(state, mapCtrl);
});
document.getElementById("speed1Btn").addEventListener("click", () => setSpeed(1));
document.getElementById("speed2Btn").addEventListener("click", () => setSpeed(2));
document.getElementById("speed4Btn").addEventListener("click", () => setSpeed(4));

document.getElementById("addBatteryBtn").addEventListener("click", () => {
  addRandomBatteryNearCenter(state, mapCtrl);
  showToast("נוספה סוללה חדשה");
  renderAll(state, mapCtrl);
});

document.getElementById("addRadarBtn").addEventListener("click", () => {
  addRandomRadarNearCenter(state, mapCtrl);
  showToast("נוסף מכ\"ם חדש");
  renderAll(state, mapCtrl);
});

function tick(now) {
  if (!tick.last) tick.last = now;
  const dt = Math.min(0.1, (now - tick.last) / 1000);
  tick.last = now;
  if (!state.paused) {
    const simDt = dt * state.simSpeed;
    state.t += simDt;
    state.waveTime += simDt;
    processWaveSpawns(state, mapCtrl);
    updateThreats(state, mapCtrl, simDt);
    updateAssets(state, simDt);
    cleanupThreats(state);
    uiAccumulator += simDt;
  }
  if (state.paused || uiAccumulator >= UI_REFRESH_INTERVAL) {
    renderAll(state, mapCtrl);
    uiAccumulator = 0;
  }

  requestAnimationFrame(tick);
}

addLog(state, `מערכת התחילה. שליטה ידנית מלאה בכל ההחלטות.`);
addLog(state, `תרחיש פעיל: ${waves[0].name}`);
addLog(state, `בדיקות טעינה תקינות: Leaflet + modules + utils.js`, "ok");
renderAll(state, mapCtrl);
setTimeout(() => mapCtrl.refreshSize(), 0);
window.addEventListener("resize", () => mapCtrl.refreshSize());
window.addEventListener("pointerdown", unlockAudio, { once: true });
requestAnimationFrame(tick);
