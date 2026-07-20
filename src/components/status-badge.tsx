import { cn } from "@/lib/utils";

type StatusTone = "warning" | "success" | "destructive" | "neutral";

const TONE_CLASSES: Record<StatusTone, string> = {
  warning: "bg-warning/15 text-warning-foreground border-warning/30",
  success: "bg-success/15 text-success border-success/30",
  destructive: "bg-destructive/10 text-destructive border-destructive/25",
  neutral: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ tone, children }: { tone: StatusTone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASSES[tone]
      )}
    >
      {children}
    </span>
  );
}
