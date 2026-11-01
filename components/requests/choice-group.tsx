import { Check } from "lucide-react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { cn } from "@/lib/utils";

/** Radios de selección única con aspecto de tarjeta (urgencia, ámbito, transporte, tipo). */
export function ChoiceGroup({
  legend,
  name,
  options,
  registration,
  error,
  className,
}: {
  legend: string;
  name: string;
  options: { value: string; label: string; hint?: string }[];
  registration: UseFormRegisterReturn;
  error?: string;
  className?: string;
}) {
  const errorId = `${name}-error`;
  return (
    <fieldset className={cn("grid gap-2", className)} aria-describedby={error ? errorId : undefined}>
      <legend className="mb-2 text-[13px] font-medium tracking-tight text-ink">{legend}</legend>
      <div className="grid gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "group flex cursor-pointer items-center gap-3 rounded-md border border-line bg-surface px-3.5 py-2.5 text-sm transition-colors",
              "hover:border-ink/30 has-[:checked]:border-accent has-[:checked]:bg-accent/5",
              "has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-ring/40",
              "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-70",
              error && "border-urgent/60",
            )}
          >
            <input type="radio" value={option.value} className="peer sr-only" {...registration} />
            <span
              aria-hidden
              className="grid size-4 shrink-0 place-items-center rounded-full border border-line bg-surface peer-checked:border-accent peer-checked:bg-accent"
            >
              <Check className="size-3 text-white opacity-0 group-has-[:checked]:opacity-100" strokeWidth={3} />
            </span>
            <span className="grid">
              <span className="font-medium">{option.label}</span>
              {option.hint ? <span className="text-xs text-muted">{option.hint}</span> : null}
            </span>
          </label>
        ))}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-[13px] text-urgent">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
