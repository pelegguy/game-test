let ctx = null;

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

function tone(freq, duration, type = "sine", gainVal = 0.05, delay = 0) {
  const ac = getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = gainVal;
  osc.connect(gain);
  gain.connect(ac.destination);
  const startAt = ac.currentTime + delay;
  osc.start(startAt);
  osc.stop(startAt + duration);
}

export function unlockAudio() {
  const ac = getCtx();
  if (ac && ac.state === "suspended") ac.resume();
}

export function playLaunch() {
  tone(220, 0.08, "square", 0.06);
  tone(330, 0.08, "square", 0.04, 0.06);
}

export function playInterceptSuccess() {
  tone(520, 0.08, "triangle", 0.05);
  tone(740, 0.12, "triangle", 0.05, 0.08);
}

export function playInterceptFail() {
  tone(220, 0.14, "sawtooth", 0.06);
  tone(160, 0.2, "sawtooth", 0.05, 0.12);
}

export function playSiren() {
  tone(610, 0.18, "square", 0.05);
  tone(760, 0.18, "square", 0.05, 0.2);
  tone(610, 0.18, "square", 0.05, 0.4);
}
