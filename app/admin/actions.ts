"use server";

import { revalidatePath } from "next/cache";
import { getProfessionalContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/server";
import type { BarbershopStatus } from "@/lib/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const VALID: BarbershopStatus[] = ["active", "suspended", "pending"];

async function requireAdmin() {
  const ctx = await getProfessionalContext();
  if (ctx.role !== "platform_admin") return { ...ctx, ok: false as const };
  return { ...ctx, ok: true as const };
}

function slugify(value: string): string {
  const stripped = value
    .normalize("NFD")
    .split("")
    .filter((c) => {
      const code = c.charCodeAt(0);
      return code < 0x0300 || code > 0x036f;
    })
    .join("");
  return stripped
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Slug único a nivel de toda la plataforma (barbershops.slug es unique global).
async function uniqueShopSlug(admin: any, base: string): Promise<string> {
  const root = slugify(base) || "barberia";
  const { data } = await admin
    .from("barbershops")
    .select("slug")
    .like("slug", `${root}%`);
  const taken = new Set((data ?? []).map((r: { slug: string }) => r.slug));
  if (!taken.has(root)) return root;
  let n = 2;
  while (taken.has(`${root}-${n}`)) n++;
  return `${root}-${n}`;
}

export async function setBarbershopStatusAction(
  id: string,
  status: BarbershopStatus
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { ok: false, error: "No autorizado." };
  if (!VALID.includes(status)) return { ok: false, error: "Estado inválido." };

  const { data, error } = await ctx.supabase
    .from("barbershops")
    .update({ status })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "No se aplicó el cambio." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/barberias");
  revalidatePath("/", "layout"); // el catálogo público depende del estado
  return { ok: true };
}

// Alta completa de una barbería + su dueño.
// El admin crea la barbería y genera las credenciales del dueño (vía
// service_role), dejándolo asignado a esa única barbería. Incluye horarios
// por defecto para que la reserva funcione de inmediato.
export async function createBarbershopWithOwnerAction(input: {
  shopName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
}): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { ok: false, error: "No autorizado." };

  const shopName = input.shopName.trim();
  const ownerName = input.ownerName.trim();
  const email = input.ownerEmail.trim().toLowerCase();

  if (shopName.length < 2) {
    return { ok: false, error: "El nombre de la barbería es obligatorio." };
  }
  if (ownerName.length < 2) {
    return { ok: false, error: "El nombre del dueño es obligatorio." };
  }
  if (!email.includes("@")) {
    return { ok: false, error: "Correo del dueño inválido." };
  }
  if (input.ownerPassword.length < 6) {
    return { ok: false, error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const admin = createAdminClient();
  const slug = await uniqueShopSlug(admin, shopName);

  // 1) Crear la barbería (activa, plan de prueba).
  const { data: shop, error: shopErr } = await admin
    .from("barbershops")
    .insert({ slug, name: shopName, status: "active", plan: "trial" })
    .select("id")
    .single();
  if (shopErr || !shop) {
    return {
      ok: false,
      error: shopErr?.message ?? "No se pudo crear la barbería.",
    };
  }

  // 2) Horarios por defecto (Lun–Sáb 9–20, Dom 10–18).
  const hours = [1, 2, 3, 4, 5, 6].map((d) => ({
    barbershop_id: shop.id,
    day_of_week: d,
    open_time: "09:00",
    close_time: "20:00",
    is_closed: false,
  }));
  hours.push({
    barbershop_id: shop.id,
    day_of_week: 0,
    open_time: "10:00",
    close_time: "18:00",
    is_closed: false,
  });
  await admin.from("business_hours").insert(hours);

  // 3) Crear el usuario dueño (el trigger crea su profile desde la metadata).
  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email,
    password: input.ownerPassword,
    email_confirm: true,
    user_metadata: {
      role: "owner",
      barbershop_id: shop.id,
      full_name: ownerName,
    },
  });
  if (userErr || !created?.user) {
    // Rollback de la barbería para no dejarla huérfana sin dueño.
    await admin.from("barbershops").delete().eq("id", shop.id);
    return {
      ok: false,
      error: userErr?.message ?? "No se pudo crear el usuario del dueño.",
    };
  }

  // 4) Asignar al dueño como owner_id de la barbería.
  const { error: linkErr } = await admin
    .from("barbershops")
    .update({ owner_id: created.user.id })
    .eq("id", shop.id);
  if (linkErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    await admin.from("barbershops").delete().eq("id", shop.id);
    return { ok: false, error: linkErr.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/barberias");
  revalidatePath("/", "layout");
  return { ok: true };
}
