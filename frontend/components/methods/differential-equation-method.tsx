"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  DifferentialEquationResponse,
} from "@/types/methods";
import { CircleHelp, Loader2, Play } from "lucide-react";

const THEORY_FORMULAS = [
  {
    label: "Euler",
    latex: "y_{n+1}=y_n+h\\,f(x_n,y_n)",
    description: "En cada paso se evalua la pendiente en el punto conocido (x_n,y_n) y se avanza una distancia h siguiendo la recta tangente local.",
  },
  {
    label: "Euler Mejorado (Heun)",
    latex: "k_1=f(x_n,y_n),\\quad k_2=f(x_n+h,\\,y_n+h\\,k_1),\\\\ y_{n+1}=y_n+\\frac{h}{2}(k_1+k_2)",
    description: "Primero hace una prediccion tipo Euler. Luego calcula una segunda pendiente en el extremo del paso y corrige usando el promedio de ambas pendientes.",
  },
  {
    label: "Runge-Kutta de Orden 4",
    latex: "\\text{Paso 1: Calcular } y_{n+1}\\\\ y_{n+1}=y_n+\\frac{h}{6}(k_1+2k_2+2k_3+k_4)\\\\[8pt]\\text{Paso 2: Calcular las pendientes}\\\\ k_1=f(x_n,y_n)\\\\ k_2=f\\left(x_n+\\frac{1}{2}h,\\,y_n+\\frac{1}{2}k_1h\\right)\\\\ k_3=f\\left(x_n+\\frac{1}{2}h,\\,y_n+\\frac{1}{2}k_2h\\right)\\\\ k_4=f\\left(x_n+h,\\,y_n+k_3h\\right)",
    description: "Primero se calculan las cuatro pendientes intermedias y despues se reemplazan en la formula final para obtener y_{n+1}, exactamente en el orden mostrado en la diapositiva.",
  },
  {
    label: "Comparacion entre metodos",
    latex: "Euler \\quad vs \\quad Heun \\quad vs \\quad RK4 \\quad vs \\quad y(x)",
    description: "Cada metodo genera una sucesion de puntos y tramos. Al activar varias perillas, la app superpone todas las trayectorias y, si existe solucion analitica explicita, tambien la curva real para comparar el error visualmente.",
  },
  {
    label: "EDO separable",
    latex: "\\frac{dy}{dx}=g(x)h(y)\\quad \\Rightarrow \\quad \\frac{dy}{h(y)}=g(x)\\,dx",
    description: "Si la EDO puede escribirse como producto de una funcion de x y otra de y, se separan variables, se integran ambos lados y luego se despeja y cuando sea posible.",
  },
  {
    label: "EDO lineal",
    latex: "y'+P(x)y=Q(x)",
    description: "Primero se lleva la ecuacion a la forma lineal estandar. A partir de ahi se identifican P(x) y Q(x).",
  },
  {
    label: "Identificar P(x)",
    latex: "P(x)=\\text{coeficiente de } y \\text{ en } y'+P(x)y=Q(x)",
    description: "Una vez escrita la ecuacion en forma lineal, se toma como P(x) al coeficiente que acompaña a y.",
  },
  {
    label: "Identificar Q(x)",
    latex: "Q(x)=\\text{termino independiente en } y'+P(x)y=Q(x)",
    description: "Q(x) es el termino que queda del lado derecho cuando la ecuacion ya esta en la forma lineal estandar.",
  },
  {
    label: "Plantear u(x)",
    latex: "u(x)=e^{\\int P(x)\\,dx}",
    description: "Luego se plantea el factor integrante u(x) como e elevado a la integral de P(x).",
  },
  {
    label: "Plantear y(x)",
    latex: "y(x)=\\frac{1}{u(x)}\\left(\\int u(x)Q(x)\\,dx + C\\right)",
    description: "Con u(x) ya calculada, se plantea la expresion de y(x) usando la formula de la ecuacion lineal.",
  },
  {
    label: "Como leer la tabla",
    latex: "(x_i,y_i)\\to(x_{i+1},y_{i+1})",
    description: "La tabla muestra cada paso numerico: punto de partida, pendiente(s) calculada(s), avance h y nuevo valor aproximado. En RK4 aparecen k1, k2, k3 y k4; en Heun aparecen k1 y k2.",
  },
  {
    label: "Condicion inicial",
    latex: "y(x_0)=y_0",
    description: "La condicion inicial fija el punto desde el cual arrancan todos los metodos numericos y tambien permite obtener la solucion analitica particular cuando la EDO admite resolucion cerrada.",
  },
];

type MethodId = "euler" | "improved_euler" | "runge_kutta";

const METHOD_OPTIONS: Array<{ id: MethodId; label: string; color: string }> = [
  { id: "euler", label: "Euler", color: "#0ea5e9" },
  { id: "improved_euler", label: "Euler Mejorado", color: "#f59e0b" },
  { id: "runge_kutta", label: "Runge-Kutta 4", color: "#22c55e" },
];

function methodLabel(method: MethodId): string {
  if (method === "euler") return "Euler";
  if (method === "improved_euler") return "Euler Mejorado";
  return "Runge-Kutta 4";
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
  const [selectedMethods, setSelectedMethods] = React.useState<Record<MethodId, boolean>>({
    euler: false,
    improved_euler: false,
    runge_kutta: true,
  });
  const [showSeries, setShowSeries] = React.useState<Record<MethodId, boolean>>({
    euler: false,
    improved_euler: false,
    runge_kutta: true,
  });
  const [showAnalytic, setShowAnalytic] = React.useState(true);

  const [resultsByMethod, setResultsByMethod] = React.useState<
    Partial<Record<MethodId, DifferentialEquationResponse>> | null
  >(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [activeNumericField, setActiveNumericField] = React.useState<NumericFieldId>("x0");
  const functionInputRef = React.useRef<HTMLInputElement>(null);

  const selectedMethodIds = React.useMemo(
    () => METHOD_OPTIONS.filter((opt) => selectedMethods[opt.id]).map((opt) => opt.id),
    [selectedMethods]
  );

  const primaryResult = React.useMemo(() => {
    if (!resultsByMethod || selectedMethodIds.length === 0) return null;
    return resultsByMethod[selectedMethodIds[0]] ?? null;
  }, [resultsByMethod, selectedMethodIds]);

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

      if (selectedMethodIds.length === 0) {
        setError("Selecciona al menos un metodo para resolver la EDO.");
        setIsLoading(false);
        return;
      }

      const responses = await Promise.all(
        selectedMethodIds.map((selected) =>
          api.differentialEquation({
            equation,
            x0: parsedX0,
            y0: parsedY0,
            x_min: parsedXMin,
            x_max: parsedXMax,
            h: parsedH,
            method: selected,
          })
        )
      );

      const nextResults = responses.reduce(
        (acc, response) => {
          acc[response.method as MethodId] = response;
          return acc;
        },
        {} as Partial<Record<MethodId, DifferentialEquationResponse>>
      );

      setResultsByMethod(nextResults);
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
      setResultsByMethod(null);
    } finally {
      setIsLoading(false);
    }
  };

  const graphPoints = METHOD_OPTIONS.flatMap((opt) => {
    if (!showSeries[opt.id]) return [];
    const points = resultsByMethod?.[opt.id]?.points ?? [];
    return points.map((p) => ({ x: p.x, y: p.y, color: opt.color }));
  });

  const graphSegments = METHOD_OPTIONS.flatMap((opt) => {
    if (!showSeries[opt.id]) return [];
    const points = resultsByMethod?.[opt.id]?.points ?? [];
    return points.slice(1).map((p, i) => ({
      x1: points[i].x,
      y1: points[i].y,
      x2: p.x,
      y2: p.y,
      color: opt.color,
    }));
  });

  const xMinNum = parseNumericExpressionSafe(xMin);
  const xMaxNum = parseNumericExpressionSafe(xMax);
  const viewBox = getAutoViewBox({
    xMin: Number.isFinite(xMinNum) ? xMinNum : -5,
    xMax: Number.isFinite(xMaxNum) ? xMaxNum : 5,
    functions:
      showAnalytic && primaryResult?.analytic_solution?.solution_expr_plot
        ? [primaryResult.analytic_solution.solution_expr_plot]
        : [],
    points: graphPoints.map((p) => ({ x: p.x, y: p.y })),
    defaultY: [-5, 5],
  });

  const pointColumns = [
    { key: "x", label: "x" },
    { key: "y", label: "y" },
    { key: "slope", label: "Pendiente" },
    { key: "y_real", label: "y real" },
    { key: "local_error", label: "Error local" },
    { key: "k1", label: "k1" },
    { key: "k2", label: "k2" },
    { key: "k3", label: "k3" },
    { key: "k4", label: "k4" },
  ];

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
        primaryResult
          ? `Calculado con ${selectedMethodIds.map(methodLabel).join(", ")} en ${primaryResult.points.length} puntos`
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
            {primaryResult?.equation_latex && (
              <p className="text-xs text-muted-foreground">
                <LaTeX math={`f(x,y)=${primaryResult.equation_latex}`} />
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
              <Label>Metodos</Label>
              <div className="space-y-2">
                {METHOD_OPTIONS.map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={selectedMethods[opt.id]}
                      onCheckedChange={(checked) => {
                        setSelectedMethods((prev) => ({ ...prev, [opt.id]: checked }));
                        setShowSeries((prev) => ({ ...prev, [opt.id]: checked }));
                        setResultsByMethod(null);
                      }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
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
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3 px-2">
            {METHOD_OPTIONS.map((opt) => (
              <label key={`show-${opt.id}`} className="flex items-center gap-2 text-sm">
                <Switch
                  checked={showSeries[opt.id]}
                  onCheckedChange={(checked) =>
                    setShowSeries((prev) => ({ ...prev, [opt.id]: checked }))
                  }
                  disabled={!resultsByMethod?.[opt.id]}
                />
                {opt.label}
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={showAnalytic}
                onCheckedChange={setShowAnalytic}
                disabled={!primaryResult?.analytic_solution?.solution_expr_plot}
              />
              Solucion analitica
            </label>
            {primaryResult?.analytic_solution?.available && !primaryResult?.analytic_solution?.solution_expr_plot && (
              <span className="text-xs text-muted-foreground">
                La solucion analitica existe, pero no quedo en una forma explicita graficable.
              </span>
            )}
          </div>
          <MathGraph
            points={graphPoints}
            segments={graphSegments}
            functions={
              showAnalytic && primaryResult?.analytic_solution?.solution_expr_plot
                ? [{
                    expr: primaryResult.analytic_solution.solution_expr_plot,
                    color: "#a855f7",
                    label: "y(x)",
                    opacity: 0.85,
                  }]
                : []
            }
            viewBox={viewBox}
            height={360}
          />
        </div>
      }
      resultsPanel={
        primaryResult ? (
          <div className="space-y-4">
            <Card className="glass-card">
              <CardContent className="pt-6 text-sm space-y-2">
                <p>
                  <strong>Metodos:</strong> {selectedMethodIds.map(methodLabel).join(", ")}
                </p>
                <p>
                  <strong>Intervalo:</strong> [{primaryResult.x_min}, {primaryResult.x_max}] | <strong>h:</strong> {primaryResult.h}
                </p>
                <p>
                  <strong>Punto inicial:</strong> ({primaryResult.x0}, {primaryResult.y0})
                </p>
                <p>
                  <strong>Puntos calculados:</strong> {primaryResult.points.length}
                </p>
                {primaryResult.analytic_solution?.available ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <strong>Solucion analitica:</strong>
                      <span className="text-muted-foreground">
                        <LaTeX math={`y(x)=${primaryResult.analytic_solution.solution_expr_latex}`} />
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
                            {primaryResult.analytic_solution.hint && (
                              <p className="text-sm text-muted-foreground">
                                <strong>Metodo detectado:</strong> {primaryResult.analytic_solution.hint}
                              </p>
                            )}
                            {primaryResult.analytic_solution.steps.map((step, idx) => (
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
            {selectedMethodIds.map((selected) => {
              const methodResult = resultsByMethod?.[selected];
              if (!methodResult) return null;
              const analyticExpr = methodResult.analytic_solution?.solution_expr_plot;
              const tableData = methodResult.points.map((p, index) => {
                const iteration = methodResult.iterations[index];
                const slope = iteration?.slope ?? "-";
                const k1 = iteration?.k1 ?? "-";
                const k2 = iteration?.k2 ?? "-";
                const k3 = iteration?.k3 ?? "-";
                const k4 = iteration?.k4 ?? "-";

                let yReal: number | string = "-";
                let localError: number | string = "-";

                if (analyticExpr) {
                  const yTrue = evaluate(analyticExpr, p.x);
                  if (Number.isFinite(yTrue)) {
                    yReal = Number(yTrue.toFixed(10));
                    localError = Number(Math.abs(yTrue - p.y).toFixed(10));
                  }
                }

                return {
                  x: p.x,
                  y: p.y,
                  slope,
                  y_real: yReal,
                  local_error: localError,
                  k1,
                  k2,
                  k3,
                  k4,
                };
              });
              return (
                <ResultsTable
                  key={`table-${selected}`}
                  title={`Puntos (${methodLabel(selected)})`}
                  columns={pointColumns}
                  data={tableData}
                  highlightLast
                />
              );
            })}
          </div>
        ) : null
      }
    />
  );
}
