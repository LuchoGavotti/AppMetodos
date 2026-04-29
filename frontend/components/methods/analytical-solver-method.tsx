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
import { TheoryModal, LaTeX } from "./theory-modal";
import { ExpressionKeyboard } from "./expression-keyboard";
import { api } from "@/lib/api";
import { evaluate } from "@/lib/math-parser";
import type {
  AnalyticalSolverResponse,
  APIError,
} from "@/types/methods";
import { Loader2, Play } from "lucide-react";

const THEORY_FORMULAS = [
  {
    label: "Derivada Analitica",
    latex: "\\frac{d^n}{dx^n}f(x)",
    description: "Se aplica derivacion simbolica para obtener la expresion exacta cuando existe en forma cerrada.",
  },
  {
    label: "Integral Definida",
    latex: "\\int_a^b f(x)\\,dx,\\qquad \\iint_D f(x,y)\\,dA,\\qquad \\iiint_V f(x,y,z)\\,dV",
    description: "Las integrales dobles y triples se resuelven como integraciones sucesivas, una variable por vez.",
  },
  {
    label: "Integral Indefinida",
    latex: "\\int f(x)\\,dx = F(x)+C",
    description: "En la integral indefinida se busca una primitiva y siempre se agrega la constante de integracion C.",
  },
  {
    label: "EDO Analitica",
    latex: "\\frac{dy}{dx} = f(x,y)",
    description: "Si SymPy encuentra una solucion cerrada, se muestra el desarrollo y la solucion final paso a paso.",
  },
];

type SolverProblemType = "derivative" | "integral" | "differential-equation";
type NumericFieldId =
  | "xMin"
  | "xMax"
  | "yMin"
  | "yMax"
  | "zMin"
  | "zMax"
  | "evaluationPoint"
  | "x0"
  | "y0";

function parseNumericExpression(value: string, label: string): number {
  const raw = value.trim();
  if (!raw) {
    throw new Error(`${label} no puede estar vacio`);
  }

  const parsed = evaluate(raw, 0);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} no es una expresion numerica valida`);
  }

  return parsed;
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

export function AnalyticalSolverMethod() {
  const [problemType, setProblemType] = React.useState<SolverProblemType>("derivative");
  const [functionExpr, setFunctionExpr] = React.useState("sin(x)^2");
  const [variable, setVariable] = React.useState<"x" | "y" | "z">("x");
  const [derivativeOrder, setDerivativeOrder] = React.useState("1");
  const [evaluationPoint, setEvaluationPoint] = React.useState("");
  const [integralDimension, setIntegralDimension] = React.useState<1 | 2 | 3>(1);
  const [integralDefinite, setIntegralDefinite] = React.useState(true);
  const [equation, setEquation] = React.useState("x + y");
  const [x0, setX0] = React.useState("");
  const [y0, setY0] = React.useState("");

  const [xMin, setXMin] = React.useState("0");
  const [xMax, setXMax] = React.useState("pi");
  const [yMin, setYMin] = React.useState("0");
  const [yMax, setYMax] = React.useState("1");
  const [zMin, setZMin] = React.useState("0");
  const [zMax, setZMax] = React.useState("1");

  const [result, setResult] = React.useState<AnalyticalSolverResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [activeNumericField, setActiveNumericField] = React.useState<NumericFieldId>("xMin");
  const expressionInputRef = React.useRef<HTMLInputElement>(null);

  const applyConstantToField = React.useCallback((constantName: "e" | "pi") => {
    const updater = (prev: string) => appendMathConstant(prev, constantName);

    if (activeNumericField === "xMin") setXMin(updater);
    else if (activeNumericField === "xMax") setXMax(updater);
    else if (activeNumericField === "yMin") setYMin(updater);
    else if (activeNumericField === "yMax") setYMax(updater);
    else if (activeNumericField === "zMin") setZMin(updater);
    else if (activeNumericField === "zMax") setZMax(updater);
    else if (activeNumericField === "evaluationPoint") setEvaluationPoint(updater);
    else if (activeNumericField === "x0") setX0(updater);
    else setY0(updater);
  }, [activeNumericField]);

  const buildBounds = (): [number, number][] => {
    const bounds: [number, number][] = [
      [parseNumericExpression(xMin, "x minimo"), parseNumericExpression(xMax, "x maximo")],
    ];

    if (integralDimension >= 2) {
      bounds.push([parseNumericExpression(yMin, "y minimo"), parseNumericExpression(yMax, "y maximo")]);
    }
    if (integralDimension >= 3) {
      bounds.push([parseNumericExpression(zMin, "z minimo"), parseNumericExpression(zMax, "z maximo")]);
    }

    return bounds;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      let response: AnalyticalSolverResponse;

      if (problemType === "derivative") {
        const parsedOrder = Number(derivativeOrder);
        if (!Number.isInteger(parsedOrder) || parsedOrder <= 0) {
          throw new Error("El orden de la derivada debe ser un entero positivo.");
        }
        const parsedEvaluationPoint =
          evaluationPoint.trim() === ""
            ? undefined
            : parseNumericExpression(evaluationPoint, "Punto de evaluacion");

        response = await api.analyticalSolver({
          problem_type: "derivative",
          function: functionExpr,
          variable,
          derivative_order: parsedOrder,
          evaluation_point: parsedEvaluationPoint,
        });
      } else if (problemType === "integral") {
        response = await api.analyticalSolver({
          problem_type: "integral",
          function: functionExpr,
          variable,
          integral_definite: integralDefinite,
          integral_dimension: integralDefinite ? integralDimension : 1,
          bounds: integralDefinite ? buildBounds() : undefined,
        });
      } else {
        const parsedX0 = x0.trim() === "" ? undefined : parseNumericExpression(x0, "x0");
        const parsedY0 = y0.trim() === "" ? undefined : parseNumericExpression(y0, "y0");

        if ((parsedX0 === undefined) !== (parsedY0 === undefined)) {
          throw new Error("Si queres condicion inicial, tenes que completar x0 e y0.");
        }

        response = await api.analyticalSolver({
          problem_type: "differential-equation",
          equation,
          x0: parsedX0,
          y0: parsedY0,
        });
      }

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

  const showY = problemType === "integral" ? integralDimension >= 2 : true;
  const showZ = problemType === "integral" ? integralDimension >= 3 : variable === "z";

  return (
    <MethodContainer
      title="Resolucion Analitica Paso a Paso"
      description="Resuelve derivadas, integrales definidas y ecuaciones diferenciales en forma simbolica cuando existe solucion cerrada."
      colorClass="method-integration"
      theoryButton={
        <TheoryModal
          title="Resolucion Analitica"
          description="Este apartado busca expresiones exactas y muestra un desarrollo paso a paso."
          formulas={THEORY_FORMULAS}
        />
      }
      error={error}
      success={
        result
          ? result.available
            ? "Se obtuvo una resolucion analitica paso a paso."
            : "No se encontro una solucion cerrada completa, pero se analizo el problema."
          : null
      }
      isLoading={isLoading}
      inputPanel={
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de problema</Label>
            <Select
              value={problemType}
              onValueChange={(value) => {
                setProblemType(value as SolverProblemType);
                setResult(null);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="derivative">Derivada</SelectItem>
                <SelectItem value="integral">Integral</SelectItem>
                <SelectItem value="differential-equation">Ecuacion diferencial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {problemType !== "differential-equation" ? (
            <div className="space-y-2">
              <Label htmlFor="analytic-function">
                {problemType === "derivative" ? "Funcion a derivar" : "Funcion a integrar"}
              </Label>
              <Input
                id="analytic-function"
                ref={expressionInputRef}
                value={functionExpr}
                onChange={(e) => setFunctionExpr(e.target.value)}
                className="font-mono"
                placeholder={problemType === "derivative" ? "ej.: sin(x)^2" : "ej.: x^2 + y^2"}
              />
              <ExpressionKeyboard
                inputRef={expressionInputRef}
                setValue={setFunctionExpr}
                showY={showY}
                showZ={showZ}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="analytic-equation">Ecuacion diferencial y&apos; = f(x,y)</Label>
              <Input
                id="analytic-equation"
                ref={expressionInputRef}
                value={equation}
                onChange={(e) => setEquation(e.target.value)}
                className="font-mono"
                placeholder="ej.: x + y"
              />
              <ExpressionKeyboard inputRef={expressionInputRef} setValue={setEquation} showY />
            </div>
          )}

          {problemType === "derivative" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Variable</Label>
                  <Select value={variable} onValueChange={(value) => setVariable(value as "x" | "y" | "z")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="x">x</SelectItem>
                      <SelectItem value="y">y</SelectItem>
                      <SelectItem value="z">z</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="analytic-order">Orden</Label>
                  <Input
                    id="analytic-order"
                    type="number"
                    min={1}
                    step={1}
                    value={derivativeOrder}
                    onChange={(e) => setDerivativeOrder(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="analytic-evaluation-point">Punto de evaluacion (opcional)</Label>
                <Input
                  id="analytic-evaluation-point"
                  type="text"
                  value={evaluationPoint}
                  onChange={(e) => setEvaluationPoint(e.target.value)}
                  onFocus={() => setActiveNumericField("evaluationPoint")}
                  placeholder="ej.: 1, pi/2, 0.5"
                />
                <p className="text-xs text-muted-foreground">
                  Si lo completas, ademas de la derivada simbolica se calcula la derivada en ese punto.
                </p>
              </div>
            </>
          )}

          {problemType === "integral" && (
            <>
              <div className="space-y-2">
                <Label>Tipo de integral</Label>
                <Select
                  value={integralDefinite ? "definida" : "indefinida"}
                  onValueChange={(value) => setIntegralDefinite(value === "definida")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="definida">Definida</SelectItem>
                    <SelectItem value="indefinida">Indefinida</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!integralDefinite && (
                <div className="space-y-2">
                  <Label>Variable de integracion</Label>
                  <Select value={variable} onValueChange={(value) => setVariable(value as "x" | "y" | "z")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="x">x</SelectItem>
                      <SelectItem value="y">y</SelectItem>
                      <SelectItem value="z">z</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {integralDefinite && (
                <div className="space-y-2">
                  <Label>Dimension de la integral</Label>
                  <Select
                    value={String(integralDimension)}
                    onValueChange={(value) => setIntegralDimension(Number(value) as 1 | 2 | 3)}
                  >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Simple</SelectItem>
                    <SelectItem value="2">Doble</SelectItem>
                    <SelectItem value="3">Triple</SelectItem>
                  </SelectContent>
                  </Select>
                </div>
              )}

              {integralDefinite && (
                <div className="space-y-2">
                  <Label>Cotas de integracion</Label>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Variable x: desde x minimo hasta x maximo</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={xMin} onChange={(e) => setXMin(e.target.value)} onFocus={() => setActiveNumericField("xMin")} placeholder="x minimo" />
                      <Input value={xMax} onChange={(e) => setXMax(e.target.value)} onFocus={() => setActiveNumericField("xMax")} placeholder="x maximo" />
                    </div>
                  </div>

                  {integralDimension >= 2 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Variable y: desde y minimo hasta y maximo</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={yMin} onChange={(e) => setYMin(e.target.value)} onFocus={() => setActiveNumericField("yMin")} placeholder="y minimo" />
                        <Input value={yMax} onChange={(e) => setYMax(e.target.value)} onFocus={() => setActiveNumericField("yMax")} placeholder="y maximo" />
                      </div>
                    </div>
                  )}
                  {integralDimension >= 3 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Variable z: desde z minimo hasta z maximo</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={zMin} onChange={(e) => setZMin(e.target.value)} onFocus={() => setActiveNumericField("zMin")} placeholder="z minimo" />
                        <Input value={zMax} onChange={(e) => setZMax(e.target.value)} onFocus={() => setActiveNumericField("zMax")} placeholder="z maximo" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {problemType === "differential-equation" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="analytic-x0">x0 opcional</Label>
                  <Input
                    id="analytic-x0"
                    type="text"
                    value={x0}
                    onChange={(e) => setX0(e.target.value)}
                    onFocus={() => setActiveNumericField("x0")}
                    placeholder="ej.: 0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="analytic-y0">y0 opcional</Label>
                  <Input
                    id="analytic-y0"
                    type="text"
                    value={y0}
                    onChange={(e) => setY0(e.target.value)}
                    onFocus={() => setActiveNumericField("y0")}
                    placeholder="ej.: 1"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Si completas x0 e y0, se buscara la solucion particular. Si los dejas vacios, se buscara la solucion general.
              </p>
            </>
          )}

          {(problemType === "derivative" || problemType === "integral" || problemType === "differential-equation") && (
            <div className="space-y-2">
              <Label>Constantes rapidas (campo activo)</Label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => applyConstantToField("pi")}>
                  pi
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => applyConstantToField("e")}>
                  e
                </Button>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Resolviendo...
              </>
            ) : (
              <>
                <Play className="size-4" />
                Resolver paso a paso
              </>
            )}
          </Button>
        </form>
      }
      graphPanel={
        <div className="min-h-[360px] p-6 flex flex-col justify-center gap-4">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            Vista General
          </p>
          <h3 className="text-2xl font-semibold">
            {problemType === "derivative" && "Derivacion simbolica"}
            {problemType === "integral" && "Integracion exacta"}
            {problemType === "differential-equation" && "Solucion analitica de EDO"}
          </h3>
          <p className="text-muted-foreground text-sm">
            Este apartado intenta encontrar una expresion cerrada y mostrar el desarrollo paso a paso. Cuando no exista solucion analitica manejable, te lo informa explicitamente.
          </p>
          {result?.input_latex && (
            <div className="rounded-lg bg-muted/40 p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Problema interpretado</p>
              <LaTeX math={result.input_latex} block />
            </div>
          )}
          {result?.result_latex && (
            <div className="rounded-lg bg-muted/40 p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Resultado final</p>
              <LaTeX math={result.result_latex} block />
            </div>
          )}
        </div>
      }
      resultsPanel={
        result ? (
          <Card className="glass-card">
            <CardContent className="pt-6 space-y-5">
              {!result.available && result.message && (
                <p className="text-sm text-muted-foreground">{result.message}</p>
              )}

              {result.metadata?.hint && (
                <p className="text-sm">
                  <strong>Metodo detectado:</strong> {result.metadata.hint}
                </p>
              )}

              {result.metadata?.solved_with_ics !== undefined && result.metadata.solved_with_ics !== null && (
                <p className="text-sm">
                  <strong>Condicion inicial aplicada:</strong> {result.metadata.solved_with_ics ? "Si" : "No"}
                </p>
              )}

              {result.metadata?.satisfies_initial_condition !== undefined && result.metadata.satisfies_initial_condition !== null && (
                <p className="text-sm">
                  <strong>Verificacion de condicion inicial:</strong> {result.metadata.satisfies_initial_condition ? "Cumple" : "No se pudo verificar"}
                </p>
              )}

              {result.metadata?.evaluation_point !== undefined &&
                result.metadata.evaluation_point !== null &&
                result.metadata.evaluation_value !== undefined &&
                result.metadata.evaluation_value !== null && (
                  <div className="space-y-1">
                    <p className="text-sm">
                      <strong>Derivada evaluada en {result.metadata.evaluation_point}:</strong>{" "}
                      {result.metadata.evaluation_value}
                    </p>
                    <p className="text-sm">
                      <strong>Valor numerico copiable:</strong>{" "}
                      <code>{result.metadata.evaluation_value}</code>
                    </p>
                  </div>
                )}

              <section className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Desarrollo paso a paso
                </p>
                {result.steps.length > 0 ? (
                  result.steps.map((step, index) => (
                    <div key={`${step.title}-${index}`} className="space-y-2 rounded-lg border border-border/60 p-4">
                      <p className="font-medium text-sm">{step.title}</p>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                      {step.latex && (
                        <div className="rounded-md bg-muted/40 p-3 overflow-x-auto">
                          <LaTeX math={step.latex} block />
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No hay desarrollo disponible para este caso.
                  </p>
                )}
              </section>
            </CardContent>
          </Card>
        ) : null
      }
    />
  );
}
