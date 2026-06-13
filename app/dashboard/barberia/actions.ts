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

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

function fileExt(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "jpg";
}

function validateImage(file: File | null): string | null {
  if (!file || file.size === 0) return "Archivo inválido.";
  if (!file.type.startsWith("image/")) return "El archivo debe ser una imagen.";
  if (file.size > MAX_IMAGE_BYTES) return "La imagen supera el máximo de 5 MB.";
  return null;
}

// Sube la portada/logo EN EL SERVIDOR (la sesión va adjunta, RLS reconoce al
// dueño). Recibe el archivo por FormData.
export async function uploadShopImageAction(
  field: "cover_url" | "logo_url",
  formData: FormData
): Promise<ActionResult & { url?: string }> {
  const ctx = await requireOwner();
  if (!ctx.ok) return { ok: false, error: "No autorizado." };

  const file = formData.get("file") as File | null;
  const invalid = validateImage(file);
  if (invalid) return { ok: false, error: invalid };

  const kind = field === "logo_url" ? "logo" : "cover";
  const path = `shops/${ctx.barbershopId}/${kind}-${Date.now()}.${fileExt(
    file!.name
  )}`;
  const bytes = await file!.arrayBuffer();
  const admin = createAdminClient();

  const up = await admin.storage
    .from("media")
    .upload(path, bytes, {
      contentType: file!.type || "image/jpeg",
      upsert: true,
    });
  if (up.error) return { ok: false, error: up.error.message };

  const { data: pub } = admin.storage.from("media").getPublicUrl(path);

  const { data: prev } = await ctx.supabase
    .from("barbershops")
    .select(field)
    .eq("id", ctx.barbershopId)
    .maybeSingle<Record<string, string | null>>();

  const { data, error } = await ctx.supabase
    .from("barbershops")
    .update({ [field]: pub.publicUrl })
    .eq("id", ctx.barbershopId)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return {
      ok: false,
      error:
        "No se aplicó el cambio. Verifica que tu usuario sea el owner_id de la barbería.",
    };
  }

  // Limpia la imagen anterior del Storage.
  const oldUrl = prev?.[field];
  if (oldUrl) {
    const marker = "/object/public/media/";
    const idx = oldUrl.indexOf(marker);
    if (idx !== -1) {
      await admin.storage
        .from("media")
        .remove([oldUrl.slice(idx + marker.length)]);
    }
  }

  revalidate();
  return { ok: true, url: pub.publicUrl };
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
