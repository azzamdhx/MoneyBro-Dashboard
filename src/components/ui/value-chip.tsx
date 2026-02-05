import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ValueChipProps {
  value: number;
  showPercentage?: boolean;
  className?: string;
}

export function ValueChip({ value, showPercentage = false, className }: ValueChipProps) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  
  const Icon = isPositive ? TrendingUp : TrendingDown;
  
  if (isNeutral) {
    return (
      <div className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
        "bg-slate-900/90 text-slate-200 border border-slate-700/50 backdrop-blur-sm",
        className
      )}>
        <span>0%</span>
      </div>
    );
  }
  
  return (
    <div className={cn(
      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm",
      isPositive 
        ? "bg-blue-600/90 text-blue-50 border border-blue-400/50" 
        : "bg-slate-900/90 text-slate-200 border border-slate-700/50",
      className
    )}>
      <Icon className="h-3 w-3" />
      <span>
        {isPositive ? "+" : ""}{showPercentage ? `${value}%` : value}
      </span>
    </div>
  );
}
