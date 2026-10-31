import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin, type Profile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Badge, SectionHeading, Skeleton } from "@/components/ui/misc";
import { Table, Td, Th } from "@/components/ui/table";
import { CreateUserForm, UserRowActions } from "./user-forms";

export const metadata: Metadata = { title: "Usuarios" };

export default function UsersPage() {
  return (
    <div className="grid gap-10">
      <SectionHeading
        index="Configuración"
        title="Usuarios"
        description="Da de alta a los compañeros con una contraseña temporal. La app no envía emails: comunícasela tú y se les pedirá cambiarla al entrar."
      />
      <Suspense fallback={<Skeleton className="h-80 w-full" />}>
        <Users />
      </Suspense>
    </div>
  );
}

async function Users() {
  const me = await requireAdmin();
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, active, must_change_password")
    .order("created_at", { ascending: true })
    .returns<Pick<Profile, "id" | "email" | "full_name" | "role" | "active" | "must_change_password">[]>();

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
      <Table>
        <thead>
          <tr>
            <Th>Nombre</Th>
            <Th>Email</Th>
            <Th>Estado</Th>
            <Th className="text-right">Acciones</Th>
          </tr>
        </thead>
        <tbody>
          {(users ?? []).map((user) => (
            <tr key={user.id}>
              <Td className="font-medium">
                {user.full_name || <span className="text-muted">Sin nombre</span>}
                {user.role === "admin" ? <Badge tone="accent" className="ml-2">Admin</Badge> : null}
              </Td>
              <Td className="font-mono text-xs">{user.email}</Td>
              <Td>
                {!user.active ? (
                  <Badge tone="urgent">Desactivado</Badge>
                ) : user.must_change_password ? (
                  <Badge tone="kraft">Contraseña temporal</Badge>
                ) : (
                  <Badge tone="success">Activo</Badge>
                )}
              </Td>
              <Td className="text-right">
                <UserRowActions userId={user.id} active={user.active} isSelf={user.id === me.id} />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <CreateUserForm />
    </div>
  );
}
