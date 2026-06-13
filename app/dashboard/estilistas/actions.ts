"use server";

import { revalidatePath } from "next/cache";
import { getProfessionalContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/server";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function requireOwner() {
  const ctx = await getProfessionalContext();
  if (ctx.role !== "owner" || !ctx.barbershopId) {
    return { ...ctx, ok: false as const };
  }
  return { ...ctx, ok: true as const };
}

function revalidate() {
  revalidatePath("/dashboard/estilistas");
  revalidatePath("/b", "layout");
}

// Convierte un nombre en slug, quitando acentos por rango de código (combining
// marks U+0300–U+036F) sin depender de literales de regex frágiles.
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

async function uniqueSlug(
  supabase: any,
  barbershopId: string,
  base: string
): Promise<string> {
  const root = slugify(base) || "estilista";
  const { data } = await supabase
    .from("stylists")
    .select("slug")
    .eq("barbershop_id", barbershopId)
    .like("slug", `${root}%`);
  const taken = new Set((data ?? []).map((r: { slug: string }) => r.slug));
  if (!taken.has(root)) return root;
  let n = 2;
  while (taken.has(`${root}-${n}`)) n++;
  return `${root}-${n}`;
}

export async function createStylistAction(input: {
  name: string;
  title: string;
  bio: string;
}): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (!ctx.ok) return { ok: false, error: "No autorizado." };
  if (!input.name.trim()) return { ok: false, error: "El nombre es obligatorio." };

  const slug = await uniqueSlug(ctx.supabase, ctx.barbershopId!, input.name);

  const { error } = await ctx.supabase.from("stylists").insert({
    barbershop_id: ctx.barbershopId,
    slug,
    name: input.name.trim(),
    title: input.title.trim() || null,
    bio: input.bio.trim() || null,
    is_active: true,
  });
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function updateStylistAction(
  id: string,
  input: { name: string; title: string; bio: string; isActive: boolean }
): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (!ctx.ok) return { ok: false, error: "No autorizado." };
  if (!input.name.trim()) return { ok: false, error: "El nombre es obligatorio." };

  const { error } = await ctx.supabase
    .from("stylists")
    .update({
      name: input.name.trim(),
      title: input.title.trim() || null,
      bio: input.bio.trim() || null,
      is_active: input.isActive,
    })
    .eq("id", id)
    .eq("barbershop_id", ctx.barbershopId);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

// Alta de credenciales de acceso para un estilista.
// Crea el usuario en Supabase Auth usando la SERVICE ROLE (solo servidor) y lo
// vincula al estilista. El trigger handle_new_user crea su profile desde la
// metadata (role=stylist, barbershop_id).
export async function createStylistCredentialsAction(
  stylistId: string,
  input: { email: string; password: string }
): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (!ctx.ok) return { ok: false, error: "No autorizado." };

  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Correo inválido." };
  }
  if (input.password.length < 6) {
    return { ok: false, error: "La contraseña debe tener al menos 6 caracteres." };
  }

  // Verifica que el estilista pertenezca a la barbería del dueño y no tenga ya cuenta.
  const { data: stylist } = await ctx.supabase
    .from("stylists")
    .select("id, name, user_id, barbershop_id")
    .eq("id", stylistId)
    .eq("barbershop_id", ctx.barbershopId)
    .maybeSingle<{
      id: string;
      name: string;
      user_id: string | null;
      barbershop_id: string;
    }>();

  if (!stylist) return { ok: false, error: "Estilista no encontrado." };
  if (stylist.user_id) {
    return { ok: false, error: "Este estilista ya tiene credenciales." };
  }

  const admin = createAdminClient();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      role: "stylist",
      barbershop_id: ctx.barbershopId,
      full_name: stylist.name,
    },
  });

  if (createErr || !created?.user) {
    return {
      ok: false,
      error: createErr?.message ?? "No se pudo crear el usuario.",
    };
  }

  // Vincula el estilista al usuario recién creado.
  const { error: linkErr } = await admin
    .from("stylists")
    .update({ user_id: created.user.id })
    .eq("id", stylistId);

  if (linkErr) {
    // Rollback del usuario para no dejar huérfanos.
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: linkErr.message };
  }

  revalidate();
  return { ok: true };
}
