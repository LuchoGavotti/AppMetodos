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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MethodContainer } from "./method-container";
import { MathGraph } from "@/components/graph/math-graph";
import { ResultsTable } from "./results-table";
import { TheoryModal, LaTeX } from "./theory-modal";
import { ExpressionKeyboard } from "./expression-keyboard";
import { api } from "@/lib/api";
import { getAutoViewBox } from "@/lib/graph-range";
import { evaluate } from "@/lib/math-parser";
import type {
  APIError,
  DifferentialEquationIteration,
  DifferentialEquationResponse,
} from "@/types/methods";
import { CircleHelp, Loader2, Play } from "lucide-react";

const THEORY_FORMULAS = [
  {
    label: "Euler",
    latex: "y_{n+1}=y_n+h\,f(x_n,y_n)",
  },
  {
    label: "Euler Mejorado (Heun)",
    latex:
      "k_1=f(x_n,y_n),\quad k_2=f(x_n+h,y_n+h\,k_1),\\ y_{n+1}=y_n+\frac{h}{2}(k_1+k_2)",
  },
  {
    label: "Runge-Kutta de Orden 4",
    latex:
      "k_1=f(x_n,y_n),\;k_2=f(x_n+\tfrac{h}{2},y_n+\tfrac{h}{2}k_1),\\k_3=f(x_n+\tfrac{h}{2},y_n+\tfrac{h}{2}k_2),\;k_4=f(x_n+h,y_n+h\,k_3),\\y_{n+1}=y_n+\tfrac{h}{6}(k_1+2k_2+2k_3+k_4)",
  },
];

function methodLabel(method: "euler" | "improved_euler" | "runge_kutta"): string {
  if (method === "euler") return "Euler";
  if (method === "improved_euler") return "Euler Mejorado";
  return "Runge-Kutta 4";
}

function iterationColumns(method: "euler" | "improved_euler" | "runge_kutta") {
  const base = [
    { key: "iteration", label: "Iter" },
    { key: "x_i", label: "x_i" },
    { key: "y_i", label: "y_i" },
    { key: "x_next", label: "x_{i+1}" },
    { key: "y_next", label: "y_{i+1}" },
    { key: "slope", label: "Pendiente" },
    { key: "k1", label: "k1" },
  ];

  if (method === "improved_euler") {
    return [...base, { key: "k2", label: "k2" }];
  }

  if (method === "runge_kutta") {
    return [
      ...base,
      { key: "k2", label: "k2" },
      { key: "k3", label: "k3" },
      { key: "k4", label: "k4" },
    ];
  }

  return base;
}

type NumericFieldId = "x0" | "y0" | "xMin" | "xMax" | "h";

function parseNumericExpression(value: string, label: string): number {
  const raw = value.trim();
  if (!raw) {
    throw new Error(`${label} no puede estar vacio`);
  }

  if (/\b[xXyYzZ]\b/.test(raw)) {
    throw new Error(`${label} solo admite constantes y operaciones numericas`);
  }

  const parsed = evaluate(raw, 0);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} no es una expresion numerica valida`);
  }

  return parsed;
}

function parseNumericExpressionSafe(value: string): number {
  const parsed = evaluate(value.trim(), 0);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function appendMathConstant(current: string, constantName: "e" | "pi"): string {
  const trimmed = current.trimEnd();
  if (!trimmed) return constantName;

  const lastChar = trimmed[trimmed.length - 1];
  if (/[0-9a-zA-Z)]/.test(lastChar)) {
    return `${trimmed}*${constantName}`;
  }

  return `${trimmed}${constantName}`;
}

export function DifferentialEquationMethod() {
  const [equation, setEquation] = React.useState("x+y");
  const [x0, setX0] = React.useState("0");
  const [y0, setY0] = React.useState("1");
  const [xMin, setXMin] = React.useState("0");
  const [xMax, setXMax] = React.useState("2");
  const [h, setH] = React.useState("0.2");
  const [method, setMethod] = React.useState<"euler" | "improved_euler" | "runge_kutta">(
    "runge_kutta"
  );

  const [result, setResult] = React.useState<DifferentialEquationResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [activeNumericField, setActiveNumericField] = React.useState<NumericFieldId>("x0");
  const functionInputRef = React.useRef<HTMLInputElement>(null);

  const applyConstantToField = React.useCallback((constantName: "e" | "pi") => {
    const updater = (prev: string) => appendMathConstant(prev, constantName);

    if (activeNumericField === "x0") setX0(updater);
    else if (activeNumericField === "y0") setY0(updater);
    else if (activeNumericField === "xMin") setXMin(updater);
    else if (activeNumericField === "xMax") setXMax(updater);
    else setH(updater);
  }, [activeNumericField]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const parsedX0 = parseNumericExpression(x0, "x inicial");
      const parsedY0 = parseNumericExpression(y0, "y inicial");
      const parsedXMin = parseNumericExpression(xMin, "x minimo");
      const parsedXMax = parseNumericExpression(xMax, "x maximo");
      const parsedH = parseNumericExpression(h, "paso h");

      const response = await api.differentialEquation({
        equation,
        x0: parsedX0,
        y0: parsedY0,
        x_min: parsedXMin,
        x_max: parsedXMax,
        h: parsedH,
        method,
      });
      setResult(response);
    } catch (err) {
      if (err instanceof Error && !("detail" in (err as object))) {
        setError(err.message);
      } else {
        const apiError = err as APIError;
        if (typeof apiError.detail === "string") {
          setError(apiError.detail);
        } else if (apiError.detail?.message) {
          setError(`${apiError.detail.error}: ${apiError.detail.message}`);
        } else {
          setError("Ocurrio un error inesperado");
        }
      }
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const graphPoints =
    result?.points.map((p) => ({ x: p.x, y: p.y, color: "#2563eb" })) || [];

  const graphSegments = result?.points
    ? result.points.slice(1).map((p, i) => ({
        x1: result.points[i].x,
        y1: result.points[i].y,
        x2: p.x,
        y2: p.y,
        color: "#2563eb",
      }))
    : [];

  const xMinNum = parseNumericExpressionSafe(xMin);
  const xMaxNum = parseNumericExpressionSafe(xMax);
  const viewBox = getAutoViewBox({
    xMin: Number.isFinite(xMinNum) ? xMinNum : -5,
    xMax: Number.isFinite(xMaxNum) ? xMaxNum : 5,
    points: graphPoints.map((p) => ({ x: p.x, y: p.y })),
    defaultY: [-5, 5],
  });

  const tableData: Record<string, number | string>[] =
    result?.iterations.map((it: DifferentialEquationIteration) => ({
      iteration: it.iteration,
      x_i: it.x_i,
      y_i: it.y_i,
      x_next: it.x_next,
      y_next: it.y_next,
      slope: it.slope,
      k1: it.k1,
      k2: it.k2 ?? "-",
      k3: it.k3 ?? "-",
      k4: it.k4 ?? "-",
    })) || [];

  return (
    <MethodContainer
      title="Ecuaciones Diferenciales"
      description="Resuelve y' = f(x,y) con Euler, Euler Mejorado o Runge-Kutta de orden 4."
      colorClass="method-differential-equation"
      theoryButton={
        <TheoryModal
          title="Metodos para EDO"
          description="Aproximaciones de valor inicial para y' = f(x, y)."
          formulas={THEORY_FORMULAS}
        />
      }
      error={error}
      success={
        result
          ? `Calculado con ${methodLabel(result.method)} en ${result.points.length} puntos`
          : null
      }
      isLoading={isLoading}
      inputPanel={
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ode-equation">Ecuacion y&apos; = f(x, y)</Label>
            <Input
              id="ode-equation"
              ref={functionInputRef}
              value={equation}
              onChange={(e) => setEquation(e.target.value)}
              className="font-mono"
              placeholder="ej.: x + y"
            />
            <ExpressionKeyboard inputRef={functionInputRef} setValue={setEquation} showY />
            {result?.equation_latex && (
              <p className="text-xs text-muted-foreground">
                <LaTeX math={`f(x,y)=${result.equation_latex}`} />
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ode-x0">x inicial</Label>
              <Input
                id="ode-x0"
                type="text"
                value={x0}
                onChange={(e) => setX0(e.target.value)}
                onFocus={() => setActiveNumericField("x0")}
                placeholder="ej.: pi/2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ode-y0">y inicial</Label>
              <Input
                id="ode-y0"
                type="text"
                value={y0}
                onChange={(e) => setY0(e.target.value)}
                onFocus={() => setActiveNumericField("y0")}
                placeholder="ej.: e"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ode-x-min">x minimo</Label>
              <Input
                id="ode-x-min"
                type="text"
                value={xMin}
                onChange={(e) => setXMin(e.target.value)}
                onFocus={() => setActiveNumericField("xMin")}
                placeholder="ej.: -pi"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ode-x-max">x maximo</Label>
              <Input
                id="ode-x-max"
                type="text"
                value={xMax}
                onChange={(e) => setXMax(e.target.value)}
                onFocus={() => setActiveNumericField("xMax")}
                placeholder="ej.: 2*pi"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ode-h">Paso h</Label>
              <Input
                id="ode-h"
                type="text"
                value={h}
                onChange={(e) => setH(e.target.value)}
                onFocus={() => setActiveNumericField("h")}
                placeholder="ej.: 1/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Metodo</Label>
              <Select
                value={method}
                onValueChange={(value) =>
                  setMethod(value as "euler" | "improved_euler" | "runge_kutta")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="euler">Euler</SelectItem>
                  <SelectItem value="improved_euler">Euler Mejorado (Heun)</SelectItem>
                  <SelectItem value="runge_kutta">Runge-Kutta 4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Constantes rapidas (campo activo)</Label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => applyConstantToField("e")}>
                e
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => applyConstantToField("pi")}>
                pi
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
                Ejecutar Metodo
              </>
            )}
          </Button>
        </form>
      }
      graphPanel={
        <MathGraph
          points={graphPoints}
          segments={graphSegments}
          viewBox={viewBox}
          height={360}
        />
      }
      resultsPanel={
        result ? (
          <div className="space-y-4">
            <Card className="glass-card">
              <CardContent className="pt-6 text-sm space-y-2">
                <p>
                  <strong>Metodo:</strong> {methodLabel(result.method)}
                </p>
                <p>
                  <strong>Intervalo:</strong> [{result.x_min}, {result.x_max}] | <strong>h:</strong> {result.h}
                </p>
                <p>
                  <strong>Punto inicial:</strong> ({result.x0}, {result.y0})
                </p>
                <p>
                  <strong>Puntos calculados:</strong> {result.points.length}
                </p>
                {result.analytic_solution?.available ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <strong>Solucion analitica:</strong>
                      <span className="text-muted-foreground">
                        <LaTeX math={`y(x)=${result.analytic_solution.solution_expr_latex}`} />
                      </span>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            aria-label="Ver paso a paso de la resolucion"
                          >
                            <CircleHelp className="size-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
                          <DialogHeader>
                            <DialogTitle>Resolucion analitica</DialogTitle>
                            <DialogDescription>
                              Paso a paso resumido de la solucion simbolica de la EDO.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 pt-2">
                            {result.analytic_solution.hint && (
                              <p className="text-sm text-muted-foreground">
                                <strong>Metodo detectado:</strong> {result.analytic_solution.hint}
                              </p>
                            )}
                            {result.analytic_solution.steps.map((step, idx) => (
                              <div key={`${step.title}-${idx}`} className="space-y-1">
                                <p className="font-medium text-sm">{step.title}</p>
                                <p className="text-sm text-muted-foreground">{step.description}</p>
                                {step.latex && (
                                  <div className="rounded-md bg-muted/50 p-2 overflow-x-auto text-sm">
                                    <LaTeX math={step.latex} block />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    <strong>Solucion analitica:</strong> no disponible para esta ecuacion.
                  </p>
                )}
              </CardContent>
            </Card>
            <ResultsTable
              title="Iteraciones"
              columns={iterationColumns(result.method)}
              data={tableData}
              highlightLast={false}
            />
          </div>
        ) : null
      }
    />
  );
}
