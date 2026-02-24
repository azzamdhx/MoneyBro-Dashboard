"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Paintbrush, X } from "lucide-react";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#f43f5e", "#78716c", "#64748b", "#1e293b",
];

interface ColorPickerProps {
  value: string | null;
  onChange: (color: string | null) => void;
  className?: string;
  disabled?: boolean;
}

export function ColorPicker({ value, onChange, className, disabled }: ColorPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            "flex items-center justify-center rounded-lg border border-border bg-card hover:bg-accent transition-colors",
            "h-10 w-10",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
          style={value ? { backgroundColor: value } : undefined}
        >
          {!value && <Paintbrush className="h-4 w-4 text-muted-foreground" />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start" side="bottom">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Warna Kartu</p>
          <div className="grid grid-cols-5 gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={cn(
                  "h-8 w-8 rounded-full border-2 transition-all hover:scale-110",
                  value === color ? "border-primary ring-2 ring-primary/30" : "border-transparent"
                )}
                style={{ backgroundColor: color }}
                onClick={() => {
                  onChange(color);
                  setOpen(false);
                }}
              />
            ))}
          </div>
          {value && (
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              <X className="h-3 w-3" />
              Hapus warna
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
