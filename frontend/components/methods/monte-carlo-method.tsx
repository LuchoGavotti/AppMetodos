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
import { MathGraph } from "@/components/graph/math-graph";
import { PointCloud3D } from "@/components/graph/point-cloud-3d";
import { TheoryModal, LaTeX } from "./theory-modal";
import { ExpressionKeyboard } from "./expression-keyboard";
import { api } from "@/lib/api";
import { getAutoViewBox } from "@/lib/graph-range";
import { evaluate } from "@/lib/math-parser";
import type { APIError, MonteCarloResponse } from "@/types/methods";
import { Loader2, Play } from "lucide-react";

const THEORY_FORMULAS = [
  {
    label: "Metodo de Valor Medio",
    latex: "\\hat{I} \\approx V_D \\cdot \\frac{1}{n}\\sum_{i=1}^{n} f(\\mathbf{x}_i)",
    description: "Monte Carlo devuelve una estimacion de la integral, denotada por Î.",
  },
  {
    label: "Metodo Hit-or-Miss",
    latex: "\\hat{I} \\approx V_D \\cdot H \\cdot \\frac{1}{n}\\sum_{i=1}^{n} s_i",
    description: "En Hit-or-Miss tambien obtenemos una estimacion Î, pero contando aciertos y rechazos.",
  },
  {
    label: "Error Estandar (EE)",
    latex: "EE = \\frac{\\sigma}{\\sqrt{n}}",
    description: "Mide la precision de la media estimada. Disminuye a medida que n aumenta.",
  },
  {
    label: "Intervalo de Confianza",
    latex: "IC = \\hat{I} \\pm z_{\\alpha/2}\\frac{\\sigma}{\\sqrt{n}}",
    description: "El intervalo de confianza indica un rango de valores probables para la integral verdadera, segun el nivel de confianza elegido.",
  },
  {
    label: "Error Maximo",
    latex: "E = z_{\\alpha/2}\\frac{\\sigma}{\\sqrt{n}}",
    description: "El error maximo coincide con el margen del intervalo y sirve para evaluar si la estimacion tiene la precision pedida.",
  },
];

type Dim = 1 | 2 | 3;
type MCMethod = "mean-value" | "hit-or-miss";
type NumericFieldId =
  | "n"
  | "seed"
  | "confidenceLevel"
  | "maxError"
  | "xMin"
  | "xMax"
  | "yMin"
  | "yMax"
  | "zMin"
  | "zMax";

function parseNumericExpression(value: string, label: string): number {
  const raw = value.trim().replace(",", ".");
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

function parseIntegerExpression(value: string, label: string): number {
  const parsed = parseNumericExpression(value, label);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${label} debe ser un entero`);
  }
  return parsed;
}

function parseNumericExpressionSafe(value: string): number {
  try {
    return evaluate(value.trim().replace(",", "."), 0);
  } catch {
    return Number.NaN;
  }
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

export function MonteCarloMethod() {
  const [dimension, setDimension] = React.useState<Dim>(1);
  const [method, setMethod] = React.useState<MCMethod>("mean-value");
  const [func, setFunc] = React.useState("sin(x)");
  const [n, setN] = React.useState("10000");
  const [seed, setSeed] = React.useState("12345");
  const [confidenceLevel, setConfidenceLevel] = React.useState("95");
  const [maxError, setMaxError] = React.useState("0.01");

  const [xMin, setXMin] = React.useState("0");
  const [xMax, setXMax] = React.useState("3.1415926535");
  const [yMin, setYMin] = React.useState("-1");
  const [yMax, setYMax] = React.useState("1");
  const [zMin, setZMin] = React.useState("-1");
  const [zMax, setZMax] = React.useState("1");

  const [result, setResult] = React.useState<MonteCarloResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [activeNumericField, setActiveNumericField] = React.useState<NumericFieldId>("xMin");
  const functionInputRef = React.useRef<HTMLInputElement>(null);

  const updateDefaultFunctionByDim = (dim: Dim) => {
    if (dim === 1) setFunc("sin(x)");
    if (dim === 2) setFunc("x^2 + y^2");
    if (dim === 3) setFunc("x + y + z");
  };

  const buildBounds = (): [number, number][] => {
    const bx: [number, number] = [
      parseNumericExpression(xMin, "x minimo"),
      parseNumericExpression(xMax, "x maximo"),
    ];
    const by: [number, number] = [
      parseNumericExpression(yMin, "y minimo"),
      parseNumericExpression(yMax, "y maximo"),
    ];
    const bz: [number, number] = [
      parseNumericExpression(zMin, "z minimo"),
      parseNumericExpression(zMax, "z maximo"),
    ];

    if (dimension === 1) return [bx];
    if (dimension === 2) return [bx, by];
    return [bx, by, bz];
  };

  const applyConstantToField = React.useCallback((constantName: "e" | "pi") => {
    const updater = (prev: string) => appendMathConstant(prev, constantName);

    if (activeNumericField === "n") setN(updater);
    else if (activeNumericField === "seed") setSeed(updater);
    else if (activeNumericField === "confidenceLevel") setConfidenceLevel(updater);
    else if (activeNumericField === "maxError") setMaxError(updater);
    else if (activeNumericField === "xMin") setXMin(updater);
    else if (activeNumericField === "xMax") setXMax(updater);
    else if (activeNumericField === "yMin") setYMin(updater);
    else if (activeNumericField === "yMax") setYMax(updater);
    else if (activeNumericField === "zMin") setZMin(updater);
    else setZMax(updater);
  }, [activeNumericField]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const parsedN = parseIntegerExpression(n, "Numero de muestras");
      const parsedSeed =
        seed.trim() === "" ? undefined : parseIntegerExpression(seed, "Semilla");
      const rawConfidenceLevel = parseNumericExpression(
        confidenceLevel,
        "Nivel de confianza"
      );
      const normalizedConfidenceLevel =
        rawConfidenceLevel > 1 ? rawConfidenceLevel / 100 : rawConfidenceLevel;
      const parsedMaxError =
        maxError.trim() === ""
          ? undefined
          : parseNumericExpression(maxError, "Error maximo");

      if (parsedN < 100) {
        throw new Error("El numero de muestras debe ser al menos 100.");
      }
      if (
        !Number.isFinite(normalizedConfidenceLevel) ||
        normalizedConfidenceLevel <= 0 ||
        normalizedConfidenceLevel >= 1
      ) {
        throw new Error("El nivel de confianza debe estar entre 0 y 100%.");
      }
      if (
        parsedMaxError !== undefined &&
        (!Number.isFinite(parsedMaxError) || parsedMaxError <= 0)
      ) {
        throw new Error("El error maximo debe ser un numero positivo.");
      }

      const response = await api.monteCarlo({
        function: func,
        method,
        dimension,
        bounds: buildBounds(),
        n: parsedN,
        seed: parsedSeed,
        confidence_level: normalizedConfidenceLevel,
        max_error: parsedMaxError,
        max_points_to_return: 2500,
      });
      setResult(response);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
        setResult(null);
        return;
      }
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

  const oneDPoints =
    result?.sample_points.map((p) => ({
      x: p.x,
      y: method === "hit-or-miss" ? p.aux ?? p.value : p.value,
      color:
        method === "hit-or-miss"
          ? p.accepted
            ? "#22c55e"
            : "#ef4444"
          : "#0ea5e9",
    })) ?? [];

  const xLow = parseNumericExpressionSafe(xMin);
  const xHigh = parseNumericExpressionSafe(xMax);
  const oneDViewBox = getAutoViewBox({
    xMin: Number.isFinite(xLow) ? xLow : -5,
    xMax: Number.isFinite(xHigh) ? xHigh : 5,
    functions: dimension === 1 && func ? [func] : [],
    points: oneDPoints.map((p) => ({ x: p.x, y: p.y })),
    defaultY: [-5, 5],
  });

  const cloudPoints =
    result?.sample_points
      .map((p) => {
        if (dimension === 2) {
          return {
            x: p.x,
            y: p.y ?? 0,
            z: method === "hit-or-miss" ? p.aux ?? 0 : p.value,
            accepted: p.accepted,
            value: p.value,
          };
        }

        return {
          x: p.x,
          y: p.y ?? 0,
          z: p.z ?? 0,
          accepted: p.accepted,
          value: p.value,
        };
      })
      .filter(Boolean) ?? [];

  return (
    <MethodContainer
      title="Integracion Monte Carlo"
      description="Aproxima integrales en 1D, 2D y 3D usando muestreo aleatorio determinista con semilla."
      colorClass="method-monte-carlo"
      theoryButton={
        <TheoryModal
          title="Metodo Monte Carlo"
          description="Tecnicas estocasticas para aproximar integrales de multiples dimensiones."
          formulas={THEORY_FORMULAS}
        />
      }
      error={error}
      success={
        result
          ? `Integral estimada: ${result.estimate} (IC ${(result.confidence_level * 100).toFixed(0)}%: [${result.confidence_interval_low}, ${result.confidence_interval_high}])`
          : null
      }
      isLoading={isLoading}
      inputPanel={
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Dimension</Label>
              <Select
                value={String(dimension)}
                onValueChange={(value) => {
                  const dim = Number(value) as Dim;
                  setDimension(dim);
                  updateDefaultFunctionByDim(dim);
                  setResult(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1D</SelectItem>
                  <SelectItem value="2">2D</SelectItem>
                  <SelectItem value="3">3D</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Metodo</Label>
              <Select value={method} onValueChange={(value) => setMethod(value as MCMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mean-value">Valor Medio</SelectItem>
                  <SelectItem value="hit-or-miss">Hit-or-Miss</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mc-function">Funcion</Label>
            <Input
              id="mc-function"
              ref={functionInputRef}
              value={func}
              onChange={(e) => setFunc(e.target.value)}
              className="font-mono"
              placeholder={dimension === 1 ? "ej.: sin(x)" : dimension === 2 ? "ej.: x^2 + y^2" : "ej.: x + y + z"}
            />
            <ExpressionKeyboard
              inputRef={functionInputRef}
              setValue={setFunc}
              showY={dimension >= 2}
              showZ={dimension >= 3}
            />
            {result?.function_latex && (
              <p className="text-xs text-muted-foreground">
                <LaTeX math={`f = ${result.function_latex}`} />
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="mc-n">Numero de muestras (n)</Label>
              <Input
                id="mc-n"
                type="text"
                value={n}
                onChange={(e) => setN(e.target.value)}
                onFocus={() => setActiveNumericField("n")}
                placeholder="ej.: 10^4"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mc-seed">Semilla</Label>
              <Input
                id="mc-seed"
                type="text"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                onFocus={() => setActiveNumericField("seed")}
                placeholder="ej.: 12345"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="mc-confidence-level">Nivel de confianza (%)</Label>
              <Input
                id="mc-confidence-level"
                type="text"
                value={confidenceLevel}
                onChange={(e) => setConfidenceLevel(e.target.value)}
                onFocus={() => setActiveNumericField("confidenceLevel")}
                placeholder="ej.: 95 o 98.5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mc-max-error">Error maximo</Label>
              <Input
                id="mc-max-error"
                type="text"
                value={maxError}
                onChange={(e) => setMaxError(e.target.value)}
                onFocus={() => setActiveNumericField("maxError")}
                placeholder="ej.: 0.01 o exp(-2)"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cotas de integracion</Label>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Variable x: desde x minimo hasta x maximo</p>
              <div className="grid grid-cols-2 gap-2">
                <Input type="text" value={xMin} onChange={(e) => setXMin(e.target.value)} onFocus={() => setActiveNumericField("xMin")} placeholder="ej.: 0" />
                <Input type="text" value={xMax} onChange={(e) => setXMax(e.target.value)} onFocus={() => setActiveNumericField("xMax")} placeholder="ej.: pi/2" />
              </div>
            </div>
            {dimension >= 2 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Variable y: desde y minimo hasta y maximo</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="text" value={yMin} onChange={(e) => setYMin(e.target.value)} onFocus={() => setActiveNumericField("yMin")} placeholder="ej.: -1" />
                  <Input type="text" value={yMax} onChange={(e) => setYMax(e.target.value)} onFocus={() => setActiveNumericField("yMax")} placeholder="ej.: exp(2)" />
                </div>
              </div>
            )}
            {dimension >= 3 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Variable z: desde z minimo hasta z maximo</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="text" value={zMin} onChange={(e) => setZMin(e.target.value)} onFocus={() => setActiveNumericField("zMin")} placeholder="ej.: -pi" />
                  <Input type="text" value={zMax} onChange={(e) => setZMax(e.target.value)} onFocus={() => setActiveNumericField("zMax")} placeholder="ej.: pi" />
                </div>
              </div>
            )}
          </div>

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

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Calculando...
              </>
            ) : (
              <>
                <Play className="size-4" />
                Ejecutar Monte Carlo
              </>
            )}
          </Button>
        </form>
      }
      graphPanel={
        dimension === 1 ? (
          <MathGraph
            functions={func ? [{ expr: func, color: "#f59e0b" }] : []}
            points={oneDPoints}
            viewBox={oneDViewBox}
            height={360}
          />
        ) : (
          <PointCloud3D
            points={cloudPoints}
            height={360}
            title={
              method === "hit-or-miss"
                ? "Verde: aceptados, Rojo: rechazados"
                : "Color por valor de f"
            }
          />
        )
      }
      resultsPanel={
        result ? (
          <Card className="glass-card">
            <CardContent className="pt-6 text-sm space-y-5">
              <section className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Estimacion
                </p>
                <p><strong>Integral estimada (I_hat):</strong> {result.estimate}</p>
                <p><strong>Volumen del dominio (V):</strong> {result.domain_volume}</p>
                <p><strong>Muestras usadas:</strong> {result.n_used} / {result.n_requested}</p>
                {result.exact_integral !== undefined && (
                  <p><strong>Integral exacta:</strong> {result.exact_integral}</p>
                )}
                {result.abs_error !== undefined && (
                  <p><strong>Error absoluto:</strong> {result.abs_error}</p>
                )}
              </section>

              <section className="space-y-2 border-t pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Estadisticos de la muestra
                </p>
                <p><strong>Promedio muestral (x_bar):</strong> {result.sample_mean}</p>
                <p><strong>Varianza muestral (s^2):</strong> {result.sample_variance}</p>
                <p><strong>Desvio estandar muestral (s):</strong> {result.sample_std_dev}</p>
                <p><strong>Error estandar (SE):</strong> {result.standard_error}</p>
              </section>

              <section className="space-y-2 border-t pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Intervalo de confianza
                </p>
                <p><strong>Nivel de confianza:</strong> {(result.confidence_level * 100).toFixed(0)}%</p>
                <p><strong>Valor critico (z):</strong> {result.z_value}</p>
                <p><strong>Margen de error (E):</strong> {result.margin_of_error}</p>
                <p><strong>Punto A:</strong> {result.confidence_interval_low}</p>
                <p><strong>Punto B:</strong> {result.confidence_interval_high}</p>
                <p><strong>IC:</strong> [{result.confidence_interval_low}, {result.confidence_interval_high}]</p>
                {result.max_error !== undefined && (
                  <>
                    <p><strong>Error maximo pedido (Emax):</strong> {result.max_error}</p>
                    <p><strong>Cumple el error maximo:</strong> {result.meets_max_error ? "Si" : "No"}</p>
                    {result.required_n_for_max_error !== null && result.required_n_for_max_error !== undefined && (
                      <p><strong>Muestras estimadas para cumplirlo:</strong> {result.required_n_for_max_error}</p>
                    )}
                  </>
                )}
              </section>

              {method === "hit-or-miss" && result.method_details && (
                <section className="space-y-2 border-t pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Datos del metodo
                  </p>
                  <p>
                    <strong>Aceptados/Rechazados:</strong> {result.method_details.accepted_points} / {result.method_details.rejected_points}
                  </p>
                  <p>
                    <strong>Caja auxiliar:</strong> [{result.method_details.bounding_low}, {result.method_details.bounding_high}]
                  </p>
                </section>
              )}
            </CardContent>
          </Card>
        ) : null
      }
    />
  );
}
