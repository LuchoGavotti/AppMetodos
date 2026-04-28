"use client";

import { ThemeToggle } from "./theme-toggle";
import { Calculator } from "lucide-react";
import { GeneralModal, LaTeX } from "../methods/general-modal";


const DERIVATIVE_FORMULAS = [
  {
    label: "Regla de la potencia",
    latex: "\\frac{d}{dx}(x^n)=nx^{n-1}",
    description:
      "Permite derivar potencias de x de forma directa.",
  },
  {
    label: "Regla del producto",
    latex: "\\frac{d}{dx}(uv)=u'v+uv'",
    description:
      "Se usa cuando la función es el producto de dos funciones.",
  },
  {
    label: "Regla del cociente",
    latex: "\\frac{d}{dx}\\left(\\frac{u}{v}\\right)=\\frac{u'v-uv'}{v^2}",
    description:
      "Se aplica cuando una función está dividida por otra.",
  },
  {
    label: "Regla de la cadena",
    latex: "\\frac{d}{dx}f(g(x))=f'(g(x))g'(x)",
    description:
      "Se utiliza para derivar funciones compuestas.",
  },
  {
    label: "Derivadas básicas",
    latex:
      "\\begin{array}{l}\n\\frac{d}{dx}(e^x)=e^x \\\\\n\\frac{d}{dx}(\\ln x)=\\frac{1}{x} \\\\\n\\frac{d}{dx}(\\sin x)=\\cos x \\\\\n\\frac{d}{dx}(\\cos x)=-\\sin x\n\\end{array}",
    description:
      "Incluye derivadas fundamentales que se usan frecuentemente.",
  },
];

const INTEGRATION_FORMULAS = [
  {
    label: "Sustitución (Cambio de variable)",
    latex: "\\int f(g(x))g'(x)dx = \\int f(u)du",
    description:
      "Se utiliza un cambio de variable u = g(x) para simplificar la integral cuando aparece una función compuesta.",
  },
  {
    label: "Integración por partes",
    latex: "\\int u \\, dv = uv - \\int v \\, du",
    description:
      "Se usa cuando el integrando es un producto de funciones. Se eligen u y dv de forma conveniente para simplificar la integral.",
  },
  {
    label: "Integrales básicas",
    latex:
      "\\begin{array}{l}\n\\int x^n dx = \\frac{x^{n+1}}{n+1} + C \\ (n \\neq -1) \\\\\n\\int \\frac{1}{x} dx = \\ln|x| + C \\\\\n\\int e^x dx = e^x + C \\\\\n\\int a^x dx = \\frac{a^x}{\\ln a} + C \\\\\n\\int \\sin x \\, dx = -\\cos x + C \\\\\n\\int \\cos x \\, dx = \\sin x + C\n\\end{array}",
    description:
      "Incluye las integrales más comunes que sirven como base para resolver problemas más complejos.",
  },
];

const DIFFERENTIAL_EQUATIONS_FORMULAS = [
  {
    label: "Ecuaciones separables",
    latex: "\\frac{dy}{dx}=g(x)h(y) \\Rightarrow \\int \\frac{1}{h(y)}dy=\\int g(x)dx",
    description:
      "Se resuelven separando las variables y luego integrando ambos lados.",
  },
  {
    label: "Ecuaciones lineales de primer orden",
    latex: "\\frac{dy}{dx}+P(x)y=Q(x)",
    description:
      "Se resuelven usando un factor integrante para simplificar la ecuación.",
  },
  {
    label: "Factor integrante",
    latex: "\\mu(x)=e^{\\int P(x)dx}",
    description:
      "Permite transformar una ecuación lineal en una derivada exacta.",
  },
  {
    label: "Resultado",
    latex: "y(x) = \\frac{1}{\\mu(x)} \\left( \\int \\mu(x)Q(x)dx + C \\right)",
    description:
      "Proporciona la solución general de una ecuación lineal de primer orden después de aplicar el factor integrante.",
  },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <Calculator className="size-4 text-primary-foreground" />
          </div>
          <div className="flex items-center justify-between gap-6">
            <div>
              <h1 className="text-lg font-semibold leading-none">
                Laboratorio de Metodos Numericos
              </h1>
              <p className="text-xs text-muted-foreground">
                Visualizacion Interactiva
              </p>
            </div>

            <div className="flex gap-2">
              <GeneralModal
                        modaltitle="Derivadas"
                        title="Derivadas"
                        description="Metodos de derivacion para resolver derivadas."
                        formulas={DERIVATIVE_FORMULAS}
                      />
              <GeneralModal
                        modaltitle="Integracion"
                        title="Integracion"
                        description="Metodos de integracion para resolver integrales."
                        formulas={INTEGRATION_FORMULAS}
                      />
              <GeneralModal
                        modaltitle="Ecuaciones Diferenciales"
                        title="Ecuaciones Diferenciales"
                        description="Metodos para resolver ecuaciones diferenciales."
                        formulas={DIFFERENTIAL_EQUATIONS_FORMULAS}
                      />
            </div>
          </div>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
