/**
 * Kumpulan fungsi matematika ringan yang dipakai di banyak sistem.
 * Semua pure function, tidak ada state.
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Exponential smoothing — lebih stabil dari lerp biasa untuk frame rate
 * yang tidak konsisten. Rumus: v += (target - v) * (1 - exp(-k * dt))
 * - k: semakin besar, semakin cepat mendekati target.
 */
export function damp(
  current: number,
  target: number,
  smoothing: number,
  dt: number
): number {
  return lerp(current, target, 1 - Math.exp(-smoothing * dt));
}

export function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Normalisasi vektor 2D. Kalau panjangnya 0, kembalikan (0, 0)
 * supaya tidak ada division by zero.
 */
export function normalize(x: number, y: number): { x: number; y: number } {
  const len = Math.sqrt(x * x + y * y);
  if (len < 1e-6) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}

/**
 * Rotasi vektor 2D sebesar radian.
 */
export function rotate(
  x: number,
  y: number,
  radians: number
): { x: number; y: number } {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}