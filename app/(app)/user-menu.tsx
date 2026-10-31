import Link from "next/link";
import { LogOut, Settings, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export async function UserMenu() {
  const profile = await requireUser();
  const firstName = profile.full_name.split(" ")[0] || profile.email.split("@")[0];

  return (
    <div className="flex items-center gap-1">
      {profile.role === "admin" ? (
        <Button asChild variant="ghost" size="icon" aria-label="Configuración">
          <Link href="/configuracion/usuarios">
            <Settings />
          </Link>
        </Button>
      ) : null}
      <Button asChild variant="ghost" size="sm">
        <Link href="/perfil">
          <UserRound /> {firstName}
        </Link>
      </Button>
      <form action={signOut}>
        <Button type="submit" variant="ghost" size="icon" aria-label="Cerrar sesión">
          <LogOut />
        </Button>
      </form>
    </div>
  );
}
