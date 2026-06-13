import { zonedWallToUtc } from "./tz";
import type { Appointment, BusinessHour, StylistAvailability } from "./types";

// Intervalo entre slots candidatos (minutos).
export const SLOT_STEP_MINUTES = 30;

export interface Slot {
  /** ISO UTC del inicio del slot */
  startsAt: string;
  /** ISO UTC del fin del slot (inicio + duración del servicio) */
  endsAt: string;
}

interface GenerateSlotsParams {
  /** Fecha local del negocio en formato "YYYY-MM-DD" */
  date: string;
  /** Zona horaria del negocio, p.ej. "America/Mexico_City" */
  timeZone: string;
  /** Duración del servicio en minutos */
  durationMinutes: number;
  /** Ventana de atención: disponibilidad del estilista o, si no hay, horario de la barbería */
  availability: { startTime: string; endTime: string } | null;
  /** Citas existentes del estilista (confirmed/completed) para detectar traslapes */
  booked: Pick<Appointment, "starts_at" | "ends_at">[];
  /** Momento actual (para no ofrecer horarios pasados). Por defecto: ahora. */
  now?: Date;
}

// "HH:MM:SS" -> minutos desde medianoche
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Construye un instante UTC a partir de una fecha local + minutos del día
function zonedToUtc(date: string, minutes: number, timeZone: string): Date {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const local = `${date}T${String(h).padStart(2, "0")}:${String(m).padStart(
    2,
    "0"
  )}:00`;
  return zonedWallToUtc(local, timeZone);
}

/**
 * Genera los horarios disponibles para un estilista en una fecha dada:
 * franja de atención, en pasos de SLOT_STEP_MINUTES, descartando los que
 * se traslapan con citas existentes o que ya pasaron.
 */
export function generateSlots({
  date,
  timeZone,
  durationMinutes,
  availability,
  booked,
  now = new Date(),
}: GenerateSlotsParams): Slot[] {
  if (!availability) return [];

  const openMin = timeToMinutes(availability.startTime);
  const closeMin = timeToMinutes(availability.endTime);
  if (closeMin <= openMin) return [];

  const bookedRanges = booked.map((b) => ({
    start: new Date(b.starts_at).getTime(),
    end: new Date(b.ends_at).getTime(),
  }));

  const slots: Slot[] = [];

  for (let start = openMin; start + durationMinutes <= closeMin; start += SLOT_STEP_MINUTES) {
    const startDate = zonedToUtc(date, start, timeZone);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60_000);

    // Descarta horarios pasados.
    if (startDate.getTime() <= now.getTime()) continue;

    // Descarta si se traslapa con una cita existente.
    const overlaps = bookedRanges.some(
      (r) => startDate.getTime() < r.end && endDate.getTime() > r.start
    );
    if (overlaps) continue;

    slots.push({
      startsAt: startDate.toISOString(),
      endsAt: endDate.toISOString(),
    });
  }

  return slots;
}

/**
 * Resuelve la ventana de atención para una fecha:
 * usa la disponibilidad del estilista para ese día; si no existe, hereda el
 * horario de la barbería. Devuelve null si está cerrado.
 */
export function resolveAvailabilityWindow(
  dayOfWeek: number,
  stylistAvailability: StylistAvailability[],
  businessHours: BusinessHour[]
): { startTime: string; endTime: string } | null {
  const sa = stylistAvailability.find((a) => a.day_of_week === dayOfWeek);
  if (sa) return { startTime: sa.start_time, endTime: sa.end_time };

  const bh = businessHours.find((h) => h.day_of_week === dayOfWeek);
  if (bh && !bh.is_closed && bh.open_time && bh.close_time) {
    return { startTime: bh.open_time, endTime: bh.close_time };
  }
  return null;
}
