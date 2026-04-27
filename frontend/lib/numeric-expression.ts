import { evaluate } from "@/lib/math-parser";

const VARIABLE_PATTERN = /\b[xXyYzZ]\b/;

export function parseNumericExpression(value: string, label: string): number {
  const raw = value.trim();
  if (!raw) {
    throw new Error(`${label} no puede estar vacio`);
  }

  if (VARIABLE_PATTERN.test(raw)) {
    throw new Error(`${label} solo admite constantes y operaciones numericas`);
  }

  const parsed = evaluate(raw, 0);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} no es una expresion numerica valida`);
  }

  return parsed;
}

export function parseNumericExpressionSafe(value: string): number {
  const raw = value.trim();
  if (!raw || VARIABLE_PATTERN.test(raw)) {
    return Number.NaN;
  }

  const parsed = evaluate(raw, 0);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function parseIntegerExpression(value: string, label: string, min = 1): number {
  const parsed = parseNumericExpression(value, label);
  const rounded = Math.round(parsed);

  if (!Number.isFinite(parsed) || Math.abs(parsed - rounded) > 1e-10) {
    throw new Error(`${label} debe ser un entero`);
  }

  if (rounded < min) {
    throw new Error(`${label} debe ser mayor o igual a ${min}`);
  }

  return rounded;
}
