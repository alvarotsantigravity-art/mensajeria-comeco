import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-md border border-line bg-surface px-3.5 text-ink placeholder:text-muted/70 transition-[border-color,box-shadow] duration-200 outline-none focus:border-accent focus:ring-4 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-urgent aria-invalid:focus:ring-urgent/20";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(fieldBase, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(fieldBase, "min-h-28 py-3", className)} {...props} />;
}
