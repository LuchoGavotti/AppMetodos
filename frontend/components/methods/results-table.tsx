"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Column {
  key: string;
  label: string;
  format?: (value: number | string) => string;
}

interface ResultsTableProps {
  title?: string;
  columns: Column[];
  data: Record<string, number | string>[];
  highlightLast?: boolean;
  maxHeight?: number;
  className?: string;
}

function formatNumber(value: number | string, precision = 8): string {
  if (typeof value === "string") return value;
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(precision);
}

export function ResultsTable({
  title = "Resultados de Iteraciones",
  columns,
  data,
  highlightLast = true,
  maxHeight = 300,
  className,
}: ResultsTableProps) {
  const [expanded, setExpanded] = React.useState(false);
  const displayData = expanded ? data : data.slice(0, 5);
  const hasMore = data.length > 5;

  const handleExportCSV = () => {
    const headers = columns.map((col) => col.label).join(",");
    const rows = data
      .map((row) =>
        columns.map((col) => formatNumber(row[col.key])).join(",")
      )
      .join("\n");
    const csv = `${headers}\n${rows}`;

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resultados.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (data.length === 0) {
    return null;
  }

  return (
    <Card className={cn("glass-card", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExportCSV}
          className="h-8 gap-1"
        >
          <Download className="size-3.5" />
          <span className="hidden sm:inline">Exportar</span>
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        <div
          className="overflow-auto"
          style={{ maxHeight: expanded ? maxHeight : undefined }}
        >
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.key} className="text-xs">
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayData.map((row, i) => (
                <TableRow
                  key={i}
                  className={cn(
                    highlightLast &&
                      i === data.length - 1 &&
                      "bg-primary/10 font-medium"
                  )}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className="font-mono text-xs py-1.5">
                      {col.format
                        ? col.format(row[col.key])
                        : formatNumber(row[col.key])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="mt-2 w-full h-8 text-xs"
          >
            {expanded ? (
              <>
                <ChevronUp className="size-3.5 mr-1" />
                Ver menos
              </>
            ) : (
              <>
                <ChevronDown className="size-3.5 mr-1" />
                Ver las {data.length} iteraciones
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
