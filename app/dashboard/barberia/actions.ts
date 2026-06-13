"use server";

import { revalidatePath } from "next/cache";
import { getProfessionalContext } from "@/lib/owner";

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
  revalidatePath("/dashboard/barberia");
  revalidatePath("/b", "layout");
  revalidatePath("/");
}

export async function updateShopAction(input: {
  name: string;
  tagline: string;
  about: string;
  address: string;
}): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (!ctx.ok) return { ok: false, error: "No autorizado." };
  if (!input.name.trim()) return { ok: false, error: "El nombre es obligatorio." };

  const { data, error } = await ctx.supabase
    .from("barbershops")
    .update({
      name: input.name.trim(),
      tagline: input.tagline.trim() || null,
      about: input.about.trim() || null,
      address: input.address.trim() || null,
    })
    .eq("id", ctx.barbershopId)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return {
      ok: false,
      error:
        "No se aplicó el cambio. Verifica que tu usuario sea el owner_id de la barbería (revisa crear-dueno-demo.sql).",
    };
  }
  revalidate();
  return { ok: true };
}

export async function updateShopImageAction(
  field: "cover_url" | "logo_url",
  url: string
): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (!ctx.ok) return { ok: false, error: "No autorizado." };

  const { data: prev } = await ctx.supabase
    .from("barbershops")
    .select(field)
    .eq("id", ctx.barbershopId)
    .maybeSingle<Record<string, string | null>>();

  const { error } = await ctx.supabase
    .from("barbershops")
    .update({ [field]: url })
    .eq("id", ctx.barbershopId);
  if (error) return { ok: false, error: error.message };

  // Limpia la imagen anterior del Storage.
  const oldUrl = prev?.[field];
  if (oldUrl) {
    const marker = "/object/public/media/";
    const idx = oldUrl.indexOf(marker);
    if (idx !== -1) {
      const path = oldUrl.slice(idx + marker.length);
      await ctx.supabase.storage.from("media").remove([path]);
    }
  }

  revalidate();
  return { ok: true };
}

export interface HourInput {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

export async function updateHoursAction(
  hours: HourInput[]
): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (!ctx.ok) return { ok: false, error: "No autorizado." };

  const rows = hours.map((h) => ({
    barbershop_id: ctx.barbershopId,
    day_of_week: h.day_of_week,
    open_time: h.is_closed ? null : h.open_time || null,
    close_time: h.is_closed ? null : h.close_time || null,
    is_closed: h.is_closed,
  }));

  const { error } = await ctx.supabase
    .from("business_hours")
    .upsert(rows, { onConflict: "barbershop_id,day_of_week" });
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}
