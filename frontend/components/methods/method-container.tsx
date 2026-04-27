"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MethodContainerProps {
  title: string;
  description: string;
  colorClass?: string;
  inputPanel: React.ReactNode;
  graphPanel: React.ReactNode;
  resultsPanel?: React.ReactNode;
  theoryButton?: React.ReactNode;
  error?: string | null;
  warning?: string | null;
  success?: string | null;
  resultDetail?: React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function MethodContainer({
  title,
  description,
  colorClass,
  inputPanel,
  graphPanel,
  resultsPanel,
  theoryButton,
  error,
  warning,
  success,
  resultDetail,
  isLoading,
  className,
}: MethodContainerProps) {
  return (
    <div className={cn("space-y-4", colorClass, className)}>
      {/* Header with title and theory button */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        {theoryButton}
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {warning && (
        <Alert>
          <AlertTriangle className="size-4 text-amber-500" />
          <AlertTitle>Advertencia</AlertTitle>
          <AlertDescription>{warning}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <CheckCircle2 className="size-4 text-green-500" />
          <AlertTitle>Exito</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      {resultDetail && (
        <Alert>
          <AlertTitle>Raiz Real</AlertTitle>
          <AlertDescription>{resultDetail}</AlertDescription>
        </Alert>
      )}

      {/* Main layout */}
      <div className="grid gap-4 lg:grid-cols-[350px_1fr]">
        {/* Input Panel */}
        <Card className="glass-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Parametros</CardTitle>
            <CardDescription>Configura los datos de entrada del metodo</CardDescription>
          </CardHeader>
          <CardContent>{inputPanel}</CardContent>
        </Card>

        {/* Graph and Results */}
        <div className="space-y-4">
          {/* Graph Panel */}
          <Card className="glass-card overflow-hidden">
            <CardContent className="p-0">
              <div className={cn(isLoading && "opacity-50 transition-opacity")}>
                {graphPanel}
              </div>
            </CardContent>
          </Card>

          {/* Results Panel */}
          {resultsPanel}
        </div>
      </div>
    </div>
  );
}
