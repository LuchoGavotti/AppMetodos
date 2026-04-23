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
import type { APIError, NewtonRaphsonResponse } from "@/types/methods";
import { Loader2, Play } from "lucide-react";

const THEORY_FORMULAS = [
  {
    label: "Actualizacion de Newton",
    latex: "x_{n+1}=x_n-\\frac{f(x_n)}{f'(x_n)}",
  },
  {
    label: "Recta Tangente",
    latex: "y=f(x_n)+f'(x_n)(x-x_n)",
  },
];

export function NewtonRaphsonMethod() {
  const [func, setFunc] = React.useState("x^3 - x - 2");
  const [x0, setX0] = React.useState("1.5");
  const [tolerance, setTolerance] = React.useState("0.0001");
  const [maxIterations, setMaxIterations] = React.useState("50");

  const [result, setResult] = React.useState<NewtonRaphsonResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const functionInputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await api.newtonRaphson({
        function: func,
        x0: Number(x0),
        tolerance: Number(tolerance),
        max_iterations: Number(maxIterations),
      });
      setResult(response);
    } catch (err) {
      const apiError = err as APIError;
      if (typeof apiError.detail === "string") setError(apiError.detail);
      else if (apiError.detail?.message) {
        setError(
          `${apiError.detail.message}${
            apiError.detail.suggestion ? ` ${apiError.detail.suggestion}` : ""
          }`
        );
      } else setError("Ocurrio un error inesperado");
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    { key: "iteration", label: "n" },
    { key: "x_n", label: "x_n" },
    { key: "f_xn", label: "f(x_n)" },
    { key: "df_xn", label: "f'(x_n)" },
    { key: "x_n1", label: "x_(n+1)" },
    { key: "error", label: "Error" },
  ];

  const graphPoints =
    result?.iterations.map((iter, i) => ({
      x: iter.x_n,
      y: iter.f_xn,
      color: i === result.iterations.length - 1 ? "#22c55e" : "#8b5cf6",
    })) || [];

  const viewBox = getAutoViewBox({
    xMin: -5,
    xMax: 5,
    functions: func ? [func] : [],
    points: graphPoints.map((p) => ({ x: p.x, y: p.y })),
    defaultY: [-10, 10],
  });

  return (
    <MethodContainer
      title="Metodo de Newton-Raphson"
      description="Busqueda de raices usando rectas tangentes e informacion de la derivada."
      colorClass="method-newton"
      theoryButton={
        <TheoryModal
          title="Newton-Raphson"
          description="Metodo iterativo rapido para encontrar raices basado en tangentes."
          formulas={THEORY_FORMULAS}
        />
      }
      error={error}
      success={
        result?.converged
          ? `Convergio a la raiz x = ${result.root} en ${result.iterations.length} iteraciones`
          : null
      }
      warning={
        result && !result.converged
          ? `No convergio en ${maxIterations} iteraciones.`
          : null
      }
      isLoading={isLoading}
      inputPanel={
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newton-function">Funcion f(x)</Label>
            <Input
              id="newton-function"
              ref={functionInputRef}
              value={func}
              onChange={(e) => setFunc(e.target.value)}
              className="font-mono"
            />
            <ExpressionKeyboard inputRef={functionInputRef} setValue={setFunc} />
            {result?.f_expr_latex && (
              <div className="text-xs text-muted-foreground space-y-1">
                <div>
                  <LaTeX math={`f(x)=${result.f_expr_latex}`} />
                </div>
                <div>
                  <LaTeX math={`f'(x)=${result.df_expr_latex}`} />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="newton-x0">Valor inicial x0</Label>
            <Input
              id="newton-x0"
              type="number"
              step="any"
              value={x0}
              onChange={(e) => setX0(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="newton-tol">Tolerancia</Label>
              <Input
                id="newton-tol"
                type="number"
                step="any"
                value={tolerance}
                onChange={(e) => setTolerance(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newton-max">Iteraciones maximas</Label>
              <Input
                id="newton-max"
                type="number"
                min={1}
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
                Ejecutar Newton-Raphson
              </>
            )}
          </Button>
        </form>
      }
      graphPanel={
        <MathGraph
          functions={func ? [{ expr: func, color: "#f59e0b" }] : []}
          points={graphPoints}
          lines={
            result
              ? result.tangent_lines.map((line) => ({
                  point: [line.x_point, line.y_point] as [number, number],
                  slope: line.slope,
                  color: "#0ea5e9",
                }))
              : []
          }
          viewBox={viewBox}
          height={360}
        />
      }
      resultsPanel={
        result ? (
          <ResultsTable title="Resultados de Iteraciones" columns={columns} data={result.iterations} />
        ) : null
      }
    />
  );
}
