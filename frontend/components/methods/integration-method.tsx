"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { ResultsTable } from "./results-table";
import { TheoryModal, LaTeX } from "./theory-modal";
import { ExpressionKeyboard } from "./expression-keyboard";
import { api } from "@/lib/api";
import { getAutoViewBox } from "@/lib/graph-range";
import { parseIntegerExpression, parseNumericExpression, parseNumericExpressionSafe } from "@/lib/numeric-expression";
import type { APIError, IntegrationResponse } from "@/types/methods";
import { Loader2, Play } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type IntegrationMethodId =
  | "left_rectangle"
  | "right_rectangle"
  | "midpoint"
  | "trapezoidal"
  | "simpson_1_3"
  | "simpson_3_8";

const THEORY_FORMULAS = [
  {
    label: "Regla del Rectangul Medio",
    latex:
      "\\int_a^b f(x)\\,dx \\approx \\sum_{i=0}^{n-1} f(a + (i + \\frac{1}{2})h)",
    description: "Para rectangulo izquierdo usar f(a + i*h), para derecho usar f(a + (i+1)*h)",
  },
  {
    label: "Regla del Trapecio",
    latex:
      "\\int_a^b f(x)\\,dx \\approx \\frac{h}{2}\\left[f(a)+2\\sum_{i=1}^{n-1}f(a+ih)+f(b)\\right]",
  },
  {
    latex:
      "E_t = -\\frac{(b-a)^3}{12n^2} f^2(\\xi)",
  },
  {
    label: "Regla de Simpson 1/3",
    latex:
      "\\int_a^b f(x)\\,dx \\approx \\frac{h}{3}\\left[f(a)+4\\sum_{impares}^{}f(a+ih)+2\\sum_{pares}^{}f(a+ih)+f(b)\\right]",
  },
  {
    latex:
      "E_t = -\\frac{(b-a)^5}{180n^4} f^4(\\xi)",
  },
  {
    label: "Regla de Simpson 3/8",
    latex:
      "\\int_a^b f(x)\\,dx \\approx \\frac{3h}{8}\\left[f(a)+3\\sum_{impares}^{n-2}f(x_i)+3\\sum_{pares}^{n-1}f(x_i)+2\\sum_{\\dot{3}}^{n-3}f(x_i)+f(b)\\right]",
  },
  {
    latex:
      "E_t = -\\frac{(b-a)^5}{6480} f^4(\\xi)",
  },
];

function parseNumberList(value: string): number[] {
  return value
    .split(",")
    .map((part, index) => parseNumericExpression(part.trim(), `Valor ${index + 1}`));
}

export function IntegrationMethod() {
  const [inputMode, setInputMode] = React.useState<"function" | "table">("function");
  const [func, setFunc] = React.useState("sin(x)");
  const [a, setA] = React.useState("0");
  const [b, setB] = React.useState("3.1415926535");
  const [n, setN] = React.useState("12");
  const [method, setMethod] = React.useState<IntegrationMethodId>("trapezoidal");
  const [xValues, setXValues] = React.useState("0, 1, 2, 3, 4");
  const [yValues, setYValues] = React.useState("0, 1, 4, 9, 16");

  const [result, setResult] = React.useState<IntegrationResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const functionInputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const nValue = parseIntegerExpression(n, "Subintervalos (n)", 1);
      const aValue = parseNumericExpression(a, "a");
      const bValue = parseNumericExpression(b, "b");

      const payload =
        inputMode === "function"
          ? {
              function: func,
              a: aValue,
              b: bValue,
              n: nValue,
              method,
            }
          : {
              a: aValue,
              b: bValue,
              n: nValue,
              method,
              x_values: parseNumberList(xValues),
              y_values: parseNumberList(yValues),
            };

      const response = await api.integration(payload);
      setResult(response);
    } catch (err) {
      const apiError = err as APIError;
      if (typeof apiError.detail === "string") {
        setError(apiError.detail);
      } else if (apiError.detail?.message) {
        setError(`${apiError.detail.error}: ${apiError.detail.message}`);
      } else {
        setError("Ocurrio un error inesperado");
      }
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const rectangles =
    result?.shapes
      .filter((shape) => shape.type === "rectangle" && shape.height !== undefined)
      .map((shape) => ({
        x1: shape.x1,
        x2: shape.x2,
        height: shape.height as number,
        color: "#0ea5e9",
      })) || [];

  const trapezoids =
    result?.shapes
      .filter(
        (shape) =>
          shape.type === "trapezoid" &&
          shape.y1 !== undefined &&
          shape.y2 !== undefined
      )
      .map((shape) => ({
        x1: shape.x1,
        x2: shape.x2,
        y1: shape.y1 as number,
        y2: shape.y2 as number,
        color: "#22c55e",
      })) || [];

  const graphPoints =
    result?.values_table.map((p) => ({ x: p.x, y: p.y, color: "#8b5cf6" })) || [];

  const valuesColumns = [
    { key: "x", label: "x" },
    { key: "y", label: "f(x)" },
  ];

  const aNum = parseNumericExpressionSafe(a);
  const bNum = parseNumericExpressionSafe(b);
  const minX = Number.isFinite(aNum) ? aNum : -5;
  const maxX = Number.isFinite(bNum) ? bNum : 5;
  const overlayPoints = [
    ...graphPoints.map((p) => ({ x: p.x, y: p.y })),
    ...rectangles.flatMap((r) => [
      { x: r.x1, y: 0 },
      { x: r.x1, y: r.height },
      { x: r.x2, y: r.height },
      { x: r.x2, y: 0 },
    ]),
    ...trapezoids.flatMap((t) => [
      { x: t.x1, y: 0 },
      { x: t.x1, y: t.y1 },
      { x: t.x2, y: t.y2 },
      { x: t.x2, y: 0 },
    ]),
  ];
  const viewBox = getAutoViewBox({
    xMin: minX,
    xMax: maxX,
    functions: inputMode === "function" && func ? [func] : [],
    points: overlayPoints,
    defaultY: [-10, 10],
  });

  return (
    <MethodContainer
      title="Integracion Numerica"
      description="Aproxima integrales definidas con rectangulos, trapecios y reglas de Simpson."
      colorClass="method-integration"
      theoryButton={
        <TheoryModal
          title="Integracion Numerica"
          description="Reglas de cuadratura para aproximar el area bajo una curva."
          formulas={THEORY_FORMULAS}
        />
      }
      error={error}
      success={
        result
          ? `Integral ≈ ${result.result} usando ${method.replaceAll("_", " ")}`
          : null
      }
      isLoading={isLoading}
      inputPanel={
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Modo de entrada</Label>
            <Select
              value={inputMode}
              onValueChange={(value) => setInputMode(value as "function" | "table")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="function">Funcion f(x)</SelectItem>
                <SelectItem value="table">Valores tabulados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {inputMode === "function" ? (
            <div className="space-y-2">
              <Label htmlFor="integration-function">Funcion f(x)</Label>
              <Input
                id="integration-function"
                ref={functionInputRef}
                value={func}
                onChange={(e) => setFunc(e.target.value)}
                className="font-mono"
                placeholder="ej.: sin(x) / x"
              />
              <ExpressionKeyboard inputRef={functionInputRef} setValue={setFunc} />
              {result?.f_expr_latex && (
                <p className="text-xs text-muted-foreground">
                  <LaTeX math={`f(x)=${result.f_expr_latex}`} />
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="x-values">valores x (separados por coma)</Label>
                <Input
                  id="x-values"
                  value={xValues}
                  onChange={(e) => setXValues(e.target.value)}
                  placeholder="0, 1, 2, 3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="y-values">valores y (separados por coma)</Label>
                <Input
                  id="y-values"
                  value={yValues}
                  onChange={(e) => setYValues(e.target.value)}
                  placeholder="0, 1, 4, 9"
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="integration-a">a</Label>
              <Input
                id="integration-a"
                type="text"
                value={a}
                onChange={(e) => setA(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="integration-b">b</Label>
              <Input
                id="integration-b"
                type="text"
                value={b}
                onChange={(e) => setB(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="integration-n">Subintervalos (n)</Label>
              <Input
                id="integration-n"
                type="text"
                value={n}
                onChange={(e) => setN(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Metodo</Label>
              <Select
                value={method}
                onValueChange={(value) => setMethod(value as IntegrationMethodId)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left_rectangle">Rectangulos Izquierdos</SelectItem>
                  <SelectItem value="right_rectangle">Rectangulos Derechos</SelectItem>
                  <SelectItem value="midpoint">Punto Medio</SelectItem>
                  <SelectItem value="trapezoidal">Trapecio</SelectItem>
                  <SelectItem value="simpson_1_3">Simpson 1/3</SelectItem>
                  <SelectItem value="simpson_3_8">Simpson 3/8</SelectItem>
                </SelectContent>
              </Select>
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
                Ejecutar Integracion
              </>
            )}
          </Button>
        </form>
      }
      graphPanel={
        <MathGraph
          functions={inputMode === "function" && func ? [{ expr: func, color: "#f59e0b" }] : []}
          points={graphPoints}
          rectangles={rectangles}
          trapezoids={trapezoids}
          viewBox={viewBox}
          height={360}
        />
      }
      resultsPanel={
        result && (
          <div className="space-y-4">
            <Card className="glass-card">
              <CardContent className="pt-6 text-sm space-y-2">
                <p>
                  <strong>Resultado:</strong> {result.result}
                </p>
                <p>
                  <strong>h:</strong> {result.h} | <strong>n:</strong> {result.n}
                </p>
                {result.exact_integral !== undefined && (
                  <p>
                    <strong>Integral exacta:</strong> {result.exact_integral}
                  </p>
                )}
                {result.error !== undefined && (
                  <p>
                    <strong>Error absoluto:</strong> {result.error}
                  </p>
                )}
                {result.truncation_error !== undefined && (
                  <div className="flex flex-wrap items-center gap-2">
                    <p>
                      <strong>Cota de error de truncamiento:</strong> {result.truncation_error}
                    </p>
                    {result.truncation_error_info && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-6 w-6 rounded-full text-xs"
                            aria-label="Ver detalle de la cota"
                          >
                            +
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-none w-[min(96vw,80rem)] min-w-[min(56rem,96vw)] max-h-[85vh] overflow-auto">
                          <DialogHeader>
                            <DialogTitle>Detalle de la cota de truncamiento</DialogTitle>
                            <DialogDescription>
                              Derivadas utilizadas y puntos evaluados para el maximo.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-6 pt-2">
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Derivadas utilizadas</p>
                              <div className="space-y-2 text-sm text-muted-foreground">
                                <LaTeX
                                  block
                                  math={`f^{(${result.truncation_error_info.derivative_order})}(x) = ${result.truncation_error_info.derivative_latex}`}
                                />
                                {result.truncation_error_info.critical_derivative_latex && (
                                  <LaTeX
                                    block
                                    math={`f^{(${result.truncation_error_info.critical_derivative_order})}(x) = ${result.truncation_error_info.critical_derivative_latex}`}
                                  />
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <p className="text-sm font-medium">
                                Comparativa de |f^(k)(x)|
                              </p>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>x</TableHead>
                                    <TableHead>Origen</TableHead>
                                    <TableHead>|f^(k)(x)|</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {result.truncation_error_info.evaluation_points.map((pt, i) => (
                                    <TableRow key={`te-eval-${i}`}>
                                      <TableCell>{pt.x}</TableCell>
                                      <TableCell>{pt.source}</TableCell>
                                      <TableCell>{pt.abs_value}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            <ResultsTable
              title="Valores Muestreados"
              columns={valuesColumns}
              data={result.values_table}
              highlightLast={false}
            />
          </div>
        )
      }
    />
  );
}
