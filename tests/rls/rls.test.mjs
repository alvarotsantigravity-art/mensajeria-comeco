// Pruebas de las políticas RLS contra el proyecto de Supabase de .env.local.
// Crea dos usuarios temporales (@comecografico.com) y lo borra todo al terminar.
// Las solicitudes de prueba usan el año 2000 para no consumir referencias reales.
//   npm run test:rls
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) throw new Error("Faltan variables de Supabase en .env.local");

const opts = { auth: { autoRefreshToken: false, persistSession: false } };
const admin = createClient(url, serviceKey, opts);
const TEST_YEAR_DATE = "2000-01-15";
const tag = randomBytes(4).toString("hex");

async function createTestUser(label) {
  const email = `rls-test-${label}-${tag}@comecografico.com`;
  const password = randomBytes(18).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `RLS ${label}`, must_change_password: false },
  });
  if (error) throw error;
  const client = createClient(url, anonKey, opts);
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, client };
}

let a, b;
const recipientIds = [];
const requestIds = [];

before(async () => {
  a = await createTestUser("a");
  b = await createTestUser("b");
});

after(async () => {
  if (requestIds.length) await admin.from("shipment_requests").delete().in("id", requestIds);
  if (recipientIds.length) await admin.from("recipients").delete().in("id", recipientIds);
  await admin.from("shipment_ref_counters").delete().eq("year", 2000);
  for (const user of [a, b]) if (user) await admin.auth.admin.deleteUser(user.id);
});

async function insertRequest(client, fields = {}) {
  const { data, error } = await client
    .from("shipment_requests")
    .insert({ request_date: TEST_YEAR_DATE, concept: "Prueba RLS", ...fields })
    .select()
    .single();
  if (data) requestIds.push(data.id);
  return { data, error };
}

describe("alta de usuarios", () => {
  test("rechaza emails de otro dominio (trigger en auth.users)", async () => {
    const { error } = await admin.auth.admin.createUser({
      email: `rls-test-${tag}@gmail.com`,
      password: randomBytes(18).toString("base64url"),
      email_confirm: true,
    });
    assert.ok(error, "debería fallar");
  });

  test("un usuario no puede ascenderse a admin", async () => {
    await a.client.from("profiles").update({ role: "admin" }).eq("id", a.id);
    const { data } = await admin.from("profiles").select("role").eq("id", a.id).single();
    assert.equal(data.role, "user");
  });
});

describe("solicitudes", () => {
  let request;

  test("A crea una solicitud con referencia correlativa", async () => {
    const { data, error } = await insertRequest(a.client);
    assert.ifError(error);
    assert.match(data.ref, /^MSJ-2000-\d{4}$/);
    assert.equal(data.requester_id, a.id);
    request = data;
  });

  test("B ve la solicitud de A en el historial", async () => {
    const { data } = await b.client.from("shipment_requests").select("id").eq("id", request.id);
    assert.equal(data.length, 1);
  });

  test("B no puede editar la solicitud de A", async () => {
    const { data } = await b.client
      .from("shipment_requests")
      .update({ concept: "Editado por B" })
      .eq("id", request.id)
      .select();
    assert.equal(data.length, 0);
    const { data: row } = await admin.from("shipment_requests").select("concept").eq("id", request.id).single();
    assert.equal(row.concept, "Prueba RLS");
  });

  test("B no puede borrar la solicitud de A", async () => {
    await b.client.from("shipment_requests").delete().eq("id", request.id);
    const { data } = await admin.from("shipment_requests").select("id").eq("id", request.id);
    assert.equal(data.length, 1);
  });

  test("B no puede crear una solicitud a nombre de A", async () => {
    const { error } = await insertRequest(b.client, { requester_id: a.id });
    assert.ok(error, "debería fallar");
  });

  test("A edita las suyas, pero no cambia la referencia ni el solicitante", async () => {
    const { data, error } = await a.client
      .from("shipment_requests")
      .update({ concept: "Editado por A", ref: "MSJ-HACK", requester_id: b.id })
      .eq("id", request.id)
      .select()
      .single();
    assert.ifError(error);
    assert.equal(data.concept, "Editado por A");
    assert.equal(data.ref, request.ref);
    assert.equal(data.requester_id, a.id);
  });

  test("una caja enviada exige nº de cajas", async () => {
    const { error } = await insertRequest(a.client, { status: "enviada", shipment_type: "caja" });
    assert.ok(error, "debería fallar");
  });
});

describe("libreta compartida", () => {
  let recipient;

  test("A crea un destinatario y B lo ve y lo edita", async () => {
    const { data, error } = await a.client
      .from("recipients")
      .insert({ company_name: `Logística Ñandú Málaga ${tag}`, city: "Málaga" })
      .select()
      .single();
    assert.ifError(error);
    recipientIds.push(data.id);
    recipient = data;

    const { data: edited } = await b.client
      .from("recipients")
      .update({ phone: "952 000 000" })
      .eq("id", recipient.id)
      .select()
      .single();
    assert.equal(edited.phone, "952 000 000");
    assert.equal(edited.updated_by, b.id);
  });

  test("el autocompletado ignora tildes y errores", async () => {
    const { data, error } = await b.client.rpc("search_recipients", { q: `logistica nandu malga ${tag}` });
    assert.ifError(error);
    assert.ok(data.some((r) => r.id === recipient.id));
  });

  test("B no puede falsear las estadísticas de uso ni borrarlo", async () => {
    await b.client.from("recipients").update({ usage_count: 99 }).eq("id", recipient.id);
    await b.client.from("recipients").delete().eq("id", recipient.id);
    const { data } = await admin.from("recipients").select("usage_count").eq("id", recipient.id).single();
    assert.equal(data.usage_count, 0);
  });

  test("enviar una solicitud suma un uso al destinatario", async () => {
    const { data: req } = await insertRequest(a.client, { recipient_id: recipient.id });
    await a.client.from("shipment_requests").update({ status: "enviada" }).eq("id", req.id);
    const { data } = await admin
      .from("recipients")
      .select("usage_count, last_used_at")
      .eq("id", recipient.id)
      .single();
    assert.equal(data.usage_count, 1);
    assert.ok(data.last_used_at);
  });
});

describe("fusionar duplicados", () => {
  test("merge_recipients reasigna solicitudes ajenas, suma usos y borra el duplicado", async () => {
    const insert = async (client, fields) => {
      const { data, error } = await client.from("recipients").insert(fields).select("id").single();
      assert.ifError(error);
      recipientIds.push(data.id);
      return data.id;
    };
    const keep = await insert(a.client, { company_name: `Duplicado ${tag}`, city: "Bilbao" });
    const drop = await insert(b.client, { company_name: `Duplicado ${tag} SL`, phone: "944000000", is_favorite: true });
    await admin.from("recipients").update({ usage_count: 3 }).eq("id", drop);
    const { data: req } = await insertRequest(b.client, { recipient_id: drop });

    const { error } = await a.client.rpc("merge_recipients", { keep_id: keep, drop_id: drop });
    assert.ifError(error);

    const { data: kept } = await admin.from("recipients").select("*").eq("id", keep).single();
    assert.equal(kept.usage_count, 3);
    assert.equal(kept.phone, "944000000");
    assert.equal(kept.city, "Bilbao");
    assert.equal(kept.is_favorite, true);
    const { data: gone } = await admin.from("recipients").select("id").eq("id", drop);
    assert.equal(gone.length, 0);
    const { data: moved } = await admin.from("shipment_requests").select("recipient_id").eq("id", req.id).single();
    assert.equal(moved.recipient_id, keep);
  });

  test("no se fusiona un destinatario consigo mismo", async () => {
    const { error } = await a.client.rpc("merge_recipients", { keep_id: recipientIds[0], drop_id: recipientIds[0] });
    assert.ok(error);
  });
});

describe("buscador, ajustes y accesos", () => {
  test("los usuarios no escriben en la caché del buscador", async () => {
    const { error } = await a.client
      .from("company_search_cache")
      .insert({ query_normalized: `rls ${tag}`, result: {}, provider: "test" });
    assert.ok(error, "debería fallar");
  });

  test("search_usage_stats devuelve contadores y límite", async () => {
    const { data, error } = await a.client.rpc("search_usage_stats");
    assert.ifError(error);
    assert.equal(data.length, 1);
    assert.equal(typeof data[0].daily_limit, "number");
  });

  test("un usuario normal no modifica app_settings", async () => {
    const { data } = await a.client.from("app_settings").update({ search_daily_limit: 999 }).eq("id", true).select();
    assert.equal(data.length, 0);
  });

  test("sin sesión no se lee nada", async () => {
    const anon = createClient(url, anonKey, opts);
    for (const table of ["recipients", "shipment_requests", "profiles", "app_settings"]) {
      const { data } = await anon.from(table).select("*").limit(1);
      assert.equal(data?.length ?? 0, 0, table);
    }
  });

  test("un usuario desactivado deja de leer datos", async () => {
    await admin.from("profiles").update({ active: false }).eq("id", b.id);
    const { data } = await b.client.from("shipment_requests").select("id").in("id", requestIds);
    assert.equal(data.length, 0);
  });
});
