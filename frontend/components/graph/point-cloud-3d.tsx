"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CloudPoint {
  x: number;
  y: number;
  z: number;
  accepted?: boolean | null;
  value?: number;
}

interface PointCloud3DProps {
  points: CloudPoint[];
  height?: number;
  className?: string;
  title?: string;
}

interface ProjectedPoint {
  sx: number;
  sy: number;
  depth: number;
  accepted?: boolean | null;
  value?: number;
  fill?: string;
}

function projectPoint(
  x: number,
  y: number,
  z: number,
  azimuth: number,
  elevation: number
): { x: number; y: number; depth: number } {
  const x1 = Math.cos(azimuth) * x - Math.sin(azimuth) * y;
  const y1 = Math.sin(azimuth) * x + Math.cos(azimuth) * y;

  const y2 = Math.cos(elevation) * y1 - Math.sin(elevation) * z;
  const z2 = Math.sin(elevation) * y1 + Math.cos(elevation) * z;

  return { x: x1, y: y2, depth: z2 };
}

function normalizeRange(min: number, max: number): number {
  return Math.max(Math.abs(max - min), 1e-9);
}

function colorForValue(value: number, minVal: number, maxVal: number): string {
  const t = (value - minVal) / normalizeRange(minVal, maxVal);
  const clamped = Math.min(1, Math.max(0, t));

  const r = Math.round(20 + 210 * clamped);
  const g = Math.round(90 + 120 * (1 - clamped));
  const b = Math.round(220 - 150 * clamped);
  return `rgb(${r}, ${g}, ${b})`;
}

export function PointCloud3D({
  points,
  height = 360,
  className,
  title,
}: PointCloud3DProps) {
  const width = 680;

  const [azimuth, setAzimuth] = React.useState((-35 * Math.PI) / 180);
  const [elevation, setElevation] = React.useState((25 * Math.PI) / 180);
  const [zoom, setZoom] = React.useState(1);
  const [dragging, setDragging] = React.useState(false);
  const dragStart = React.useRef<{ x: number; y: number } | null>(null);

  const normalizedPoints = React.useMemo(() => {
    if (points.length === 0) return [];

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const zs = points.map((p) => p.z);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);

    const sx = normalizeRange(minX, maxX);
    const sy = normalizeRange(minY, maxY);
    const sz = normalizeRange(minZ, maxZ);

    return points.map((p) => ({
      x: ((p.x - minX) / sx) * 2 - 1,
      y: ((p.y - minY) / sy) * 2 - 1,
      z: ((p.z - minZ) / sz) * 2 - 1,
      accepted: p.accepted,
      value: p.value,
    }));
  }, [points]);

  const projected = React.useMemo<ProjectedPoint[]>(() => {
    if (normalizedPoints.length === 0) return [];

    const baseScale = Math.min(width, height) * 0.28;
    const cx = width / 2;
    const cy = height / 2;

    const valueList = points.map((p) => p.value).filter((v): v is number => typeof v === "number");
    const valueMin = valueList.length > 0 ? Math.min(...valueList) : 0;
    const valueMax = valueList.length > 0 ? Math.max(...valueList) : 1;

    return normalizedPoints
      .map((p) => {
      const pr = projectPoint(p.x, p.y, p.z, azimuth, elevation);
      return {
        sx: cx + pr.x * baseScale * zoom,
        sy: cy - pr.y * baseScale * zoom,
        depth: pr.depth,
        accepted: p.accepted,
        value: p.value,
        valueMin,
        valueMax,
      };
    })
      .sort((a, b) => a.depth - b.depth)
      .map((p) => {
        let fill = "rgba(14,165,233,0.78)";
        if (p.accepted === true) fill = "rgba(34,197,94,0.78)";
        if (p.accepted === false) fill = "rgba(239,68,68,0.72)";
        if (p.accepted == null && typeof p.value === "number") {
          fill = colorForValue(p.value, p.valueMin, p.valueMax);
        }

        return {
          sx: p.sx,
          sy: p.sy,
          depth: p.depth,
          accepted: p.accepted,
          value: p.value,
          fill,
        };
      }) as ProjectedPoint[];
  }, [normalizedPoints, points, height, azimuth, elevation, zoom]);

  const axisLines = React.useMemo(() => {
    const baseScale = Math.min(width, height) * 0.3 * zoom;
    const cx = width / 2;
    const cy = height / 2;

    const axes = [
      { from: [-1, 0, 0] as const, to: [1, 0, 0] as const, color: "rgba(239,68,68,0.7)", label: "X" },
      { from: [0, -1, 0] as const, to: [0, 1, 0] as const, color: "rgba(34,197,94,0.7)", label: "Y" },
      { from: [0, 0, -1] as const, to: [0, 0, 1] as const, color: "rgba(14,165,233,0.75)", label: "Z" },
    ];

    return axes.map((axis) => {
      const a = projectPoint(axis.from[0], axis.from[1], axis.from[2], azimuth, elevation);
      const b = projectPoint(axis.to[0], axis.to[1], axis.to[2], azimuth, elevation);
      return {
        x1: cx + a.x * baseScale,
        y1: cy - a.y * baseScale,
        x2: cx + b.x * baseScale,
        y2: cy - b.y * baseScale,
        color: axis.color,
        label: axis.label,
      };
    });
  }, [azimuth, elevation, zoom, height]);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    dragStart.current = { x: e.clientX, y: e.clientY };

    setAzimuth((prev) => prev + dx * 0.01);
    setElevation((prev) => Math.max(-1.35, Math.min(1.35, prev + dy * 0.01)));
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    setDragging(false);
    dragStart.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((prev) => Math.max(0.55, Math.min(3.2, prev * factor)));
  };

  const onDoubleClick = () => {
    setAzimuth((-35 * Math.PI) / 180);
    setElevation((25 * Math.PI) / 180);
    setZoom(1);
  };

  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-muted/15", className)} style={{ height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={cn("h-full w-full", dragging ? "cursor-grabbing" : "cursor-grab")}
        role="img"
        aria-label="Grafico 3D de puntos Monte Carlo"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
      >
        <rect x="0" y="0" width={width} height={height} fill="transparent" />
        {axisLines.map((axis) => (
          <g key={axis.label}>
            <line x1={axis.x1} y1={axis.y1} x2={axis.x2} y2={axis.y2} stroke={axis.color} strokeWidth="1.2" />
            <text x={axis.x2 + 4} y={axis.y2 - 3} fontSize="10" fill={axis.color}>{axis.label}</text>
          </g>
        ))}
        {projected.map((p, i) => (
          <circle
            key={i}
            cx={p.sx}
            cy={p.sy}
            r="2.2"
            fill={p.fill}
            opacity={0.8}
          />
        ))}
      </svg>
      {title && (
        <div className="pointer-events-none absolute left-2 top-2 rounded border border-border bg-background/75 px-2 py-1 text-xs text-muted-foreground">
          {title}
        </div>
      )}
      <div className="pointer-events-none absolute bottom-2 right-2 rounded border border-border bg-background/75 px-2 py-1 text-[11px] text-muted-foreground">
        Arrastrar: rotar | Rueda: zoom | Doble clic: reset
      </div>
    </div>
  );
}
