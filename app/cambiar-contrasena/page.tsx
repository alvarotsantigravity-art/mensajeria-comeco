import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Skeleton } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/dal";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "Cambiar contraseña" };

export default function ChangePasswordPage() {
  return (
    <AuthShell eyebrow="Primer acceso" title={<>Elige tu contraseña.</>}>
      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <ChangePassword />
      </Suspense>
    </AuthShell>
  );
}

async function ChangePassword() {
  const profile = await requireUser({ allowPasswordChange: true });
  return <ChangePasswordForm email={profile.email} />;
}
