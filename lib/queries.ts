import "server-only";
import { createClient } from "./supabase/server";
import type {
  Barbershop,
  BusinessHour,
  Service,
  Stylist,
  StylistGalleryItem,
  SocialLink,
} from "./types";

// Capa de lectura del catálogo público. Usa la clave anon: RLS deja ver solo
// barberías activas, servicios/estilistas activos, etc.

export async function getActiveBarbershops(): Promise<Barbershop[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("barbershops")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getBarbershopBySlug(
  slug: string
): Promise<Barbershop | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("barbershops")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getBusinessHours(
  barbershopId: string
): Promise<BusinessHour[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_hours")
    .select("*")
    .eq("barbershop_id", barbershopId)
    .order("day_of_week", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getShopSocialLinks(
  barbershopId: string
): Promise<SocialLink[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("social_links")
    .select("*")
    .eq("barbershop_id", barbershopId);
  if (error) throw error;
  return data ?? [];
}

export async function getStylistSocialLinks(
  stylistId: string
): Promise<SocialLink[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("social_links")
    .select("*")
    .eq("stylist_id", stylistId);
  if (error) throw error;
  return data ?? [];
}

export async function getStylistsByShop(
  barbershopId: string
): Promise<Stylist[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stylists")
    .select("*")
    .eq("barbershop_id", barbershopId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getStylistBySlug(
  barbershopId: string,
  stylistSlug: string
): Promise<Stylist | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stylists")
    .select("*")
    .eq("barbershop_id", barbershopId)
    .eq("slug", stylistSlug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Servicios que ofrece un estilista (vía stylist_services). Si no tiene
// ninguno asignado, devuelve todos los servicios activos de la barbería.
export async function getStylistServices(
  stylistId: string,
  barbershopId: string
): Promise<Service[]> {
  const supabase = await createClient();

  const { data: links, error: linkErr } = await supabase
    .from("stylist_services")
    .select("service_id")
    .eq("stylist_id", stylistId);
  if (linkErr) throw linkErr;

  const ids = (links ?? []).map((l) => l.service_id);

  let query = supabase
    .from("services")
    .select("*")
    .eq("barbershop_id", barbershopId)
    .eq("is_active", true)
    .order("price", { ascending: true });

  if (ids.length > 0) query = query.in("id", ids);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getStylistGallery(
  stylistId: string
): Promise<StylistGalleryItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stylist_gallery")
    .select("*")
    .eq("stylist_id", stylistId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
