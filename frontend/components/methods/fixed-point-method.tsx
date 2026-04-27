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
import { MethodContainer } from "./method-container";
import { MathGraph } from "@/components/graph/math-graph";
import { ResultsTable } from "./results-table";
import { TheoryModal, LaTeX } from "./theory-modal";
import { ExpressionKeyboard } from "./expression-keyboard";
import { api } from "@/lib/api";
import { getAutoViewBox } from "@/lib/graph-range";
import { parseIntegerExpression, parseNumericExpression, parseNumericExpressionSafe } from "@/lib/numeric-expression";
import type { FixedPointResponse, APIError } from "@/types/methods";
import { Play, Loader2 } from "lucide-react";

const THEORY_FORMULAS = [
  {
    label: "Iteracion de Punto Fijo",
    latex: "x_{n+1} = g(x_n)",
    description: "Partiendo de x0, aplica g(x) repetidamente para encontrar el punto fijo.",
  },
  {
    label: "Condicion de Convergencia",
    latex: "|g'(x)| < 1 \\text{ near the root}",
    description: "El metodo converge si la derivada de g(x) tiene magnitud menor que 1 cerca del punto fijo.",
  },
];

export function FixedPointMethod() {
  const [gFunc, setGFunc] = React.useState("(x + 2)^(1/3)");
  const [x0, setX0] = React.useState("1");
  const [tolerance, setTolerance] = React.useState("0.0001");
  const [maxIterations, setMaxIterations] = React.useState("100");
  const [errorType, setErrorType] = React.useState<"absolute" | "relative">("absolute");

  const [result, setResult] = React.useState<FixedPointResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const gFunctionInputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const x0Value = parseNumericExpression(x0, "Valor inicial (x0)");
      const toleranceValue = parseNumericExpression(tolerance, "Tolerancia");
      const maxIterationsValue = parseIntegerExpression(maxIterations, "Iteraciones maximas", 1);

      const response = await api.fixedPoint({
        g_function: gFunc,
        x0: x0Value,
        tolerance: toleranceValue,
        max_iterations: maxIterationsValue,
        error_type: errorType,
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
    { key: "error", label: "Error" },
  ];

  // Prepare graph data - show g(x) and y=x line
  const graphFunctions = gFunc
    ? [
        { expr: gFunc, color: "#8b5cf6", label: "g(x)" },
        { expr: "x", color: "#6b7280", label: "y=x" },
      ]
    : [];

  // Show iteration points
  const graphPoints = result
    ? result.iterations.map((iter, i) => ({
        x: iter.x_n,
        y: iter.g_xn,
        color: i === result.iterations.length - 1 ? "#22c55e" : "#0ea5e9",
      }))
    : [];

  // Add starting point
  const x0Num = parseNumericExpressionSafe(x0);
  if (!isNaN(x0Num)) {
    graphPoints.unshift({ x: x0Num, y: x0Num, color: "#f59e0b" });
  }

  const finiteXs = graphPoints
    .map((p) => p.x)
    .filter((v) => Number.isFinite(v));
  if (Number.isFinite(x0Num)) {
    finiteXs.push(x0Num);
  }

  const minObservedX = finiteXs.length > 0 ? Math.min(...finiteXs) : -1;
  const maxObservedX = finiteXs.length > 0 ? Math.max(...finiteXs) : 1;
  const centerX = (minObservedX + maxObservedX) / 2;
  const halfSpanX = Math.max(20, (maxObservedX - minObservedX) * 1.5 + 3);

  const viewBox = getAutoViewBox({
    xMin: centerX - halfSpanX,
    xMax: centerX + halfSpanX,
    functions: graphFunctions.map((f) => f.expr),
    points: graphPoints.map((p) => ({ x: p.x, y: p.y })),
    defaultY: [-5, 5],
  });

  const realRootDetail = result?.real_root_latex ? (
    <div className="space-y-1">
      <div>
        <LaTeX math={`x = ${result.real_root_latex}`} />
      </div>
      <div>Aproximacion decimal: {result.real_root_exact}</div>
    </div>
  ) : null;

  return (
    <MethodContainer
      title="Iteracion de Punto Fijo"
      description="Encuentra raices reformulando f(x)=0 como x=g(x) e iterando."
      colorClass="method-fixed-point"
      theoryButton={
        <TheoryModal
          title="Iteracion de Punto Fijo"
          description="Metodo iterativo que encuentra puntos fijos donde x = g(x)."
          formulas={THEORY_FORMULAS}
        />
      }
      error={error}
      warning={result?.convergence_warning}
      success={
        result?.converged
          ? `Convergio a la raiz x = ${result.root} en ${result.iterations.length} iteraciones`
          : null
      }
      resultDetail={realRootDetail}
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
                <div><LaTeX math={`|g'(x_0)| = ${result.dg_x0}`} /></div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="x0">Valor inicial (x0)</Label>
            <Input
              id="x0"
              type="text"
              value={x0}
              onChange={(e) => setX0(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tolerance">Tolerancia</Label>
              <Input
                id="tolerance"
                type="text"
                value={tolerance}
                onChange={(e) => setTolerance(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxIterations">Iteraciones maximas</Label>
              <Input
                id="maxIterations"
                type="text"
                value={maxIterations}
                onChange={(e) => setMaxIterations(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de error</Label>
            <Select value={errorType} onValueChange={(v) => setErrorType(v as "absolute" | "relative")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="absolute">Error absoluto</SelectItem>
                <SelectItem value="relative">Error relativo</SelectItem>
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
                Ejecutar Punto Fijo
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
