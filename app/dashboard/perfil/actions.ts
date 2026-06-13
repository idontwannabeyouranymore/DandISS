"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const STORAGE_BUCKET = "media";
const PUBLIC_MARKER = `/object/public/${STORAGE_BUCKET}/`;

// Deriva la ruta dentro del bucket a partir de la URL pública.
function storagePathFromUrl(url: string): string | null {
  const idx = url.indexOf(PUBLIC_MARKER);
  if (idx === -1) return null;
  return url.slice(idx + PUBLIC_MARKER.length);
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

function fileExt(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "jpg";
}

// Valida un archivo de imagen recibido por FormData. Devuelve un mensaje de
// error o null si está bien.
function validateImage(file: File | null): string | null {
  if (!file || file.size === 0) return "Archivo inválido.";
  if (!file.type.startsWith("image/")) return "El archivo debe ser una imagen.";
  if (file.size > MAX_IMAGE_BYTES) return "La imagen supera el máximo de 5 MB.";
  return null;
}

async function getCurrentStylist() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, stylist: null as null | { id: string } };

  const { data } = await supabase
    .from("stylists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string }>();

  return { supabase, stylist: data };
}

function revalidateAll() {
  revalidatePath("/dashboard/perfil");
  // El perfil público también cambia.
  revalidatePath("/b", "layout");
}

export async function updateProfileAction(fields: {
  name: string;
  title: string;
  bio: string;
}): Promise<ActionResult> {
  if (!fields.name.trim()) {
    return { ok: false, error: "El nombre es obligatorio." };
  }
  const { supabase, stylist } = await getCurrentStylist();
  if (!stylist) return { ok: false, error: "No se encontró tu perfil." };

  const { error } = await supabase
    .from("stylists")
    .update({
      name: fields.name.trim(),
      title: fields.title.trim() || null,
      bio: fields.bio.trim() || null,
    })
    .eq("id", stylist.id);

  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}

// Sube la foto de perfil EN EL SERVIDOR (la sesión va siempre adjunta, así que
// la RLS de Storage reconoce al estilista). Recibe el archivo por FormData.
export async function uploadStylistPhotoAction(
  formData: FormData
): Promise<ActionResult & { url?: string }> {
  const { supabase, stylist } = await getCurrentStylist();
  if (!stylist) return { ok: false, error: "No se encontró tu perfil." };

  const file = formData.get("file") as File | null;
  const invalid = validateImage(file);
  if (invalid) return { ok: false, error: invalid };

  const path = `stylists/${stylist.id}/avatar-${Date.now()}.${fileExt(file!.name)}`;
  const bytes = await file!.arrayBuffer();

  const up = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, bytes, {
      contentType: file!.type || "image/jpeg",
      upsert: true,
    });
  if (up.error) return { ok: false, error: up.error.message };

  const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

  const { data: prev } = await supabase
    .from("stylists")
    .select("photo_url")
    .eq("id", stylist.id)
    .maybeSingle<{ photo_url: string | null }>();

  const { error } = await supabase
    .from("stylists")
    .update({ photo_url: pub.publicUrl })
    .eq("id", stylist.id);
  if (error) return { ok: false, error: error.message };

  if (prev?.photo_url) {
    const oldPath = storagePathFromUrl(prev.photo_url);
    if (oldPath) await supabase.storage.from(STORAGE_BUCKET).remove([oldPath]);
  }

  revalidateAll();
  return { ok: true, url: pub.publicUrl };
}

// Sube una imagen de galería EN EL SERVIDOR. Recibe el archivo por FormData.
export async function uploadGalleryImageAction(
  formData: FormData
): Promise<ActionResult> {
  const { supabase, stylist } = await getCurrentStylist();
  if (!stylist) return { ok: false, error: "No se encontró tu perfil." };

  const file = formData.get("file") as File | null;
  const invalid = validateImage(file);
  if (invalid) return { ok: false, error: invalid };

  const path = `gallery/${stylist.id}/${crypto.randomUUID()}.${fileExt(file!.name)}`;
  const bytes = await file!.arrayBuffer();

  const up = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, bytes, { contentType: file!.type || "image/jpeg" });
  if (up.error) return { ok: false, error: up.error.message };

  const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

  const { count } = await supabase
    .from("stylist_gallery")
    .select("id", { count: "exact", head: true })
    .eq("stylist_id", stylist.id);

  const { error } = await supabase.from("stylist_gallery").insert({
    stylist_id: stylist.id,
    image_url: pub.publicUrl,
    caption: null,
    sort_order: count ?? 0,
  });
  if (error) return { ok: false, error: error.message };

  revalidateAll();
  return { ok: true };
}

export async function deleteGalleryImageAction(
  id: string
): Promise<ActionResult> {
  const { supabase, stylist } = await getCurrentStylist();
  if (!stylist) return { ok: false, error: "No se encontró tu perfil." };

  const { data: row } = await supabase
    .from("stylist_gallery")
    .select("image_url")
    .eq("id", id)
    .maybeSingle<{ image_url: string }>();

  const { error } = await supabase
    .from("stylist_gallery")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  if (row?.image_url) {
    const path = storagePathFromUrl(row.image_url);
    if (path) await supabase.storage.from(STORAGE_BUCKET).remove([path]);
  }

  revalidateAll();
  return { ok: true };
}

export async function addSocialLinkAction(
  platform: string,
  url: string
): Promise<ActionResult> {
  if (!platform.trim() || !url.trim()) {
    return { ok: false, error: "Plataforma y URL son obligatorias." };
  }
  const { supabase, stylist } = await getCurrentStylist();
  if (!stylist) return { ok: false, error: "No se encontró tu perfil." };

  const { error } = await supabase.from("social_links").insert({
    stylist_id: stylist.id,
    platform: platform.trim().toLowerCase(),
    url: url.trim(),
  });

  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}

export async function deleteSocialLinkAction(
  id: string
): Promise<ActionResult> {
  const { supabase, stylist } = await getCurrentStylist();
  if (!stylist) return { ok: false, error: "No se encontró tu perfil." };

  const { error } = await supabase.from("social_links").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}
