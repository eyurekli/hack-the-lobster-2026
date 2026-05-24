// Maps a suitability score [0, 1] to an RGB color.
// 0.0 = deep red (unviable), 0.5 = amber (marginal), 1.0 = teal-green (optimal)

export function scoreToColor(score) {
  const s = Math.max(0, Math.min(1, score));

  let r, g, b;

  if (s < 0.5) {
    // red → amber
    const t = s / 0.5;
    r = 210;
    g = Math.round(60 + t * 100);
    b = Math.round(40 + t * 20);
  } else {
    // amber → teal-green
    const t = (s - 0.5) / 0.5;
    r = Math.round(210 - t * 150);
    g = Math.round(160 + t * 60);
    b = Math.round(60 + t * 80);
  }

  return `rgb(${r},${g},${b})`;
}

export function scoreToLabel(score) {
  if (score >= 0.75) return "High";
  if (score >= 0.5) return "Moderate";
  if (score >= 0.25) return "Low";
  return "Unviable";
}
