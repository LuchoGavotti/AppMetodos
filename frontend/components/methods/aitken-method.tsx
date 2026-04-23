"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MethodContainer } from "./method-container";
import { MathGraph } from "@/components/graph/math-graph";
import { ResultsTable } from "./results-table";
import { TheoryModal, LaTeX } from "./theory-modal";
import { ExpressionKeyboard } from "./expression-keyboard";
import { api } from "@/lib/api";
import { getAutoViewBox } from "@/lib/graph-range";
import type { AitkenResponse, APIError } from "@/types/methods";
import { Play, Loader2 } from "lucide-react";

const THEORY_FORMULAS = [
  {
    label: "Formula Δ² de Aitken",
    latex: "\\hat{x}_n = x_n - \\frac{(x_{n+1} - x_n)^2}{x_{n+2} - 2x_{n+1} + x_n}",
    description: "Acelera la convergencia extrapolando a partir de tres iteraciones consecutivas.",
  },
  {
    label: "Forma Alternativa",
    latex: "\\hat{x}_n = x_n - \\frac{(\\Delta x_n)^2}{\\Delta^2 x_n}",
    description: "Usando diferencias hacia adelante: Δx_n = x_n+1 - x_n y Δ²x_n = Δx_n+1 - Δx_n.",
  },
  {
    label: "Convergencia",
    latex: "\\lim_{n \\to \\infty} \\frac{\\hat{x}_n - p}{(x_n - p)^2} = \\frac{-g''(p)}{2g'(p)}",
    description: "El metodo de Aitken logra convergencia cuadratica a partir de secuencias con convergencia lineal.",
  },
];

export function AitkenMethod() {
  const [gFunc, setGFunc] = React.useState("(x + 2)^(1/3)");
  const [x0, setX0] = React.useState("1");
  const [tolerance, setTolerance] = React.useState("0.0001");
  const [maxIterations, setMaxIterations] = React.useState("100");

  const [result, setResult] = React.useState<AitkenResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const gFunctionInputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await api.aitken({
        g_function: gFunc,
        x0: parseFloat(x0),
        tolerance: parseFloat(tolerance),
        max_iterations: parseInt(maxIterations),
      });
      setResult(response);
    } catch (err) {
      const apiError = err as APIError;
      if (typeof apiError.detail === "string") {
        setError(apiError.detail);
      } else if (apiError.detail?.message) {
        setError(apiError.detail.message);
      } else {
        setError("Ocurrio un error inesperado");
      }
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    { key: "iteration", label: "n" },
    { key: "x_n", label: "xₙ" },
    { key: "x_n1", label: "xₙ₊₁" },
    { key: "x_n2", label: "xₙ₊₂" },
    { key: "x_accel", label: "x̂_n (acel)" },
    { key: "error", label: "Error" },
  ];

  // Prepare graph data
  const graphFunctions = gFunc
    ? [
        { expr: gFunc, color: "#a855f7", label: "g(x)" },
        { expr: "x", color: "#6b7280", label: "y=x" },
      ]
    : [];

  // Show accelerated points
  const graphPoints = result
    ? result.iterations.map((iter, i) => ({
        x: iter.x_accel,
        y: iter.x_accel,
        color: i === result.iterations.length - 1 ? "#22c55e" : "#0ea5e9",
      }))
    : [];

  const viewBox = getAutoViewBox({
    xMin: -5,
    xMax: 5,
    functions: graphFunctions.map((f) => f.expr),
    points: graphPoints.map((p) => ({ x: p.x, y: p.y })),
    defaultY: [-5, 5],
  });

  return (
    <MethodContainer
      title="Aceleracion Δ² de Aitken"
      description="Acelera la convergencia de la iteracion de punto fijo usando extrapolacion de Aitken."
      colorClass="method-aitken"
      theoryButton={
        <TheoryModal
          title="Aceleracion Δ² de Aitken"
          description="Metodo de aceleracion de secuencias que mejora la convergencia lineal a cuadratica."
          formulas={THEORY_FORMULAS}
        />
      }
      error={error}
      success={
        result?.converged
          ? `Convergio a la raiz x = ${result.root} en ${result.iterations.length} iteraciones`
          : null
      }
      isLoading={isLoading}
      inputPanel={
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gFunction">Funcion de iteracion g(x)</Label>
            <Input
              id="gFunction"
              ref={gFunctionInputRef}
              value={gFunc}
              onChange={(e) => setGFunc(e.target.value)}
              placeholder="ej.: (x + 2)^(1/3)"
              className="font-mono"
            />
            <ExpressionKeyboard inputRef={gFunctionInputRef} setValue={setGFunc} />
            {result?.g_expr_latex && (
              <div className="text-xs text-muted-foreground space-y-1">
                <div><LaTeX math={`g(x) = ${result.g_expr_latex}`} /></div>
                <div><LaTeX math={`g'(x) = ${result.dg_expr_latex}`} /></div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="x0">Valor inicial (x0)</Label>
            <Input
              id="x0"
              type="number"
              step="any"
              value={x0}
              onChange={(e) => setX0(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tolerance">Tolerancia</Label>
              <Input
                id="tolerance"
                type="number"
                step="any"
                value={tolerance}
                onChange={(e) => setTolerance(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxIterations">Iteraciones maximas</Label>
              <Input
                id="maxIterations"
                type="number"
                value={maxIterations}
                onChange={(e) => setMaxIterations(e.target.value)}
              />
            </div>
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
                Ejecutar Aitken
              </>
            )}
          </Button>
        </form>
      }
      graphPanel={
        <MathGraph
          functions={graphFunctions}
          points={graphPoints}
          viewBox={viewBox}
          height={350}
        />
      }
      resultsPanel={
        result && (
          <ResultsTable
            title="Resultados de Iteraciones"
            columns={columns}
            data={result.iterations}
            highlightLast
          />
        )
      }
    />
  );
}
