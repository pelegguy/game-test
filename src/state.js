export function createState() {
  return {
    t: 0,
    waveIdx: 0,
    waveTime: 0,
    paused: false,
    simSpeed: 1,
    morale: 1.0,
    pressure: 0.0,
    threats: [],
    decisions: [],
    logs: [],
    engagementPrefs: {},
    batteries: [],
    radars: [],
    ids: 1
  };
}

export function nextId(state, prefix) {
  return prefix + (state.ids++);
}

export function addLog(state, msg, cls = "") {
  state.logs.unshift({ msg, cls });
  if (state.logs.length > 120) state.logs.pop();
}
