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
import type { APIError, MonteCarloResponse } from "@/types/methods";
import { Loader2, Play } from "lucide-react";

const THEORY_FORMULAS = [
  {
    label: "Metodo de Valor Medio",
    latex: "I \\approx V_D \\cdot \\frac{1}{n}\\sum_{i=1}^{n} f(\\mathbf{x}_i)",
    description: "Promedia valores de la funcion en puntos aleatorios del dominio.",
  },
  {
    label: "Metodo Hit-or-Miss",
    latex: "I \\approx V_D \\cdot H \\cdot \\frac{1}{n}\\sum_{i=1}^{n} s_i",
    description: "Cuenta aciertos en una caja de acotacion para estimar el integral.",
  },
  {
    label: "Error Estandar",
    latex: "EE \\approx \\frac{\\sigma}{\\sqrt{n}}",
    description: "El error disminuye aproximadamente como 1/sqrt(n).",
  },
  {
    label: "Desviacion Estandar",
    latex: "\\sigma \\approx \\sqrt{\\frac{1}{n-1}\\sum_{i=1}^{n} (f(\\mathbf{x}_i) - \\bar{f})^2}",
    description: "Mide la variabilidad de las muestras de la funcion.",
  },
  {
    label: "Intervalo de Confianza",
    latex: "IC = I \\pm z_{(\\alpha/2)} \\cdot EE * V",
    description: "El intervalo de confianza se calcula multiplicando el error estandar por el valor critico z. V = (b-a)(d-c)...",
  },
];

type Dim = 1 | 2 | 3;
type MCMethod = "mean-value" | "hit-or-miss";

export function MonteCarloMethod() {
  const [dimension, setDimension] = React.useState<Dim>(1);
  const [method, setMethod] = React.useState<MCMethod>("mean-value");
  const [func, setFunc] = React.useState("sin(x)");
  const [n, setN] = React.useState("10000");
  const [seed, setSeed] = React.useState("42");
  const [confidence, setConfidence] = React.useState("0.95");
  const [nConstraint, setNConstraint] = React.useState<"max_standard_error" | "max_confidence_half_width">(
    "max_standard_error"
  );
  const [nConstraintValue, setNConstraintValue] = React.useState("");

  const [xMin, setXMin] = React.useState("0");
  const [xMax, setXMax] = React.useState("3.1415926535");
  const [yMin, setYMin] = React.useState("-1");
  const [yMax, setYMax] = React.useState("1");
  const [zMin, setZMin] = React.useState("-1");
  const [zMax, setZMax] = React.useState("1");

  const [result, setResult] = React.useState<MonteCarloResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const functionInputRef = React.useRef<HTMLInputElement>(null);

  const updateDefaultFunctionByDim = (dim: Dim) => {
    if (dim === 1) setFunc("sin(x)");
    if (dim === 2) setFunc("x^2 + y^2");
    if (dim === 3) setFunc("x + y + z");
  };

  const buildBounds = (): [number, number][] => {
    const bx: [number, number] = [Number(xMin), Number(xMax)];
    const by: [number, number] = [Number(yMin), Number(yMax)];
    const bz: [number, number] = [Number(zMin), Number(zMax)];

    if (dimension === 1) return [bx];
    if (dimension === 2) return [bx, by];
    return [bx, by, bz];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await api.monteCarlo({
        function: func,
        method,
        dimension,
        bounds: buildBounds(),
        n: Number(n),
        confidence_level: Number(confidence),
        max_standard_error:
          nConstraint === "max_standard_error" && nConstraintValue.trim() !== ""
            ? Number(nConstraintValue)
            : undefined,
        max_confidence_half_width:
          nConstraint === "max_confidence_half_width" && nConstraintValue.trim() !== ""
            ? Number(nConstraintValue)
            : undefined,
        seed: seed.trim() === "" ? undefined : Number(seed),
        max_points_to_return: 2500,
      });
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

  const xLow = Number(xMin);
  const xHigh = Number(xMax);
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
          ? `Integral estimada: ${result.estimate} (IC ${(result.confidence_level * 100).toFixed(1)}% +/- ${result.confidence_half_width})`
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
              <Input id="mc-n" type="number" min={100} step={100} value={n} onChange={(e) => setN(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mc-seed">Semilla</Label>
              <Input id="mc-seed" type="number" value={seed} onChange={(e) => setSeed(e.target.value)} />
            </div>
          </div>

            <div className="space-y-2">
              <Label htmlFor="mc-confidence">Confianza (0-1)</Label>
              <Input
                id="mc-confidence"
                type="number"
                min={0.5}
                max={0.9999}
                step="0.01"
                value={confidence}
                onChange={(e) => setConfidence(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Criterio para n minimo</Label>
              <Select
                value={nConstraint}
                onValueChange={(value) => setNConstraint(value as typeof nConstraint)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="max_standard_error">Error estandar maximo</SelectItem>
                  <SelectItem value="max_confidence_half_width">Intervalo de confianza maximo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          <div className="space-y-2">
            <Label htmlFor="mc-n-constraint">
              {nConstraint === "max_standard_error"
                ? "Error estandar maximo"
                : "Ancho maximo del intervalo (+/-)"}
            </Label>
            <Input
              id="mc-n-constraint"
              type="number"
              min={0}
              step="any"
              value={nConstraintValue}
              onChange={(e) => setNConstraintValue(e.target.value)}
              placeholder="opcional"
            />
          </div>

          <div className="space-y-2">
            <Label>Cotas de integracion</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" step="any" value={xMin} onChange={(e) => setXMin(e.target.value)} placeholder="x min" />
              <Input type="number" step="any" value={xMax} onChange={(e) => setXMax(e.target.value)} placeholder="x max" />
            </div>
            {dimension >= 2 && (
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" step="any" value={yMin} onChange={(e) => setYMin(e.target.value)} placeholder="y min" />
                <Input type="number" step="any" value={yMax} onChange={(e) => setYMax(e.target.value)} placeholder="y max" />
              </div>
            )}
            {dimension >= 3 && (
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" step="any" value={zMin} onChange={(e) => setZMin(e.target.value)} placeholder="z min" />
                <Input type="number" step="any" value={zMax} onChange={(e) => setZMax(e.target.value)} placeholder="z max" />
              </div>
            )}
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
            <CardContent className="pt-6 text-sm space-y-2">
              <p><strong>Estimacion:</strong> {result.estimate}</p>
              <p><strong>Valor critico (z):</strong> {result.confidence_z}</p>
              <p><strong>Desviacion estandar (sin volumen):</strong> {result.standard_deviation_raw}</p>
              <p><strong>Error estandar (sin volumen):</strong> {result.standard_error_raw}</p>
              <p><strong>Desviacion estandar (con volumen):</strong> {result.standard_deviation}</p>
              <p><strong>Error estandar (con volumen):</strong> {result.standard_error}</p>
              <p><strong>IC {(result.confidence_level * 100).toFixed(1)}% (+/-):</strong> {result.confidence_half_width}</p>
              <p><strong>Volumen del dominio:</strong> {result.domain_volume}</p>
              <p><strong>Muestras usadas:</strong> {result.n_used} / {result.n_requested}</p>
              {result.min_n_required !== undefined && result.min_n_required !== null && (
                <p><strong>n minimo sugerido:</strong> {result.min_n_required}</p>
              )}
              {result.exact_integral !== undefined && (
                <p><strong>Integral exacta (si disponible):</strong> {result.exact_integral}</p>
              )}
              {result.abs_error !== undefined && (
                <p><strong>Error absoluto:</strong> {result.abs_error}</p>
              )}
              {method === "hit-or-miss" && result.method_details && (
                <>
                  <p>
                    <strong>Aceptados/Rechazados:</strong> {result.method_details.accepted_points} / {result.method_details.rejected_points}
                  </p>
                  <p>
                    <strong>Caja auxiliar:</strong> [{result.method_details.bounding_low}, {result.method_details.bounding_high}]
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ) : null
      }
    />
  );
}
