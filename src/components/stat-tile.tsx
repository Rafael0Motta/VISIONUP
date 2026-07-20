import Link from "next/link";
import { cn } from "@/lib/utils";
import { InfoTooltip } from "@/components/info-tooltip";

export function StatTile({
  label,
  value,
  tone = "neutral",
  href,
  active = false,
  info,
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "warning" | "success" | "destructive";
  /** Quando definido, o tile vira um link (drill-down de detalhes). */
  href?: string;
  /** Destaca o tile como o filtro/detalhe atualmente selecionado. */
  active?: boolean;
  /** Explicação de como o número é calculado/coletado, exibida em um tooltip. */
  info?: string;
}) {
  const toneClass = {
    neutral: "text-foreground",
    warning: "text-warning-foreground",
    success: "text-success",
    destructive: "text-destructive",
  }[tone];

  return (
    <div
      className={cn(
        "relative rounded-lg border bg-card p-4",
        href && "transition-colors hover:border-primary/40 hover:bg-accent/10",
        active && "border-primary bg-accent/10"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        {info ? (
          <span className="relative z-10">
            <InfoTooltip text={info} />
          </span>
        ) : null}
      </div>
      <p className={cn("mt-1 text-2xl font-semibold", toneClass)}>{value}</p>
      {href ? (
        <Link href={href} className="absolute inset-0" aria-label={label} />
      ) : null}
    </div>
  );
}
