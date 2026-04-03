export function rand(min, max) {
  return min + Math.random() * (max - min);
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function fmtTime(sec) {
  const s = Math.floor(sec);
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}

export function randPointInBox(box) {
  return {
    lat: rand(box[0][0], box[1][0]),
    lng: rand(box[0][1], box[1][1])
  };
}

export function threatColor(type) {
  if (type === "ROCKET") return "#7affc6";
  if (type === "DRONE") return "#85d2ff";
  if (type === "CRUISE") return "#ffd58f";
  if (type === "BALLISTIC_ENDO") return "#ffad74";
  return "#ff7d74";
}
