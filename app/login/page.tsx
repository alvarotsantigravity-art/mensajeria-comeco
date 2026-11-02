import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthShell eyebrow="Comeco Gráfico · Mensajería" title={<>Envía en segundos.</>} showcase>
      <Suspense>
        <LoginParams searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function LoginParams({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "";
  const inactive = params.error === "inactive";
  return <LoginForm next={next} inactive={inactive} expired={params.sesion === "caducada"} />;
}
