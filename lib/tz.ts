// =====================================================================
// Utilidades de zona horaria basadas en Intl (sin dependencias externas).
// Todas las citas se guardan en UTC (timestamptz) y se formatean en la
// zona del negocio.
// =====================================================================

// Offset (ms) de la zona `tz` para el instante `date`.
function tzOffsetMs(tz: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, number> = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== "literal") map[p.type] = Number(p.value);
  }
  const asUTC = Date.UTC(
    map.year,
    map.month - 1,
    map.day,
    map.hour,
    map.minute,
    map.second
  );
  return asUTC - date.getTime();
}

// Convierte una hora "de pared" en la zona dada a un Date UTC.
// `wall` en formato "YYYY-MM-DDTHH:mm:ss" (sin zona).
export function zonedWallToUtc(wall: string, tz: string): Date {
  const guess = new Date(`${wall}Z`); // interpretado como UTC
  const offset = tzOffsetMs(tz, guess);
  const adjusted = new Date(guess.getTime() - offset);
  // Refina una vez por si cruzamos un cambio de horario (DST).
  const offset2 = tzOffsetMs(tz, adjusted);
  if (offset2 !== offset) return new Date(guess.getTime() - offset2);
  return adjusted;
}

// Formatea un instante UTC en la zona del negocio.
export function formatInTz(
  date: Date,
  tz: string,
  options: Intl.DateTimeFormatOptions,
  locale = "es-MX"
): string {
  return new Intl.DateTimeFormat(locale, { timeZone: tz, ...options }).format(
    date
  );
}

// "YYYY-MM-DD" para la fecha local actual en la zona dada (usa en-CA -> ISO).
export function todayInTz(tz: string): string {
  return formatInTz(
    new Date(),
    tz,
    { year: "numeric", month: "2-digit", day: "2-digit" },
    "en-CA"
  );
}
