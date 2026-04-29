"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BookOpenText } from "lucide-react";

const DERIVATIVES = [
  ["a", "0"],
  ["x", "1"],
  ["x^2", "2x"],
  ["x^m", "m·x^{m-1}"],
  ["f(x)+g(x)", "f'(x)+g'(x)"],
  ["f(x)·g(x)", "f'(x)g(x)+f(x)g'(x)"],
  ["f(x)/g(x)", "(f'(x)g(x)-f(x)g'(x))/g(x)^2"],
  ["1/f(x)", "-f'(x)/f(x)^2"],
  ["ln(x)", "1/x"],
  ["ln(u)", "u'/u"],
  ["e^x", "e^x"],
  ["e^u", "u'·e^u"],
  ["a^x", "a^x·ln(a)"],
  ["a^u", "a^u·ln(a)·u'"],
  ["u^m", "m·u^{m-1}·u'"],
  ["sin(x)", "cos(x)"],
  ["sin(u)", "u'·cos(u)"],
  ["cos(x)", "-sin(x)"],
  ["cos(u)", "-u'·sin(u)"],
  ["tan(x)", "1/cos^2(x)=1+tan^2(x)"],
  ["tan(u)", "u'/cos^2(u)"],
  ["cot(x)", "-1/sin^2(x)"],
  ["sec(x)", "tan(x)·sec(x)"],
  ["csc(x)", "-cot(x)·csc(x)"],
  ["arcsin(x)", "1/sqrt(1-x^2)"],
  ["arccos(x)", "-1/sqrt(1-x^2)"],
  ["arctan(x)", "1/(1+x^2)"],
];

const INTEGRALS = [
  ["∫ a dx", "a·x + C"],
  ["∫ x^n dx", "x^{n+1}/(n+1) + C, n ≠ -1"],
  ["∫ 1/x dx", "ln|x| + C"],
  ["∫ e^x dx", "e^x + C"],
  ["∫ a^x dx", "a^x/ln(a) + C"],
  ["∫ sin(x) dx", "-cos(x) + C"],
  ["∫ cos(x) dx", "sin(x) + C"],
  ["∫ tan(x) dx", "-ln|cos(x)| + C"],
  ["∫ cot(x) dx", "ln|sin(x)| + C"],
  ["∫ sec^2(x) dx", "tan(x) + C"],
  ["∫ csc^2(x) dx", "-cot(x) + C"],
  ["∫ sec(x)tan(x) dx", "sec(x) + C"],
  ["∫ csc(x)cot(x) dx", "-csc(x) + C"],
  ["∫ 1/(1+x^2) dx", "arctan(x) + C"],
  ["∫ 1/sqrt(1-x^2) dx", "arcsin(x) + C"],
  ["∫ u'/u dx", "ln|u| + C"],
  ["∫ u'·e^u dx", "e^u + C"],
  ["∫ u'·a^u dx", "a^u/ln(a) + C"],
  ["∫ u'·cos(u) dx", "sin(u) + C"],
  ["∫ u'·sin(u) dx", "-cos(u) + C"],
];

function CheatSheetTable({
  title,
  rows,
}: {
  title: string;
  rows: string[][];
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold tracking-wide text-foreground">{title}</h3>
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-cyan-100/80 text-slate-900">
            <tr>
              <th className="border-b border-r px-3 py-2 text-left font-semibold">Función</th>
              <th className="border-b px-3 py-2 text-left font-semibold">
                {title.includes("Derivadas") ? "Derivada" : "Integral"}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([left, right]) => (
              <tr key={`${title}-${left}`} className="odd:bg-background even:bg-muted/20">
                <td className="border-r px-3 py-2 font-mono text-xs sm:text-sm">{left}</td>
                <td className="px-3 py-2 font-mono text-xs sm:text-sm">{right}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function FormulaCheatSheet() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2">
          <BookOpenText className="size-4" />
          Cheat Sheet
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Cheat Sheet de Derivadas e Integrales</DialogTitle>
          <DialogDescription>
            Resumen rapido para consultar formulas basicas mientras resolves ejercicios.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 pt-2">
          <CheatSheetTable title="Tabla de Derivadas" rows={DERIVATIVES} />
          <CheatSheetTable title="Tabla de Integrales" rows={INTEGRALS} />
          <p className="text-xs text-muted-foreground">
            Notación usada: `u` es una función de `x`, `a` es constante positiva y `C` es la constante de integración.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
