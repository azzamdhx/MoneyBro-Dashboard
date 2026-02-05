import { cn } from "@/lib/utils";

interface HighlightCardProps {
  className?: string;
  gradientColor?: string;
  balanceLabel?: React.ReactNode;
  balanceValue?: React.ReactNode;
  chip?: React.ReactNode;
  breakdown?: React.ReactNode;
}

export function HighlightCard({
  className,
  gradientColor = "bg-purple-400",
  balanceLabel,
  balanceValue,
  chip,
  breakdown,
}: HighlightCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-solid border-white/40",
        className
      )}
    >
      {/* Background Layer with Gradient */}
      <div className={cn("absolute inset-0", gradientColor)} />

      {/* Content Layer */}
      <div className="relative w-full h-full p-3 sm:p-4 flex flex-col gap-3">
        {/* Container 1: Balance + Chip (Liquid Glass) */}
        <div className="p-3 sm:p-4 flex items-start justify-between rounded-xl backdrop-blur-xl bg-white/10 border border-white/20 shadow-lg">
          <div className="flex flex-col">
            {balanceLabel}
            {balanceValue}
          </div>
          {chip && (
            <div className="flex-shrink-0">
              {chip}
            </div>
          )}
        </div>

        {/* Container 2: Breakdown (No liquid glass) */}
        {breakdown && (
          <div className="px-1">
            {breakdown}
          </div>
        )}
      </div>
    </div>
  );
}
