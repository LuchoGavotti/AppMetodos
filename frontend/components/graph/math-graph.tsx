"use client";

import * as React from "react";
import {
  Mafs,
  Coordinates,
  Plot,
  Point,
  Line,
  Polygon,
} from "mafs";
import { evaluate } from "@/lib/math-parser";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface MathGraphProps {
  functions?: Array<{
    expr: string;
    color?: string;
    label?: string;
    opacity?: number;
  }>;
  points?: Array<{
    x: number;
    y: number;
    color?: string;
    label?: string;
  }>;
  lines?: Array<{
    point: [number, number];
    slope: number;
    color?: string;
    label?: string;
  }>;
  segments?: Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color?: string;
  }>;
  rectangles?: Array<{
    x1: number;
    x2: number;
    height: number;
    color?: string;
  }>;
  trapezoids?: Array<{
    x1: number;
    x2: number;
    y1: number;
    y2: number;
    color?: string;
  }>;
  viewBox?: {
    x: [number, number];
    y: [number, number];
  };
  height?: number;
  showGrid?: boolean;
  className?: string;
}

function getNiceStep(rawStep: number): number {
  if (!Number.isFinite(rawStep) || rawStep <= 0) {
    return 1;
  }

  const exponent = Math.floor(Math.log10(rawStep));
  const magnitude = 10 ** exponent;
  const fraction = rawStep / magnitude;

  if (fraction <= 1) return 1 * magnitude;
  if (fraction <= 2) return 2 * magnitude;
  if (fraction <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

function formatTick(value: number, step: number): string {
  if (!Number.isFinite(value)) return "";
  if (Math.abs(value) < step / 1000) return "0";

  const normalized = Math.max(0, -Math.floor(Math.log10(Math.max(step, 1e-12))));
  const decimals = Math.min(normalized + 1, 6);
  return value.toFixed(decimals).replace(/\.0+$|(?<=\.[0-9]*?)0+$/g, "");
}

export function MathGraph({
  functions = [],
  points = [],
  lines = [],
  segments = [],
  rectangles = [],
  trapezoids = [],
  viewBox = { x: [-10, 10], y: [-10, 10] },
  height = 400,
  showGrid = true,
  className,
}: MathGraphProps) {
  const [mounted, setMounted] = React.useState(false);
  const [mafsKey, setMafsKey] = React.useState(0);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // When parent auto-fit bounds change, refresh graph view.
  React.useEffect(() => {
    setMafsKey((prev) => prev + 1);
  }, [viewBox.x[0], viewBox.x[1], viewBox.y[0], viewBox.y[1]]);

  const xSpan = Math.abs(viewBox.x[1] - viewBox.x[0]);
  const ySpan = Math.abs(viewBox.y[1] - viewBox.y[0]);

  // Keep around 6-10 labeled ticks visible, even when range is very large.
  const xStep = getNiceStep(xSpan / 8);
  const yStep = getNiceStep(ySpan / 7);

  // Default colors
  const defaultColors = [
    "#8b5cf6", // purple
    "#0ea5e9", // sky
    "#22c55e", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#ec4899", // pink
  ];

  if (!mounted) {
    return (
      <div
        className={className}
        style={{ height }}
      >
        <div className="flex h-full items-center justify-center bg-muted/20 rounded-lg">
          <span className="text-muted-foreground">Cargando grafico...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={{ height, position: "relative" }}>
      <Mafs
        key={mafsKey}
        height={height}
        viewBox={viewBox}
        preserveAspectRatio={false}
        zoom
        pan
      >
        {showGrid && (
          <Coordinates.Cartesian
            xAxis={{
              lines: xStep,
              subdivisions: 2,
              labels: (value) => formatTick(value, xStep),
            }}
            yAxis={{
              lines: yStep,
              subdivisions: 2,
              labels: (value) => formatTick(value, yStep),
            }}
          />
        )}

        {/* Render rectangles (for integration) */}
        {rectangles.map((rect, i) => (
          <Polygon
            key={`rect-${i}`}
            points={[
              [rect.x1, 0],
              [rect.x1, rect.height],
              [rect.x2, rect.height],
              [rect.x2, 0],
            ]}
            color={rect.color || defaultColors[i % defaultColors.length]}
            fillOpacity={0.2}
            strokeOpacity={0.5}
          />
        ))}

        {/* Render trapezoids (for integration) */}
        {trapezoids.map((trap, i) => (
          <Polygon
            key={`trap-${i}`}
            points={[
              [trap.x1, 0],
              [trap.x1, trap.y1],
              [trap.x2, trap.y2],
              [trap.x2, 0],
            ]}
            color={trap.color || defaultColors[i % defaultColors.length]}
            fillOpacity={0.2}
            strokeOpacity={0.5}
          />
        ))}

        {/* Render functions */}
        {functions.map((fn, i) => (
          <Plot.OfX
            key={`fn-${i}`}
            y={(x) => {
              try {
                return evaluate(fn.expr, x);
              } catch {
                return NaN;
              }
            }}
            color={fn.color || defaultColors[i % defaultColors.length]}
            opacity={fn.opacity}
          />
        ))}

        {/* Render tangent lines */}
        {lines.map((line, i) => (
          <Line.ThroughPoints
            key={`line-${i}`}
            point1={line.point}
            point2={[
              line.point[0] + 1,
              line.point[1] + line.slope,
            ]}
            color={line.color || defaultColors[(i + 2) % defaultColors.length]}
            opacity={0.7}
          />
        ))}

        {/* Render line segments (for piecewise point connections) */}
        {segments.map((segment, i) => (
          <Line.Segment
            key={`segment-${i}`}
            point1={[segment.x1, segment.y1]}
            point2={[segment.x2, segment.y2]}
            color={segment.color || "#2563eb"}
            opacity={0.75}
          />
        ))}

        {/* Render points */}
        {points.map((pt, i) => (
          <Point
            key={`pt-${i}`}
            x={pt.x}
            y={pt.y}
            color={pt.color || defaultColors[i % defaultColors.length]}
          />
        ))}

        {/* y = x line for fixed point iteration */}
        {functions.some((f) => f.label === "y=x") && (
          <Plot.OfX y={(x) => x} color="#888888" opacity={0.5} />
        )}
      </Mafs>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="absolute top-2 right-2 h-8 gap-1.5 bg-background/80 backdrop-blur-sm"
        onClick={() => setMafsKey((prev) => prev + 1)}
      >
        <RotateCcw className="size-3.5" />
        Reiniciar vista
      </Button>
    </div>
  );
}
