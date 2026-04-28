"use client";

import * as React from "react";
import { Header } from "@/components/layout/header";
import { MethodNav, type MethodId } from "@/components/layout/method-nav";
import { BisectionMethod } from "@/components/methods/bisection-method";
import { FixedPointMethod } from "@/components/methods/fixed-point-method";
import { AitkenMethod } from "@/components/methods/aitken-method";
import { IntegrationMethod } from "@/components/methods/integration-method";
import { NewtonRaphsonMethod } from "@/components/methods/newton-raphson-method";
import { InterpolationMethod } from "@/components/methods/interpolation-method";
import { DerivativeMethod } from "@/components/methods/derivative-method";
import { MonteCarloMethod } from "@/components/methods/monte-carlo-method";
import { DifferentialEquationMethod } from "@/components/methods/differential-equation-method";
import { AnalyticalSolverMethod } from "@/components/methods/analytical-solver-method";

export default function HomePage() {
  const [activeMethod, setActiveMethod] = React.useState<MethodId>("integration");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-4 space-y-4">
        <MethodNav activeMethod={activeMethod} onMethodChange={setActiveMethod} />
        {activeMethod === "bisection" && <BisectionMethod />}
        {activeMethod === "fixed-point" && <FixedPointMethod />}
        {activeMethod === "aitken" && <AitkenMethod />}
        {activeMethod === "integration" && <IntegrationMethod />}
        {activeMethod === "newton-raphson" && <NewtonRaphsonMethod />}
        {activeMethod === "interpolation" && <InterpolationMethod />}
        {activeMethod === "derivative" && <DerivativeMethod />}
        {activeMethod === "monte-carlo" && <MonteCarloMethod />}
        {activeMethod === "differential-equation" && <DifferentialEquationMethod />}
        {activeMethod === "analytical-solver" && <AnalyticalSolverMethod />}
      </main>
    </div>
  );
}
