// =====================================================================
// Tipos TypeScript que reflejan el esquema de schema.sql
// =====================================================================

export type UserRole = "platform_admin" | "owner" | "stylist";
export type BarbershopStatus = "active" | "suspended" | "pending";
export type AppointmentStatus =
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";
export type SubscriptionPlan = "trial" | "basic" | "pro";

export interface Profile {
  id: string;
  role: UserRole;
  barbershop_id: string | null;
  full_name: string | null;
  created_at: string;
}

export interface Barbershop {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  about: string | null;
  logo_url: string | null;
  cover_url: string | null;
  address: string | null;
  owner_id: string | null;
  status: BarbershopStatus;
  plan: SubscriptionPlan;
  plan_renews_at: string | null;
  created_at: string;
}

export interface BusinessHour {
  id: string;
  barbershop_id: string;
  day_of_week: number; // 0 = domingo ... 6 = sábado
  open_time: string | null; // "HH:MM:SS"
  close_time: string | null;
  is_closed: boolean;
}

export interface SocialLink {
  id: string;
  barbershop_id: string | null;
  stylist_id: string | null;
  platform: string;
  url: string;
}

export interface Service {
  id: string;
  barbershop_id: string;
  name: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
}

export interface Stylist {
  id: string;
  barbershop_id: string;
  user_id: string | null;
  slug: string;
  name: string;
  title: string | null;
  bio: string | null;
  photo_url: string | null;
  rating: number | null;
  is_active: boolean;
  created_at: string;
}

export interface StylistGalleryItem {
  id: string;
  stylist_id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

export interface StylistAvailability {
  id: string;
  stylist_id: string;
  day_of_week: number;
  start_time: string; // "HH:MM:SS"
  end_time: string;
}

export interface Appointment {
  id: string;
  barbershop_id: string;
  stylist_id: string;
  service_id: string;
  client_name: string;
  client_whatsapp: string;
  client_comment: string | null;
  starts_at: string; // timestamptz ISO (UTC)
  ends_at: string;
  status: AppointmentStatus;
  created_at: string;
}

// Argumentos del RPC público book_appointment
export interface BookAppointmentArgs {
  p_stylist_id: string;
  p_service_id: string;
  p_starts_at: string; // ISO con offset (UTC)
  p_client_name: string;
  p_whatsapp: string;
  p_comment?: string | null;
}
