import { Target } from "lucide-react";
import { cn } from "@/lib/utils";

export function FocusBrand({ inverse = false, compact = false, className }: { inverse?: boolean; compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="brand-mark flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white">
        <Target className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden="true" />
      </span>
      {!compact && (
        <span className={cn("text-[1.0625rem] font-semibold tracking-[-0.03em]", inverse ? "text-white" : "text-[#10152d]")}>
          Focus<span className={inverse ? "text-[#91a0ff]" : "text-[#4054e8]"}>CRM</span>
        </span>
      )}
    </span>
  );
}
