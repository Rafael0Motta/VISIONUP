import { cn } from "@/lib/utils";

const STEPS = ["Identificação", "Mensagem", "Contatos", "Confirmação"];

export function WizardSteps({ current }: { current: number }) {
  return (
    <div className="mb-6 flex items-center">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const isCurrent = step === current;
        const isDone = step < current;
        return (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                  isCurrent && "bg-primary text-primary-foreground",
                  isDone && "border border-primary text-primary",
                  !isCurrent && !isDone && "bg-muted text-muted-foreground"
                )}
              >
                {step}
              </span>
              <span
                className={cn(
                  "text-sm",
                  isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
            {step < STEPS.length ? (
              <span className="mx-3 h-px flex-1 bg-border" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
