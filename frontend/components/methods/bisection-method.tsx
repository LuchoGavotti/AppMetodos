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
import type { BisectionResponse, APIError } from "@/types/methods";
import { Play, Loader2 } from "lucide-react";

const THEORY_FORMULAS = [
  {
    label: "Formula de Biseccion",
    latex: "c = \\frac{a + b}{2}",
    description: "El punto medio c se calcula como el promedio de los extremos del intervalo.",
  },
  {
    label: "Teorema de Bolzano",
    latex: "f(a) \\cdot f(b) < 0 \\implies \\exists c \\in (a,b) : f(c) = 0",
    description: "Si f es continua en [a,b] y f(a) y f(b) tienen signos opuestos, existe al menos una raiz en (a,b).",
  },
  {
    label: "Cota del Error",
    latex: "|p - c_n| \\leq \\frac{b - a}{2^{n+1}}",
    description: "El error esta acotado por el ancho del intervalo dividido por 2^(n+1).",
  },
];

export function BisectionMethod() {
  const [func, setFunc] = React.useState("x^3 - x - 2");
  const [a, setA] = React.useState("-2");
  const [b, setB] = React.useState("3");
  const [tolerance, setTolerance] = React.useState("0.0001");
  const [maxIterations, setMaxIterations] = React.useState("100");
  const [errorType, setErrorType] = React.useState<"absolute" | "relative">("absolute");

  const [result, setResult] = React.useState<BisectionResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const functionInputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await api.bisection({
        function: func,
        a: parseFloat(a),
        b: parseFloat(b),
        tolerance: parseFloat(tolerance),
        max_iterations: parseInt(maxIterations),
        error_type: errorType,
      });
      setResult(response);
    } catch (err) {
      const apiError = err as APIError;
      if (typeof apiError.detail === "string") {
        setError(apiError.detail);
      } else if (apiError.detail?.message) {
        setError(`${apiError.detail.message}${apiError.detail.suggestion ? ` ${apiError.detail.suggestion}` : ""}`);
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
    { key: "a", label: "a" },
    { key: "b", label: "b" },
    { key: "c", label: "c" },
    { key: "f_c", label: "f(c)" },
    { key: "error", label: "Error" },
  ];

  // Prepare graph data
  const graphFunctions = func ? [{ expr: func, color: "#0ea5e9" }] : [];
  const graphPoints = result
    ? result.iterations.map((iter, i) => ({
        x: iter.c,
        y: 0,
        color: i === result.iterations.length - 1 ? "#22c55e" : "#8b5cf6",
      }))
    : [];

  // Add interval bounds
  const aNum = parseFloat(a);
  const bNum = parseFloat(b);
  if (!isNaN(aNum) && !isNaN(bNum)) {
    graphPoints.push({ x: aNum, y: 0, color: "#f59e0b" });
    graphPoints.push({ x: bNum, y: 0, color: "#f59e0b" });
  }

  const viewBox = getAutoViewBox({
    xMin: Number.isFinite(aNum) ? aNum : -5,
    xMax: Number.isFinite(bNum) ? bNum : 5,
    functions: graphFunctions.map((f) => f.expr),
    points: graphPoints.map((p) => ({ x: p.x, y: p.y })),
    defaultY: [-10, 10],
  });

  return (
    <MethodContainer
      title="Metodo de Biseccion"
      description="Encuentra raices bisecando un intervalo repetidamente y eligiendo el subintervalo que contiene la raiz."
      colorClass="method-bisection"
      theoryButton={
        <TheoryModal
          title="Metodo de Biseccion"
          description="Algoritmo simple y robusto para encontrar raices bisecando un intervalo en cada paso."
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
          ? `No convergio en ${maxIterations} iteraciones. Aproximacion actual: ${result.root}`
          : null
      }
      isLoading={isLoading}
      inputPanel={
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="function">Funcion f(x)</Label>
            <Input
              id="function"
              ref={functionInputRef}
              value={func}
              onChange={(e) => setFunc(e.target.value)}
              placeholder="ej.: x^3 - x - 2"
              className="font-mono"
            />
            <ExpressionKeyboard inputRef={functionInputRef} setValue={setFunc} />
            {result?.f_expr_latex && (
              <div className="text-xs text-muted-foreground">
                <LaTeX math={`f(x) = ${result.f_expr_latex}`} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="a">Limite inferior (a)</Label>
              <Input
                id="a"
                type="number"
                step="any"
                value={a}
                onChange={(e) => setA(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="b">Limite superior (b)</Label>
              <Input
                id="b"
                type="number"
                step="any"
                value={b}
                onChange={(e) => setB(e.target.value)}
              />
            </div>
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
                Ejecutar Biseccion
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
