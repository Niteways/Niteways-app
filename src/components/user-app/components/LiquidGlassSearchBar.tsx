import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiquidGlassSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onClear?: () => void;
}

export function LiquidGlassSearchBar({
  value,
  onChange,
  placeholder,
  className,
  onFocus,
  onBlur,
  onClear,
}: LiquidGlassSearchBarProps) {
  return (
    <div
      className={cn(
        "relative rounded-full border border-border/50 bg-background/30 backdrop-blur-xl supports-[backdrop-filter]:bg-background/20 shadow-sm",
        className,
      )}
    >
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        className={cn(
          "w-full bg-transparent py-3 pl-11 pr-10 text-sm text-foreground placeholder:text-muted-foreground",
          "focus:outline-none",
        )}
      />
      {!!value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            onClear?.();
            onChange("");
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
