import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("rounded-xl border border-line bg-surface p-6", className)} {...props} />
  );
}

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-surface-2 text-muted",
        accent: "bg-accent-soft text-accent",
        urgent: "bg-urgent/12 text-urgent",
        success: "bg-success/12 text-success",
        kraft: "bg-kraft/20 text-[color-mix(in_oklab,var(--kraft)_60%,var(--ink))]",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export function Separator({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-line", className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-surface-2", className)} />;
}

/** Small mono numeral + title, the "01 Solicitante" pattern from §6.2. */
export function SectionHeading({
  index,
  title,
  description,
  className,
}: {
  index?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      {index ? <span className="font-mono text-xs text-muted">{index}</span> : null}
      <h2 className="text-title font-semibold">{title}</h2>
      {description ? <p className="max-w-prose text-muted">{description}</p> : null}
    </div>
  );
}

const alertVariants = cva("rounded-lg border px-4 py-3 text-sm", {
  variants: {
    tone: {
      info: "border-accent/30 bg-accent-soft text-ink",
      error: "border-urgent/30 bg-urgent/8 text-ink",
      success: "border-success/30 bg-success/8 text-ink",
    },
  },
  defaultVariants: { tone: "info" },
});

export function Alert({
  className,
  tone,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div role="status" className={cn(alertVariants({ tone }), className)} {...props} />;
}
