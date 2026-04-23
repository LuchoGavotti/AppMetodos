"use client";

import { ThemeToggle } from "./theme-toggle";
import { Calculator } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <Calculator className="size-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-none">
              Laboratorio de Metodos Numericos
            </h1>
            <p className="text-xs text-muted-foreground">
              Visualizacion Interactiva
            </p>
          </div>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
