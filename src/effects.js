let toastTimer = null;
let fxTimer = null;

export function showToast(message) {
  const el = document.getElementById("actionToast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1200);
}

export function flashScreen(mode = "flash", ms = 300) {
  const el = document.getElementById("screenFx");
  if (!el) return;
  el.classList.remove("flash", "red-alert");
  el.classList.add(mode);
  clearTimeout(fxTimer);
  fxTimer = setTimeout(() => el.classList.remove("flash", "red-alert"), ms);
}
