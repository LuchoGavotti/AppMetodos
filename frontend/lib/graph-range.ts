import { evaluate } from "@/lib/math-parser";

type XYPoint = { x: number; y: number };

interface AutoViewBoxInput {
  xMin: number;
  xMax: number;
  functions?: string[];
  points?: XYPoint[];
  defaultY?: [number, number];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function quantile(values: number[], q: number): number {
  if (values.length === 0) return NaN;
  if (values.length === 1) return values[0];

  const index = (values.length - 1) * q;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) return values[lower];

  const weight = index - lower;
  return values[lower] * (1 - weight) + values[upper] * weight;
}

export function getAutoViewBox({
  xMin,
  xMax,
  functions = [],
  points = [],
  defaultY = [-10, 10],
}: AutoViewBoxInput): { x: [number, number]; y: [number, number] } {
  const x1 = Number.isFinite(xMin) ? xMin : -10;
  const x2 = Number.isFinite(xMax) ? xMax : 10;
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);

  const ys: number[] = [];

  const SAMPLE_COUNT = 220;
  const dx = (maxX - minX) / SAMPLE_COUNT;

  for (const fn of functions) {
    for (let i = 0; i <= SAMPLE_COUNT; i++) {
      const x = minX + i * dx;
      const y = evaluate(fn, x);
      if (Number.isFinite(y)) {
        ys.push(clamp(y, -1000, 1000));
      }
    }
  }

  for (const p of points) {
    if (Number.isFinite(p.y)) {
      ys.push(clamp(p.y, -1000, 1000));
    }
  }

  const xPad = Math.max((maxX - minX) * 0.08, 0.5);
  const viewX: [number, number] = [minX - xPad, maxX + xPad];

  if (ys.length === 0) {
    return { x: viewX, y: defaultY };
  }

  const sortedYs = [...ys].sort((a, b) => a - b);

  // Ignore extreme spikes from asymptotes so the plotted curve remains readable.
  const qLow = quantile(sortedYs, 0.05);
  const qHigh = quantile(sortedYs, 0.95);
  const minY = Number.isFinite(qLow) ? qLow : Math.min(...sortedYs);
  const maxY = Number.isFinite(qHigh) ? qHigh : Math.max(...sortedYs);
  const spread = Math.max(maxY - minY, 1);
  const yPad = spread * 0.15;
  const yLow = clamp(minY - yPad, -1200, 1200);
  const yHigh = clamp(maxY + yPad, -1200, 1200);

  return { x: viewX, y: [yLow, yHigh] };
}
