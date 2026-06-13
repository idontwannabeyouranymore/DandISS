"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  generateSlots,
  resolveAvailabilityWindow,
  type Slot,
} from "@/lib/slots";
import { SHOP_TIMEZONE } from "@/lib/format";
import { zonedWallToUtc } from "@/lib/tz";
import type {
  BusinessHour,
  Service,
  StylistAvailability,
  Appointment,
} from "@/lib/types";

// Día de la semana (0=domingo) de una fecha "YYYY-MM-DD" en la zona del negocio.
function dayOfWeekFor(date: string): number {
  // El día de la semana de una fecha calendario no depende de la zona horaria.
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/**
 * Devuelve los horarios disponibles de un estilista para una fecha y servicio.
 * Lee las citas con la clave service_role (server-only) para no exponer datos
 * de clientes al navegador: solo se envían horas libres.
 */
export async function getSlotsAction(params: {
  stylistId: string;
  barbershopId: string;
  serviceId: string;
  date: string; // "YYYY-MM-DD"
}): Promise<Slot[]> {
  const { stylistId, barbershopId, serviceId, date } = params;
  const supabase = await createClient();

  // Duración del servicio (público).
  const { data: service } = await supabase
    .from("services")
    .select("duration_minutes")
    .eq("id", serviceId)
    .maybeSingle<Pick<Service, "duration_minutes">>();
  if (!service) return [];

  const dow = dayOfWeekFor(date);

  // Ventana de atención: disponibilidad del estilista o, si no hay, la barbería.
  const [{ data: avail }, { data: bh }] = await Promise.all([
    supabase
      .from("stylist_availability")
      .select("*")
      .eq("stylist_id", stylistId)
      .eq("day_of_week", dow),
    supabase
      .from("business_hours")
      .select("*")
      .eq("barbershop_id", barbershopId)
      .eq("day_of_week", dow),
  ]);

  const window = resolveAvailabilityWindow(
    dow,
    (avail ?? []) as StylistAvailability[],
    (bh ?? []) as BusinessHour[]
  );
  if (!window) return [];

  // Citas existentes del estilista ese día (admin: salta RLS, solo rangos).
  const dayStart = zonedWallToUtc(`${date}T00:00:00`, SHOP_TIMEZONE);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const admin = createAdminClient();
  const { data: booked } = await admin
    .from("appointments")
    .select("starts_at, ends_at")
    .eq("stylist_id", stylistId)
    .in("status", ["confirmed", "completed"])
    .gte("starts_at", dayStart.toISOString())
    .lt("starts_at", dayEnd.toISOString());

  return generateSlots({
    date,
    timeZone: SHOP_TIMEZONE,
    durationMinutes: service.duration_minutes,
    availability: window,
    booked: (booked ?? []) as Pick<Appointment, "starts_at" | "ends_at">[],
  });
}

export interface BookResult {
  ok: boolean;
  appointmentId?: string;
  error?: string;
}

/**
 * Crea la cita llamando al RPC público book_appointment (SECURITY DEFINER).
 * El cliente anónimo NO inserta directo en la tabla.
 */
export async function bookAppointmentAction(params: {
  stylistId: string;
  serviceId: string;
  startsAt: string; // ISO UTC
  clientName: string;
  whatsapp: string;
  comment?: string;
}): Promise<BookResult> {
  const supabase = await createClient();

  // Validación reforzada (la base de datos vuelve a validar como fuente de verdad).
  const name = params.clientName.trim();
  const waDigits = params.whatsapp.replace(/\D/g, "");
  const comment = (params.comment ?? "").trim();

  if (name.length < 2 || name.length > 80) {
    return { ok: false, error: "El nombre debe tener entre 2 y 80 caracteres." };
  }
  if (waDigits.length < 10 || waDigits.length > 15) {
    return {
      ok: false,
      error: "WhatsApp inválido: ingresa entre 10 y 15 dígitos.",
    };
  }
  if (comment.length > 300) {
    return { ok: false, error: "El comentario es demasiado largo (máx. 300)." };
  }
  if (new Date(params.startsAt).getTime() <= Date.now()) {
    return { ok: false, error: "Ese horario ya no está disponible." };
  }

  const { data, error } = await supabase.rpc("book_appointment", {
    p_stylist_id: params.stylistId,
    p_service_id: params.serviceId,
    p_starts_at: params.startsAt,
    p_client_name: params.clientName,
    p_whatsapp: params.whatsapp,
    p_comment: params.comment ?? null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, appointmentId: data as string };
}
