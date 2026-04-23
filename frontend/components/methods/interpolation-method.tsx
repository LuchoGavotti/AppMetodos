"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MethodContainer } from "./method-container";
import { MathGraph } from "@/components/graph/math-graph";
import { TheoryModal, LaTeX } from "./theory-modal";
import { ExpressionKeyboard } from "./expression-keyboard";
import { api } from "@/lib/api";
import { getAutoViewBox } from "@/lib/graph-range";
import { evaluate } from "@/lib/math-parser";
import type { APIError, InterpolationResponse } from "@/types/methods";
import { Loader2, Play, Plus, Trash2, WandSparkles } from "lucide-react";

const THEORY_FORMULAS = [
  { label: "Polinomio de Lagrange", latex: "P_n(x)=\\sum_{i=0}^{n} y_i L_i(x)" },
  {
    label: "Polinomio Base",
    latex: "L_i(x)=\\prod_{j=0, j\\neq i}^{n}\\frac{x-x_j}{x_i-x_j}",
  },
];

interface PointRow {
  x: string;
  y: string;
}

export function InterpolationMethod() {
  const [rows, setRows] = React.useState<PointRow[]>([
    { x: "-2", y: "4" },
    { x: "-1", y: "1" },
    { x: "0", y: "0" },
    { x: "1", y: "1" },
    { x: "2", y: "4" },
  ]);
  const [showBasisInGraph, setShowBasisInGraph] = React.useState(false);
  const [trueFunction, setTrueFunction] = React.useState("");
  const [errorPoint, setErrorPoint] = React.useState("");
  const trueFunctionInputRef = React.useRef<HTMLInputElement>(null);

  const [result, setResult] = React.useState<InterpolationResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const updateRow = (index: number, key: "x" | "y", value: string) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, { x: "", y: "" }]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)));
  };

  const parseRows = () => {
    const parsed = rows.map((row) => ({
      x: Number(row.x),
      y: Number(row.y),
    }));

    if (parsed.length < 2) {
      throw new Error("Debes ingresar al menos 2 puntos.");
    }

    if (parsed.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) {
      throw new Error("Todos los valores x e y deben ser numericos validos.");
    }

    return parsed;
  };

  const fillYFromFunction = () => {
    if (!trueFunction.trim()) {
      setError("Ingresa una funcion para completar los valores y.");
      return;
    }

    try {
      const nextRows = rows.map((row) => {
        const xVal = Number(row.x);
        if (!Number.isFinite(xVal)) {
          throw new Error("Hay valores x invalidos en la tabla.");
        }

        const yVal = evaluate(trueFunction, xVal);
        if (!Number.isFinite(yVal)) {
          throw new Error(`No se pudo evaluar la funcion en x=${xVal}.`);
        }

        return { ...row, y: String(Number(yVal.toFixed(10))) };
      });

      setRows(nextRows);
      setError(null);
      setResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron completar los valores y.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const parsed = parseRows();
      const response = await api.interpolation({
        x_values: parsed.map((p) => p.x),
        y_values: parsed.map((p) => p.y),
        true_function: trueFunction.trim() || undefined,
        error_point: errorPoint.trim() === "" ? undefined : Number(errorPoint),
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

  const graphPoints = result?.points.map((p) => ({ x: p.x, y: p.y, color: "#22c55e" })) || [];
  const xData = result?.points.map((p) => p.x) || [-5, 5];
  const xMin = Math.min(...xData);
  const xMax = Math.max(...xData);
  const viewBox = getAutoViewBox({
    xMin,
    xMax,
    functions: [
      ...(result?.polynomial_plot
        ? [{ expr: result.polynomial_plot, color: "#0ea5e9", label: "P(x)", opacity: 1 }]
        : []),
      ...(showBasisInGraph
        ? (result?.basis_polynomials || []).map((basis, i) => ({
            expr: basis.L_i_expr_plot,
            color: ["#ef4444", "#f59e0b", "#22c55e", "#a855f7", "#06b6d4", "#ec4899"][i % 6],
            label: `L_${basis.index}(x)`,
            opacity: 0.45,
          }))
        : []),
    ],
    points: graphPoints.map((p) => ({ x: p.x, y: p.y })),
    defaultY: [-10, 10],
  });

  return (
    <MethodContainer
      title="Interpolacion de Lagrange"
      description="Construye un polinomio de interpolacion a partir de puntos conocidos."
      colorClass="method-interpolation"
      theoryButton={
        <TheoryModal
          title="Interpolacion de Lagrange"
          description="Interpolacion polinomial usando funciones base."
          formulas={THEORY_FORMULAS}
        />
      }
      error={error}
      success={result ? `Grado del polinomio interpolante: ${result.degree}` : null}
      isLoading={isLoading}
      inputPanel={
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tabla de puntos (x, y)</Label>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>x</TableHead>
                  <TableHead>y</TableHead>
                  <TableHead className="w-[60px]">Accion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Input
                        type="number"
                        step="any"
                        value={row.x}
                        onChange={(e) => updateRow(i, "x", e.target.value)}
                        placeholder="x"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="any"
                        value={row.y}
                        onChange={(e) => updateRow(i, "y", e.target.value)}
                        placeholder="y"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeRow(i)}
                        disabled={rows.length <= 2}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={addRow}>
              <Plus className="size-4" />
              Agregar punto
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="true-function">Funcion real (opcional, para error)</Label>
            <Input
              id="true-function"
              ref={trueFunctionInputRef}
              value={trueFunction}
              onChange={(e) => setTrueFunction(e.target.value)}
              placeholder="ej.: sin(x)"
              className="font-mono"
            />
            <ExpressionKeyboard inputRef={trueFunctionInputRef} setValue={setTrueFunction} />
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Input
                type="number"
                step="any"
                value={errorPoint}
                onChange={(e) => setErrorPoint(e.target.value)}
                placeholder="x para error local (opcional)"
              />
              <Button type="button" variant="outline" onClick={fillYFromFunction}>
                <WandSparkles className="size-4" />
                Completar y=f(x)
              </Button>
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
                Ejecutar Interpolacion
              </>
            )}
          </Button>
        </form>
      }
      graphPanel={
        <div className="space-y-2 p-2">
          <div className="flex items-center gap-2 px-2 pt-1">
            <Switch checked={showBasisInGraph} onCheckedChange={setShowBasisInGraph} id="show-basis" />
            <Label htmlFor="show-basis">Mostrar polinomios base en el grafico</Label>
          </div>
          <MathGraph
            points={graphPoints}
            functions={[
              ...(result?.polynomial_plot
                ? [{ expr: result.polynomial_plot, color: "#0ea5e9", label: "P(x)", opacity: 1 }]
                : []),
              ...(showBasisInGraph
                ? (result?.basis_polynomials || []).map((basis, i) => ({
                    expr: basis.L_i_expr_plot,
                    color: ["#ef4444", "#f59e0b", "#22c55e", "#a855f7", "#06b6d4", "#ec4899"][i % 6],
                    label: `L_${basis.index}(x)`,
                    opacity: 0.45,
                  }))
                : []),
            ]}
            viewBox={viewBox}
            height={330}
          />
        </div>
      }
      resultsPanel={
        result ? (
          <div className="space-y-4">
            <Card className="glass-card">
              <CardContent className="pt-6 text-sm space-y-2">
                <p>
                  <strong>Polinomio:</strong> {result.polynomial}
                </p>
                <div className="text-muted-foreground">
                  <LaTeX math={`P(x)=${result.polynomial_latex}`} />
                </div>
                {result.error_analysis && (
                  <div className="space-y-1 pt-2 border-t border-border/60">
                    <p>
                      <strong>Funcion de referencia:</strong> <LaTeX math={result.error_analysis.true_function_latex} />
                    </p>
                    {result.error_analysis.global_max_error !== undefined && (
                      <p>
                        <strong>Error maximo global:</strong> {result.error_analysis.global_max_error}
                        {" "}(en x={result.error_analysis.global_max_error_at_x})
                      </p>
                    )}
                    {result.error_analysis.local_error && (
                      <p>
                        <strong>Error local en x={result.error_analysis.local_error.x}:</strong>{" "}
                        {result.error_analysis.local_error.abs_error}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="pt-6 space-y-3">
                <h4 className="font-semibold">Polinomios base y terminos ponderados</h4>
                <div className="space-y-3">
                  {result.basis_polynomials.map((basis) => (
                    <div key={basis.index} className="rounded-md border border-border/70 p-3 space-y-1.5">
                      <p className="text-sm">
                        <strong>i={basis.index}</strong> en punto ({basis.point.x}, {basis.point.y})
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <LaTeX math={`L_{${basis.index}}(x) = ${basis.L_i}`} />
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <LaTeX math={`${basis.point.y}\,L_{${basis.index}}(x) = ${basis.term_latex}`} />
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null
      }
    />
  );
}
