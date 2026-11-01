import { Skeleton } from "@/components/ui/misc";

export function EditorSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)] lg:gap-14" aria-busy>
      <div className="grid content-start gap-8">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-20 w-3/4" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
      <Skeleton className="h-[32rem] w-full" />
    </div>
  );
}
