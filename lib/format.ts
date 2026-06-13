import { formatInTz } from "./tz";

export const SHOP_TIMEZONE =
  process.env.NEXT_PUBLIC_SHOP_TIMEZONE || "America/Mexico_City";

const DAY_LABELS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export function formatPrice(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return hours === 1 ? "1 hora" : `${hours} horas`;
}

// "HH:MM:SS" o "HH:MM" -> "9:00 AM"
export function formatTimeLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

// ISO UTC -> "9:00 AM" en la zona del negocio
export function formatSlotTime(iso: string): string {
  return formatInTz(
    new Date(iso),
    SHOP_TIMEZONE,
    { hour: "numeric", minute: "2-digit", hour12: true },
    "en-US"
  );
}

// ISO UTC -> "miércoles, 15 de junio" en la zona del negocio
export function formatLongDate(iso: string): string {
  return formatInTz(new Date(iso), SHOP_TIMEZONE, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function dayLabel(dayOfWeek: number): string {
  return DAY_LABELS[dayOfWeek] ?? "";
}
