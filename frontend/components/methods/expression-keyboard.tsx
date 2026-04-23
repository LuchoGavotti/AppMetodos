"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ExpressionKeyboardProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  className?: string;
  showY?: boolean;
  showZ?: boolean;
}

interface KeyDef {
  label: string;
  snippet: string;
}

const BASE_KEYS: KeyDef[] = [
  { label: "sqrt", snippet: "sqrt(|)" },
  { label: "^", snippet: "^|" },
  { label: "^2", snippet: "^2" },
  { label: "exp", snippet: "exp(|)" },
  { label: "log", snippet: "log(|)" },
  { label: "ln", snippet: "ln(|)" },
  { label: "pi", snippet: "pi" },
  { label: "e", snippet: "e" },
  { label: "sin", snippet: "sin(|)" },
  { label: "cos", snippet: "cos(|)" },
  { label: "tan", snippet: "tan(|)" },
  { label: "abs", snippet: "abs(|)" },
  { label: "(", snippet: "(" },
  { label: ")", snippet: ")" },
  { label: "+", snippet: "+" },
  { label: "-", snippet: "-" },
  { label: "*", snippet: "*" },
  { label: "/", snippet: "/" },
];

function insertSnippetAtCursor(
  current: string,
  snippet: string,
  start: number,
  end: number
): { nextValue: string; nextCursor: number } {
  const cursorMarkerIndex = snippet.indexOf("|");
  const sanitized = snippet.replace("|", "");

  const before = current.slice(0, start);
  const after = current.slice(end);
  const nextValue = before + sanitized + after;

  const nextCursor =
    cursorMarkerIndex >= 0
      ? before.length + cursorMarkerIndex
      : before.length + sanitized.length;

  return { nextValue, nextCursor };
}

export function ExpressionKeyboard({
  inputRef,
  setValue,
  className,
  showY = false,
  showZ = false,
}: ExpressionKeyboardProps) {
  const insert = (snippet: string) => {
    const input = inputRef.current;
    if (!input) {
      setValue((prev) => prev + snippet.replace("|", ""));
      return;
    }

    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;

    const { nextValue, nextCursor } = insertSnippetAtCursor(
      input.value,
      snippet,
      start,
      end
    );

    setValue(nextValue);

    requestAnimationFrame(() => {
      const target = inputRef.current;
      if (!target) return;
      target.focus();
      target.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const variableKeys: KeyDef[] = [{ label: "x", snippet: "x" }];
  if (showY) variableKeys.push({ label: "y", snippet: "y" });
  if (showZ) variableKeys.push({ label: "z", snippet: "z" });

  const keys = [...variableKeys, ...BASE_KEYS];

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs text-muted-foreground">Teclado matematico rapido</p>
      <div className="flex flex-wrap gap-1.5">
        {keys.map((key) => (
          <Button
            key={`${key.label}-${key.snippet}`}
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => insert(key.snippet)}
          >
            {key.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
