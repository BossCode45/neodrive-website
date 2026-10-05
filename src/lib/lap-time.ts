/** A lap time in the game's format, `MM:SS.mmm`: 9233 → "00:09.233". */
export function formatTime(ms: number) {
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  const millis = ms % 1000;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

/** Gap to first place in seconds: 282 → "+0.282". */
export function formatGap(ms: number) {
  return `+${(ms / 1000).toFixed(3)}`;
}
