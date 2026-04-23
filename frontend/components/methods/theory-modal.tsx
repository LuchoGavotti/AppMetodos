"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import "katex/dist/katex.min.css";

// Dynamic import to avoid SSR issues with KaTeX
const InlineMath = React.lazy(() =>
  import("react-katex").then((mod) => ({ default: mod.InlineMath }))
);
const BlockMath = React.lazy(() =>
  import("react-katex").then((mod) => ({ default: mod.BlockMath }))
);

interface Formula {
  label: string;
  latex: string;
  description?: string;
}

interface TheoryModalProps {
  title: string;
  description: string;
  formulas: Formula[];
  className?: string;
  triggerClassName?: string;
}

export function TheoryModal({
  title,
  description,
  formulas,
  className,
  triggerClassName,
}: TheoryModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-1.5", triggerClassName)}
        >
          <BookOpen className="size-3.5" />
          Teoria
        </Button>
      </DialogTrigger>
      <DialogContent className={cn("max-w-2xl max-h-[85vh] overflow-auto", className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 pt-4">
          <React.Suspense
            fallback={
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                Cargando formulas...
              </div>
            }
          >
            {formulas.map((formula, i) => (
              <div key={i} className="space-y-2">
                <h4 className="font-medium text-sm">{formula.label}</h4>
                <div className="rounded-lg bg-muted/50 p-4 overflow-x-auto">
                  <BlockMath math={formula.latex} />
                </div>
                {formula.description && (
                  <p className="text-sm text-muted-foreground">
                    {formula.description}
                  </p>
                )}
              </div>
            ))}
          </React.Suspense>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LaTeX({
  math,
  block = false,
  className,
}: {
  math: string;
  block?: boolean;
  className?: string;
}) {
  return (
    <React.Suspense
      fallback={<span className="text-muted-foreground">...</span>}
    >
      {block ? (
        <div className={cn("overflow-x-auto", className)}>
          <BlockMath math={math} />
        </div>
      ) : (
        <span className={className}>
          <InlineMath math={math} />
        </span>
      )}
    </React.Suspense>
  );
}
