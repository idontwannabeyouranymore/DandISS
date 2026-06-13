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

export async function updatePhotoAction(url: string): Promise<ActionResult> {
  const { supabase, stylist } = await getCurrentStylist();
  if (!stylist) return { ok: false, error: "No se encontró tu perfil." };

  // Borra la foto anterior del Storage si existía.
  const { data: prev } = await supabase
    .from("stylists")
    .select("photo_url")
    .eq("id", stylist.id)
    .maybeSingle<{ photo_url: string | null }>();

  const { error } = await supabase
    .from("stylists")
    .update({ photo_url: url })
    .eq("id", stylist.id);
  if (error) return { ok: false, error: error.message };

  if (prev?.photo_url) {
    const oldPath = storagePathFromUrl(prev.photo_url);
    if (oldPath) await supabase.storage.from(STORAGE_BUCKET).remove([oldPath]);
  }

  revalidateAll();
  return { ok: true };
}

export async function addGalleryImageAction(
  url: string,
  caption: string
): Promise<ActionResult> {
  const { supabase, stylist } = await getCurrentStylist();
  if (!stylist) return { ok: false, error: "No se encontró tu perfil." };

  const { count } = await supabase
    .from("stylist_gallery")
    .select("id", { count: "exact", head: true })
    .eq("stylist_id", stylist.id);

  const { error } = await supabase.from("stylist_gallery").insert({
    stylist_id: stylist.id,
    image_url: url,
    caption: caption.trim() || null,
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
