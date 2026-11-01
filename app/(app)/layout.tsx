import Link from "next/link";
import { Suspense } from "react";
import { Package } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/misc";
import { MainNav, NavLinks } from "./main-nav";
import { UserMenu } from "./user-menu";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-6 px-4 sm:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid size-8 place-items-center rounded-full bg-ink text-bg">
              <Package className="size-4" />
            </span>
            <span className="hidden sm:inline">Mensajería</span>
          </Link>
          <Suspense fallback={<NavLinks pathname={null} />}>
            <MainNav />
          </Suspense>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Suspense fallback={<Skeleton className="h-9 w-28 rounded-full" />}>
              <UserMenu />
            </Suspense>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-10 sm:px-8 lg:px-12">
        {children}
      </main>
    </div>
  );
}
