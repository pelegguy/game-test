import { batteryConfig, waves } from "./config.js";
import { compatibleBattery, interceptProbability, manualLaunchByThreat, triggerSiren } from "./combat.js";
import { fmtTime } from "./utils.js";

export function renderHeader(state) {
  document.getElementById("waveLbl").textContent = waves[state.waveIdx].name;
  document.getElementById("timeLbl").textContent = fmtTime(state.t);
  document.getElementById("moraleLbl").textContent = Math.round(state.morale * 100) + "%";
  document.getElementById("pressureLbl").textContent = Math.round(state.pressure * 100) + "%";
  const ammo = state.batteries.reduce((sum, b) => sum + b.ammo, 0);
  document.getElementById("ammoLbl").textContent = String(ammo);
  const simMode = document.getElementById("simModeLbl");
  if (simMode) simMode.textContent = state.paused ? "SIM MODE: PAUSED" : `SIM MODE: ACTIVE x${state.simSpeed}`;
}

export function renderThreatList(state, mapCtrl) {
  const root = document.getElementById("threatList");
  const active = state.threats.slice().sort((a, b) => a.eta - b.eta);
  if (!active.length) {
    root.innerHTML = `<div class="small">אין איומים כרגע.</div>`;
    return;
  }
  root.innerHTML = "";
  active.forEach(t => {
    const card = document.createElement("div");
    card.className = "card";
    const isCritical = t.eta < 25;
    card.innerHTML = `
      <div class="row"><strong>${t.id} ${t.type}</strong><span class="mono ${isCritical ? "hit" : ""}">${t.eta.toFixed(1)}s</span></div>
      <div class="small">מקור: ${t.originKey} | יעד: ${t.target.name}</div>
      <div class="small mono">lat:${t.lat.toFixed(3)} lng:${t.lng.toFixed(3)} | ${t.speed.toFixed(2)} km/s (sim)</div>`;
    root.appendChild(card);
  });
}

function renderEngagementList(state, mapCtrl) {
  const root = document.getElementById("engagementList");
  if (!root) return;
  const active = state.threats.slice().sort((a, b) => a.eta - b.eta);
  if (!active.length) {
    root.innerHTML = `<div class="small">אין איומים ליירוט כרגע.</div>`;
    return;
  }
  root.innerHTML = "";
  active.forEach(t => {
    const options = state.batteries.filter(b => compatibleBattery(b, t));
    const pref = state.engagementPrefs[t.id] || { batteryId: options[0]?.id || "", shots: 1 };
    if (!state.engagementPrefs[t.id]) state.engagementPrefs[t.id] = pref;
    if (!options.some(o => o.id === pref.batteryId)) pref.batteryId = options[0]?.id || "";

    const card = document.createElement("div");
    card.className = "card";
    const selectId = "sel_" + t.id;
    const shotsId = "shots_" + t.id;
    const pId = "p_" + t.id;
    card.innerHTML = `
      <div class="row"><strong>${t.id} ${t.type}</strong><span class="mono">${t.eta.toFixed(1)}s</span></div>
      <div class="small">יעד: ${t.target.name} | מקור: ${t.originKey}</div>
      <div class="small" style="margin-top:4px">בחירת סוללה</div>
      <div class="row" style="margin-top:4px">
        <select id="${selectId}" data-threat-sel="${t.id}" style="flex:1">
          ${options.map(b => `<option value="${b.id}" ${pref.batteryId === b.id ? "selected" : ""}>${b.id} · ${batteryConfig[b.type].label} · ammo ${b.ammo}</option>`).join("") || `<option value="">אין סוללה תואמת</option>`}
        </select>
        <input id="${shotsId}" data-threat-shots="${t.id}" type="number" min="1" max="6" value="${pref.shots}" style="width:72px">
      </div>
      <div class="row" style="margin-top:4px">
        <button data-launch="${t.id}" ${options.length ? "" : "disabled"}>יירט</button>
        <button data-siren="${t.id}">הפעל אזעקה</button>
      </div>
      <div class="small" id="${pId}">אחוז ירוט: --</div>`;
    root.appendChild(card);
    updateThreatProbText(state, mapCtrl, t.id);
  });
}

function updateThreatProbText(state, mapCtrl, threatId) {
  const t = state.threats.find(x => x.id === threatId);
  if (!t) return;
  const pref = state.engagementPrefs[threatId];
  const sel = document.getElementById("sel_" + threatId);
  const shots = document.getElementById("shots_" + threatId);
  const pEl = document.getElementById("p_" + threatId);
  if (!pEl) return;
  const batteryId = pref?.batteryId || (sel ? sel.value : "");
  const n = Math.max(1, parseInt(String(pref?.shots ?? (shots ? shots.value : "1")), 10) || 1);
  const b = state.batteries.find(x => x.id === batteryId);
  if (!b) {
    pEl.textContent = "אחוז ירוט: --";
    return;
  }
  const p = interceptProbability(state, mapCtrl, b, t, n);
  pEl.textContent = `אחוז ירוט (סימולציה): ${Math.round(p * 100)}%`;
}

export function bindThreatLaunch(state, mapCtrl) {
  const root = document.getElementById("engagementList") || document.getElementById("threatList");
  root.addEventListener("change", e => {
    const selThreatId = e.target.getAttribute("data-threat-sel");
    if (selThreatId) {
      if (!state.engagementPrefs[selThreatId]) state.engagementPrefs[selThreatId] = { batteryId: "", shots: 1 };
      state.engagementPrefs[selThreatId].batteryId = e.target.value;
      updateThreatProbText(state, mapCtrl, selThreatId);
      return;
    }
    const shotsThreatId = e.target.getAttribute("data-threat-shots");
    if (shotsThreatId) {
      if (!state.engagementPrefs[shotsThreatId]) state.engagementPrefs[shotsThreatId] = { batteryId: "", shots: 1 };
      const v = Math.max(1, Math.min(6, parseInt(e.target.value || "1", 10) || 1));
      state.engagementPrefs[shotsThreatId].shots = v;
      e.target.value = String(v);
      updateThreatProbText(state, mapCtrl, shotsThreatId);
    }
  });
  root.addEventListener("input", e => {
    const shotsThreatId = e.target.getAttribute("data-threat-shots");
    if (!shotsThreatId) return;
    if (!state.engagementPrefs[shotsThreatId]) state.engagementPrefs[shotsThreatId] = { batteryId: "", shots: 1 };
    const v = Math.max(1, Math.min(6, parseInt(e.target.value || "1", 10) || 1));
    state.engagementPrefs[shotsThreatId].shots = v;
    updateThreatProbText(state, mapCtrl, shotsThreatId);
  });
  root.addEventListener("click", e => {
    const launchThreatId = e.target.getAttribute("data-launch");
    if (launchThreatId) {
      const pref = state.engagementPrefs[launchThreatId] || { batteryId: "", shots: 1 };
      const sel = document.getElementById("sel_" + launchThreatId);
      const shotsInput = document.getElementById("shots_" + launchThreatId);
      const batteryId = pref.batteryId || (sel ? sel.value : "");
      const n = Math.max(1, Math.min(6, pref.shots ?? (parseInt(shotsInput ? shotsInput.value : "1", 10) || 1)));
      manualLaunchByThreat(state, mapCtrl, launchThreatId, batteryId, n);
      return;
    }
    const sirenThreatId = e.target.getAttribute("data-siren");
    if (sirenThreatId) triggerSiren(state, mapCtrl, sirenThreatId);
  });
}

export function renderAssets(state) {
  const root = document.getElementById("assetList");
  root.innerHTML = "";
  state.batteries.forEach(b => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="row"><strong>${b.id} ${batteryConfig[b.type].label}</strong><span>${batteryConfig[b.type].icon}</span></div>
      <div class="small mono">lat:${b.lat.toFixed(3)} lng:${b.lng.toFixed(3)}</div>
      <div class="small">Ammo ${b.ammo}/${b.maxAmmo} | Reload ${(18 - b.reloadT).toFixed(1)}s</div>`;
    root.appendChild(card);
  });
  state.radars.forEach(r => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="row"><strong>${r.id} Radar</strong><span>📡</span></div>
      <div class="small mono">lat:${r.lat.toFixed(3)} lng:${r.lng.toFixed(3)}</div>
      <div class="small">Range ${r.rangeKm} km</div>`;
    root.appendChild(card);
  });
}

export function renderLogs(state) {
  const root = document.getElementById("logList");
  root.innerHTML = state.logs.slice(0, 60).map(l => `<div class="small ${l.cls}">${l.msg}</div>`).join("");
}

export function renderAll(state, mapCtrl) {
  renderHeader(state);
  renderThreatList(state, mapCtrl);
  renderEngagementList(state, mapCtrl);
  renderAssets(state);
  renderLogs(state);
  const activeThreatIds = new Set(state.threats.map(t => t.id));
  Object.keys(state.engagementPrefs).forEach(id => {
    if (!activeThreatIds.has(id)) delete state.engagementPrefs[id];
  });
}
