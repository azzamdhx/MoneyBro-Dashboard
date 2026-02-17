"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatMonthYear } from "@/lib/utils/format";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

interface MonthPickerProps {
  value: string; // Format: YYYY-MM
  onChange: (value: string) => void;
  disabledMonths?: Set<string>;
  disablePast?: boolean;
  className?: string;
}

export function MonthPicker({ value, onChange, disabledMonths = new Set(), disablePast = false, className }: MonthPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [viewYear, setViewYear] = React.useState(() => {
    return value ? parseInt(value.slice(0, 4)) : new Date().getFullYear();
  });

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const selectedMonth = value ? parseInt(value.slice(5, 7)) - 1 : -1;
  const selectedYear = value ? parseInt(value.slice(0, 4)) : -1;

  const handleMonthSelect = (monthIndex: number) => {
    const newValue = `${viewYear}-${String(monthIndex + 1).padStart(2, "0")}`;
    if (!disabledMonths.has(newValue)) {
      onChange(newValue);
      setOpen(false);
    }
  };

  const formatDisplayValue = (val: string) => {
    if (!val) return "Pilih bulan";
    return formatMonthYear(`${val}-01`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("justify-start text-left font-normal", className)}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {formatDisplayValue(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="space-y-3">
          {/* Year Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewYear(viewYear - 1)}
              disabled={disablePast && viewYear <= currentYear}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{viewYear}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewYear(viewYear + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Month Grid */}
          <div className="grid grid-cols-4 gap-2">
            {MONTHS.map((month, index) => {
              const monthValue = `${viewYear}-${String(index + 1).padStart(2, "0")}`;
              const isPast = disablePast && (viewYear < currentYear || (viewYear === currentYear && index < currentMonth));
              const isDisabled = isPast || disabledMonths.has(monthValue);
              const isSelected = selectedYear === viewYear && selectedMonth === index;

              return (
                <Button
                  key={month}
                  variant={isSelected ? "default" : "ghost"}
                  size="sm"
                  disabled={isDisabled}
                  className={cn(
                    "h-9 w-full text-xs",
                    isDisabled && "opacity-50 cursor-not-allowed line-through"
                  )}
                  onClick={() => handleMonthSelect(index)}
                >
                  {month}
                </Button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-2">
            <span className="line-through">Jan</span>
            <span>= Sudah ada data</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
