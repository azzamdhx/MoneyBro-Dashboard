"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Picker } from "emoji-mart";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  className?: string;
  disabled?: boolean;
}

function EmojiPickerPanel({ onSelect }: { onSelect: (emoji: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const picker = new Picker({
      onEmojiSelect: (emoji: { native: string }) => {
        onSelectRef.current(emoji.native);
      },
      theme: "dark",
      previewPosition: "none",
      skinTonePosition: "preview",
      perLine: 7,
      maxFrequentRows: 2,
      emojiSize: 24,
      emojiButtonSize: 36,
      navPosition: "bottom",
      searchPosition: "sticky",
    });

    container.appendChild(picker as unknown as Node);

    return () => {
      container.innerHTML = "";
    };
  }, []);

  return <div ref={containerRef} />;
}

export function EmojiPicker({ value, onChange, className, disabled }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback((emoji: string) => {
    onChange(emoji);
    setOpen(false);
  }, [onChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            "flex items-center justify-center rounded-lg border border-border bg-card hover:bg-accent transition-colors",
            "h-10 w-10 text-xl",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
        >
          {value || "😀"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-0" align="start" side="bottom">
        <EmojiPickerPanel onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  );
}
