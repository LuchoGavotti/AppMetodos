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
import { parseNumericExpression, parseNumericExpressionSafe } from "@/lib/numeric-expression";
import type { APIError, DerivativeResponse } from "@/types/methods";
import { ResultsTable } from "./results-table";
import { Loader2, Play, Plus, Trash2 } from "lucide-react";

const THEORY_FORMULAS = [
  {
    label: "Diferencia Hacia Adelante",
    latex: "f'(x)\\approx\\frac{f(x+h)-f(x)}{h}, f''(x)\\approx\\frac{f(x+2h)-2f(x+h)+f(x)}{h^2}",
  },
  {
    label: "Diferencia Hacia Atras",
    latex: "f'(x)\\approx\\frac{f(x)-f(x-h)}{h}, f''(x)\\approx\\frac{f(x)-2f(x-h)+f(x-2h)}{h^2}",
  },
  {
    label: "Diferencia Central",
    latex: "f'(x)\\approx\\frac{f(x+h)-f(x-h)}{2h}, f''(x)\\approx\\frac{f(x+h)-2f(x)+f(x-h)}{h^2}",
  },
];

export function DerivativeMethod() {
  const [inputMode, setInputMode] = React.useState<"function" | "table">("function");
  const [func, setFunc] = React.useState("sin(x)");
  const [x0, setX0] = React.useState("1");
  const [h, setH] = React.useState("0.01");
  const [method, setMethod] = React.useState<"forward" | "backward" | "central">(
    "central"
  );
  const [rows, setRows] = React.useState<{ x: string; y: string }[]>([
    { x: "0", y: "0" },
    { x: "1", y: "1" },
    { x: "2", y: "4" },
    { x: "3", y: "9" },
  ]);

  const [result, setResult] = React.useState<DerivativeResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const functionInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setResult(null);
    setError(null);
  }, [inputMode]);

  const updateRow = (index: number, key: "x" | "y", value: string) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, { x: "", y: "" }]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => (prev.length <= 3 ? prev : prev.filter((_, i) => i !== index)));
  };

  const parseRows = () => {
    const parsed = rows.map((row, i) => ({
      x: parseNumericExpression(row.x, `x en fila ${i + 1}`),
      y: parseNumericExpression(row.y, `y en fila ${i + 1}`),
    }));

    if (parsed.length < 3) {
      throw new Error("Debes ingresar al menos 3 puntos.");
    }

    const xSet = new Set(parsed.map((p) => p.x));
    if (xSet.size !== parsed.length) {
      throw new Error("No se permiten valores x duplicados.");
    }

    return parsed;
  };

  const handleSubmit = async (e?: React.SyntheticEvent) => {
    e?.preventDefault?.();
    setError(null);
    setIsLoading(true);
    try {
      let response;
      if (inputMode === "function") {
      response = await api.derivative({
        function: func,
        x0: parseNumericExpression(x0, "x0"),
        h: parseNumericExpression(h, "Paso h"),
        method,
      });
    } else {
      const parsed = parseRows();

      response = await api.derivative({
        x_values: parsed.map((p) => p.x),
        y_values: parsed.map((p) => p.y),
      });
    }
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

  const x0Num = parseNumericExpressionSafe(x0);
  const hNum = parseNumericExpressionSafe(h);
  const localLeft = Number.isFinite(x0Num) && Number.isFinite(hNum) ? x0Num - 5 * hNum : -1;
  const localRight = Number.isFinite(x0Num) && Number.isFinite(hNum) ? x0Num + 5 * hNum : 1;
  const minObservedX = Math.min(localLeft, localRight, Number.isFinite(x0Num) ? x0Num : 0);
  const maxObservedX = Math.max(localLeft, localRight, Number.isFinite(x0Num) ? x0Num : 0);
  const centerX = (minObservedX + maxObservedX) / 2;
  const halfSpanX = Math.max(20, (maxObservedX - minObservedX) * 1.5 + 3);
  const xLeft = centerX - halfSpanX;
  const xRight = centerX + halfSpanX;
  const tablePoints = result?.points?.map((pt) => ({ x: pt.x, y: pt.y, color: "#22c55e" })) || [];
  const functionPoints =
    result?.points_used && result?.second_points_used
      ? [...result.points_used, ...result.second_points_used].map((pt) => ({
          x: pt.x,
          y: pt.y,
          color: "#f59e0b",
        }))
      : [];
  const graphPoints = inputMode === "table" ? tablePoints : functionPoints;
  const tableDerivativesCount = result?.derivatives?.length ?? null;
  const isTableResult = tableDerivativesCount !== null;
  const isFunctionResult =
    (result?.mode === "function" || inputMode === "function") &&
    result?.approximation !== undefined;
  const viewBox = getAutoViewBox({
    xMin: inputMode === "table" && tablePoints.length > 0
      ? Math.min(...tablePoints.map((p) => p.x))
      : xLeft,
    xMax: inputMode === "table" && tablePoints.length > 0
      ? Math.max(...tablePoints.map((p) => p.x))
      : xRight,
    functions: inputMode === "function" && func ? [func] : [],
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
      success={
        isTableResult
          ? `Derivadas calculadas para ${tableDerivativesCount ?? 0} puntos`
          : isFunctionResult
            ? `f'(${result.x0}) ≈ ${result.approximation}; f''(${result.x0}) ≈ ${result.second_approximation}`
            : null
      }
      isLoading={isLoading}
      inputPanel={
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Modo de ingreso</Label>
            <Select
              value={inputMode}
              onValueChange={(value) => setInputMode(value as "function" | "table")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="function">Funcion</SelectItem>
                <SelectItem value="table">Tabla</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {inputMode === "function" && (
            <div>
            <div className="space-y-2">
              <Label htmlFor="derivative-function">Funcion f(x)</Label>
              <Input
                id="derivative-function"
                ref={functionInputRef}
                value={func}
              onChange={(e) => setFunc(e.target.value)}
              className="font-mono"
              placeholder="ej.: sin(x)"
              disabled={inputMode !== "function"}
            />
            <ExpressionKeyboard inputRef={functionInputRef} setValue={setFunc} />
          </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="derivative-x0">x₀</Label>
                  <Input
                    id="derivative-x0"
                    type="text"
                    value={x0}
                    onChange={(e) => setX0(e.target.value)}
                    disabled={inputMode !== "function"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="derivative-h">Paso h</Label>
                  <Input
                    id="derivative-h"
                    type="text"
                    value={h}
                    onChange={(e) => setH(e.target.value)}
                    disabled={inputMode !== "function"}
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
                  disabled={inputMode !== "function"}
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
            </div>)}
          {inputMode === "table" && (
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
                          type="text"
                          value={row.x}
                          onChange={(e) => updateRow(i, "x", e.target.value)}
                          placeholder="x"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
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
                          disabled={rows.length <= 3}
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
          )}
          
          <Button type="button" onClick={handleSubmit} className="w-full" disabled={isLoading}>
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
          functions={inputMode === "function" && func ? [{ expr: func, color: "#0ea5e9" }] : []}
          points={graphPoints}
          viewBox={viewBox}
          height={360}
        />
      }
      resultsPanel={
        result && isTableResult ? (
          <ResultsTable
            title="Derivadas por punto"
            columns={[
              { key: "x", label: "x" },
              { key: "y", label: "y" },
              { key: "first_derivative", label: "f'(x)" },
              { key: "second_derivative", label: "f''(x)" },
              { key: "method", label: "Metodo" },
            ]}
            data={result.derivatives}
            highlightLast={false}
            maxHeight={360}
          />
        ) : result && isFunctionResult ? (
          <Card className="glass-card">
            <CardContent className="pt-6 text-sm space-y-2">
              <p>
                <strong>Aproximacion:</strong> {result.approximation}
              </p>
              <p>
                <strong>Segunda derivada:</strong> {result.second_approximation}
              </p>
              {result.exact_derivative !== undefined && (
                <p>
                    <strong>Derivada exacta:</strong> {result.exact_derivative}
                </p>
              )}
              {result.exact_second_derivative !== undefined && (
                <p>
                    <strong>Segunda derivada exacta:</strong> {result.exact_second_derivative}
                </p>
              )}
              {result.error !== undefined && (
                <p>
                    <strong>Error absoluto:</strong> {result.error}
                </p>
              )}
              {result.second_error !== undefined && (
                <p>
                    <strong>Error absoluto (segunda):</strong> {result.second_error}
                </p>
              )}
              {result.f_expr_latex && (
                <p className="text-muted-foreground">
                  <LaTeX math={`f(x) = ${result.f_expr_latex}`} />
                </p>
              )}
              {result.df_expr_latex && (
                <p className="text-muted-foreground">
                  <LaTeX math={`f'(x) = ${result.df_expr_latex}`} />
                </p>
              )}
              {result.d2f_expr_latex && (
                <p className="text-muted-foreground">
                  <LaTeX math={`f''(x) = ${result.d2f_expr_latex}`} />
                </p>
              )}
              <p className="text-muted-foreground">
                <LaTeX math={result.formula_latex} />
              </p>
              <p className="text-muted-foreground">
                <LaTeX math={result.second_formula_latex} />
              </p>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Puntos usados
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <p className="font-medium">Primera derivada</p>
                    {result.points_used?.map((pt, idx) => (
                      <p key={`d1-${idx}`}>({pt.x}, {pt.y})</p>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Segunda derivada</p>
                    {result.second_points_used?.map((pt, idx) => (
                      <p key={`d2-${idx}`}>({pt.x}, {pt.y})</p>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null
      }
    />
  );
}
