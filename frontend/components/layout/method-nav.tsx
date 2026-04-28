"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Binary,
  Target,
  Zap,
  TrendingDown,
  Spline,
  LineChart,
  AreaChart,
  Dices,
  Route,
  Sigma,
} from "lucide-react";

export type MethodId =
  | "bisection"
  | "fixed-point"
  | "aitken"
  | "newton-raphson"
  | "interpolation"
  | "derivative"
  | "integration"
  | "monte-carlo"
  | "differential-equation"
  | "analytical-solver";

interface Method {
  id: MethodId;
  name: string;
  shortName: string;
  icon: React.ElementType;
  colorClass: string;
}

const methods: Method[] = [
  {
    id: "bisection",
    name: "Metodo de Biseccion",
    shortName: "Biseccion",
    icon: Binary,
    colorClass: "method-bisection",
  },
  {
    id: "fixed-point",
    name: "Iteracion de Punto Fijo",
    shortName: "Punto Fijo",
    icon: Target,
    colorClass: "method-fixed-point",
  },
  {
    id: "aitken",
    name: "Aceleracion de Aitken",
    shortName: "Aitken",
    icon: Zap,
    colorClass: "method-aitken",
  },
  {
    id: "newton-raphson",
    name: "Newton-Raphson",
    shortName: "Newton",
    icon: TrendingDown,
    colorClass: "method-newton",
  },
  {
    id: "interpolation",
    name: "Interpolacion de Lagrange",
    shortName: "Interpolacion",
    icon: Spline,
    colorClass: "method-interpolation",
  },
  {
    id: "derivative",
    name: "Aproximacion de Derivadas",
    shortName: "Derivadas",
    icon: LineChart,
    colorClass: "method-derivative",
  },
  {
    id: "integration",
    name: "Integracion Numerica",
    shortName: "Integracion",
    icon: AreaChart,
    colorClass: "method-integration",
  },
  {
    id: "monte-carlo",
    name: "Integracion Monte Carlo",
    shortName: "Monte Carlo",
    icon: Dices,
    colorClass: "method-monte-carlo",
  },
  {
    id: "differential-equation",
    name: "Ecuaciones Diferenciales",
    shortName: "EDO",
    icon: Route,
    colorClass: "method-differential-equation",
  },
  {
    id: "analytical-solver",
    name: "Resolucion Analitica",
    shortName: "Analitica",
    icon: Sigma,
    colorClass: "method-integration",
  },
];

interface MethodNavProps {
  activeMethod: MethodId;
  onMethodChange: (method: MethodId) => void;
}

export function MethodNav({ activeMethod, onMethodChange }: MethodNavProps) {
  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex items-center gap-2 pb-2">
        {methods.map((method) => {
          const Icon = method.icon;
          const isActive = activeMethod === method.id;
          return (
            <button
              key={method.id}
              onClick={() => onMethodChange(method.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                "border border-transparent",
                "hover:bg-secondary/80",
                isActive && [
                  "bg-secondary border-border",
                  "text-foreground",
                  method.colorClass,
                ],
                !isActive && "text-muted-foreground"
              )}
              style={
                isActive
                  ? ({ "--accent-color": "var(--method-color)" } as React.CSSProperties)
                  : undefined
              }
            >
              <Icon
                className={cn(
                  "size-4",
                  isActive && "text-[var(--method-color)]"
                )}
              />
              <span className="hidden sm:inline">{method.name}</span>
              <span className="sm:hidden">{method.shortName}</span>
            </button>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

export { methods };
