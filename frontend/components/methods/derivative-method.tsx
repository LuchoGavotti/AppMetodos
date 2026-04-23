"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { MethodContainer } from "./method-container";
import { MathGraph } from "@/components/graph/math-graph";
import { TheoryModal, LaTeX } from "./theory-modal";
import { ExpressionKeyboard } from "./expression-keyboard";
import { api } from "@/lib/api";
import { getAutoViewBox } from "@/lib/graph-range";
import type { APIError, DerivativeResponse } from "@/types/methods";
import { Loader2, Play } from "lucide-react";

const THEORY_FORMULAS = [
  {
    label: "Diferencia Hacia Adelante",
    latex: "f'(x)\\approx\\frac{f(x+h)-f(x)}{h}",
  },
  {
    label: "Diferencia Hacia Atras",
    latex: "f'(x)\\approx\\frac{f(x)-f(x-h)}{h}",
  },
  {
    label: "Diferencia Central",
    latex: "f'(x)\\approx\\frac{f(x+h)-f(x-h)}{2h}",
  },
];

export function DerivativeMethod() {
  const [func, setFunc] = React.useState("sin(x)");
  const [x0, setX0] = React.useState("1");
  const [h, setH] = React.useState("0.01");
  const [method, setMethod] = React.useState<"forward" | "backward" | "central">(
    "central"
  );

  const [result, setResult] = React.useState<DerivativeResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const functionInputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const response = await api.derivative({
        function: func,
        x0: Number(x0),
        h: Number(h),
        method,
      });
      setResult(response);
    } catch (err) {
      const apiError = err as APIError;
      if (typeof apiError.detail === "string") setError(apiError.detail);
      else if (apiError.detail?.message) setError(apiError.detail.message);
      else setError("Ocurrio un error inesperado");
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const x0Num = Number(x0);
  const hNum = Number(h);
  const xLeft = Number.isFinite(x0Num) && Number.isFinite(hNum) ? x0Num - 5 * hNum : -5;
  const xRight = Number.isFinite(x0Num) && Number.isFinite(hNum) ? x0Num + 5 * hNum : 5;
  const graphPoints =
    result?.points_used.map((pt) => ({ x: pt.x, y: pt.y, color: "#f59e0b" })) || [];
  const viewBox = getAutoViewBox({
    xMin: xLeft,
    xMax: xRight,
    functions: func ? [func] : [],
    points: graphPoints.map((p) => ({ x: p.x, y: p.y })),
    defaultY: [-2, 2],
  });

  return (
    <MethodContainer
      title="Aproximacion de Derivadas"
      description="Aproxima la primera derivada usando esquemas de diferencias finitas."
      colorClass="method-derivative"
      theoryButton={
        <TheoryModal
          title="Derivadas Numericas"
          description="Diferencias finitas para aproximar derivadas."
          formulas={THEORY_FORMULAS}
        />
      }
      error={error}
      success={result ? `f'(${result.x0}) ≈ ${result.approximation}` : null}
      isLoading={isLoading}
      inputPanel={
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="derivative-function">Funcion f(x)</Label>
            <Input
              id="derivative-function"
              ref={functionInputRef}
              value={func}
              onChange={(e) => setFunc(e.target.value)}
              className="font-mono"
              placeholder="ej.: sin(x)"
            />
            <ExpressionKeyboard inputRef={functionInputRef} setValue={setFunc} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="derivative-x0">x₀</Label>
              <Input
                id="derivative-x0"
                type="number"
                step="any"
                value={x0}
                onChange={(e) => setX0(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="derivative-h">Paso h</Label>
              <Input
                id="derivative-h"
                type="number"
                step="any"
                value={h}
                onChange={(e) => setH(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Metodo</Label>
            <Select
              value={method}
              onValueChange={(value) =>
                setMethod(value as "forward" | "backward" | "central")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="forward">Adelante</SelectItem>
                <SelectItem value="backward">Atras</SelectItem>
                <SelectItem value="central">Central</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Calculando...
              </>
            ) : (
              <>
                <Play className="size-4" />
                Ejecutar Derivada
              </>
            )}
          </Button>
        </form>
      }
      graphPanel={
        <MathGraph
          functions={func ? [{ expr: func, color: "#0ea5e9" }] : []}
          points={graphPoints}
          viewBox={viewBox}
          height={360}
        />
      }
      resultsPanel={
        result ? (
          <Card className="glass-card">
            <CardContent className="pt-6 text-sm space-y-2">
              <p>
                <strong>Aproximacion:</strong> {result.approximation}
              </p>
              {result.exact_derivative !== undefined && (
                <p>
                    <strong>Derivada exacta:</strong> {result.exact_derivative}
                </p>
              )}
              {result.error !== undefined && (
                <p>
                    <strong>Error absoluto:</strong> {result.error}
                </p>
              )}
              <p className="text-muted-foreground">
                <LaTeX math={result.formula_latex} />
              </p>
            </CardContent>
          </Card>
        ) : null
      }
    />
  );
}
