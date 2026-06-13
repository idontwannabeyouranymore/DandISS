"use client";

import { useState, useTransition } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Star,
  Share2,
  Calendar as CalIcon,
  Clock,
  Instagram,
  Facebook,
  Music2,
  Link as LinkIcon,
} from "lucide-react";
import { Monogram, Photo } from "@/components/ui";
import {
  formatPrice,
  formatDuration,
  formatSlotTime,
  formatLongDate,
} from "@/lib/format";
import type {
  Service,
  Stylist,
  StylistGalleryItem,
  SocialLink,
} from "@/lib/types";
import type { Slot } from "@/lib/slots";

const SOCIAL_ICONS: Record<string, typeof Instagram> = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: Music2,
  whatsapp: LinkIcon,
};
import { getSlotsAction, bookAppointmentAction } from "@/app/b/[shop]/[stylist]/actions";

const WEEK_DAYS = ["LUN", "MAR", "MIE", "JUE", "VIE", "SAB", "DOM"];
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function BookingFlow({
  stylist,
  services,
  gallery,
  socials,
  shopSlug,
}: {
  stylist: Stylist;
  services: Service[];
  gallery: StylistGalleryItem[];
  socials: SocialLink[];
  shopSlug: string;
}) {
  const [step, setStep] = useState(1);
  const [service, setService] = useState<Service | null>(null);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [loadingSlots, startSlots] = useTransition();

  const [form, setForm] = useState({ name: "", wa: "", comment: "" });
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [booking, startBooking] = useTransition();
  const [copied, setCopied] = useState(false);

  const canContinue =
    (step === 1 && !!service) ||
    (step === 2 && !!selectedDate) ||
    (step === 3 && !!slot) ||
    (step === 4 && form.name.trim() !== "" && form.wa.trim() !== "");

  function loadSlots(date: string) {
    if (!service) return;
    setSlot(null);
    startSlots(async () => {
      const result = await getSlotsAction({
        stylistId: stylist.id,
        barbershopId: stylist.barbershop_id,
        serviceId: service.id,
        date,
      });
      setSlots(result);
    });
  }

  function onSelectDate(date: string) {
    setSelectedDate(date);
    loadSlots(date);
  }

  function next() {
    setError(null);
    if (step < 4) {
      setStep(step + 1);
      return;
    }
    if (!service || !slot) return;
    startBooking(async () => {
      const res = await bookAppointmentAction({
        stylistId: stylist.id,
        serviceId: service.id,
        startsAt: slot.startsAt,
        clientName: form.name,
        whatsapp: form.wa,
        comment: form.comment,
      });
      if (res.ok && res.appointmentId) {
        setConfirmedId(res.appointmentId);
      } else {
        setError(res.error ?? "No se pudo crear la cita.");
        // El horario pudo ocuparse: recarga slots si seguimos en esa fecha.
        if (selectedDate) loadSlots(selectedDate);
      }
    });
  }

  async function copyShare() {
    try {
      // El enlace único es la propia página del estilista.
      const url =
        typeof window !== "undefined"
          ? window.location.href
          : `/b/${shopSlug}/${stylist.slug}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  }

  if (confirmedId) {
    return (
      <Confirmation
        stylist={stylist}
        service={service}
        slot={slot}
        shopSlug={shopSlug}
      />
    );
  }

  // --- Calendario ---
  const firstWeekday = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // lunes=0
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayYmd = ymd(today.getFullYear(), today.getMonth(), today.getDate());

  function changeMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m);
    setViewYear(y);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Perfil del estilista */}
      <aside className="lg:col-span-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="flex items-center justify-between">
            {stylist.photo_url ? (
              <Photo
                src={stylist.photo_url}
                alt={stylist.name}
                className="h-20 w-20 rounded-full"
              />
            ) : (
              <Monogram name={stylist.name} size="h-20 w-20" text="text-xl" />
            )}
            <button
              onClick={copyShare}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
            >
              <Share2 className="h-3.5 w-3.5" /> {copied ? "¡Copiado!" : "Compartir"}
            </button>
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-tight">{stylist.name}</h1>
          {stylist.title && (
            <div className="text-sm text-neutral-500">{stylist.title}</div>
          )}
          {stylist.rating != null && (
            <div className="mt-1.5 flex items-center gap-1 text-sm">
              <Star className="h-3.5 w-3.5 fill-neutral-900" /> {stylist.rating}
            </div>
          )}
          {stylist.bio && (
            <p className="mt-4 text-sm text-neutral-600">{stylist.bio}</p>
          )}

          {socials.length > 0 && (
            <div className="mt-4 flex gap-3 text-neutral-400">
              {socials.map((s) => {
                const Icon = SOCIAL_ICONS[s.platform.toLowerCase()] ?? LinkIcon;
                return (
                  <a
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-neutral-900"
                    aria-label={s.platform}
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                );
              })}
            </div>
          )}

          <div className="mt-5">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Trabajos
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(gallery.length > 0
                ? gallery.slice(0, 6)
                : Array.from({ length: 6 }).map(() => null)
              ).map((g, i) => (
                <Photo
                  key={g?.id ?? i}
                  src={g?.image_url}
                  alt={g?.caption ?? ""}
                  className="aspect-square rounded-lg"
                />
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Stepper */}
      <section className="lg:col-span-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <Steps step={step} />

          {step === 1 && (
            <div className="mt-5 space-y-2.5">
              <h3 className="text-sm font-semibold">1. Selecciona servicio</h3>
              {services.length === 0 && (
                <p className="text-sm text-neutral-500">
                  Este estilista no tiene servicios disponibles.
                </p>
              )}
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setService(s)}
                  className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition ${
                    service?.id === s.id
                      ? "border-neutral-900 bg-neutral-50"
                      : "border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-neutral-400">
                      {formatDuration(s.duration_minutes)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatPrice(s.price)}</span>
                    {service?.id === s.id && <Check className="h-4 w-4" />}
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="mt-5">
              <h3 className="mb-3 text-sm font-semibold">2. Selecciona fecha</h3>
              <div className="rounded-xl border border-neutral-200 p-4">
                <div className="mb-3 flex items-center justify-between text-sm font-medium capitalize">
                  <button onClick={() => changeMonth(-1)} className="rounded p-1 hover:bg-neutral-100">
                    <ChevronLeft className="h-4 w-4 text-neutral-500" />
                  </button>
                  {MONTHS[viewMonth]} {viewYear}
                  <button onClick={() => changeMonth(1)} className="rounded p-1 hover:bg-neutral-100">
                    <ChevronRight className="h-4 w-4 text-neutral-500" />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-neutral-400">
                  {WEEK_DAYS.map((d) => (
                    <div key={d}>{d}</div>
                  ))}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-1">
                  {Array.from({ length: firstWeekday }).map((_, i) => (
                    <div key={`blank-${i}`} />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const n = i + 1;
                    const date = ymd(viewYear, viewMonth, n);
                    const isPast = date < todayYmd;
                    const selected = selectedDate === date;
                    return (
                      <button
                        key={n}
                        disabled={isPast}
                        onClick={() => onSelectDate(date)}
                        className={`aspect-square rounded-lg text-sm transition ${
                          selected
                            ? "bg-neutral-900 text-white"
                            : isPast
                            ? "cursor-not-allowed text-neutral-300"
                            : "hover:bg-neutral-100"
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="mt-5">
              <h3 className="mb-1 text-sm font-semibold">3. Selecciona hora</h3>
              {selectedDate && (
                <p className="mb-3 text-xs capitalize text-neutral-400">
                  {formatLongDate(`${selectedDate}T12:00:00Z`)}
                </p>
              )}
              {loadingSlots ? (
                <p className="text-sm text-neutral-400">Buscando horarios…</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  No hay horarios disponibles ese día. Prueba con otra fecha.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((s) => (
                    <button
                      key={s.startsAt}
                      onClick={() => setSlot(s)}
                      className={`rounded-lg border py-2.5 text-sm transition ${
                        slot?.startsAt === s.startsAt
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-200 hover:border-neutral-400"
                      }`}
                    >
                      {formatSlotTime(s.startsAt)}
                    </button>
                  ))}
                </div>
              )}
              {service && (
                <p className="mt-4 text-xs text-neutral-400">
                  La duración total será de {formatDuration(service.duration_minutes)}.
                </p>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="mt-5 space-y-4">
              <h3 className="text-sm font-semibold">4. Tus datos</h3>
              <Field
                label="Nombre completo"
                placeholder="Ej. Carlos López"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
              />
              <Field
                label="WhatsApp"
                placeholder="Ej. 55 1234 5678"
                value={form.wa}
                onChange={(v) => setForm({ ...form, wa: v })}
              />
              <Field
                label="Comentario (opcional)"
                placeholder="Algo que debamos saber…"
                value={form.comment}
                onChange={(v) => setForm({ ...form, comment: v })}
              />
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            disabled={!canContinue || booking}
            onClick={next}
            className={`mt-6 w-full rounded-lg py-3 text-sm font-medium text-white transition ${
              canContinue && !booking
                ? "bg-neutral-900 hover:bg-neutral-700"
                : "cursor-not-allowed bg-neutral-300"
            }`}
          >
            {booking
              ? "Confirmando…"
              : step === 4
              ? "Confirmar cita"
              : "Continuar"}
          </button>
          {step === 4 && (
            <p className="mt-2 text-center text-xs text-neutral-400">
              Tu cita estará confirmada al instante
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function Steps({ step }: { step: number }) {
  const labels = ["Servicio", "Fecha", "Hora", "Datos"];
  return (
    <div className="flex items-center gap-1.5">
      {labels.map((l, i) => (
        <div key={l} className="flex flex-1 items-center gap-1.5">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
              i + 1 <= step
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-400"
            }`}
          >
            {i + 1 < step ? <Check className="h-3 w-3" /> : i + 1}
          </div>
          {i < labels.length - 1 && (
            <div
              className={`h-px flex-1 ${
                i + 1 < step ? "bg-neutral-900" : "bg-neutral-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-neutral-900"
      />
    </div>
  );
}

function Confirmation({
  stylist,
  service,
  slot,
  shopSlug,
}: {
  stylist: Stylist;
  service: Service | null;
  slot: Slot | null;
  shopSlug: string;
}) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <Check className="h-8 w-8 text-green-600" />
      </div>
      <h1 className="mt-5 text-2xl font-bold tracking-tight">
        ¡Cita confirmada!
      </h1>
      <p className="mt-1 text-neutral-500">
        Tu cita ha sido agendada exitosamente.
      </p>

      <div className="mt-7 w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 text-left">
        <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
          <Monogram name={stylist.name} />
          <div>
            <div className="font-medium">{stylist.name}</div>
            <div className="text-sm text-neutral-500">{service?.name}</div>
          </div>
        </div>
        <div className="mt-4 space-y-2 text-sm text-neutral-600">
          {slot && (
            <>
              <div className="flex items-center gap-2 capitalize">
                <CalIcon className="h-4 w-4 text-neutral-400" />
                {formatLongDate(slot.startsAt)}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-neutral-400" />
                {formatSlotTime(slot.startsAt)}
                {service && ` · ${formatDuration(service.duration_minutes)}`}
              </div>
            </>
          )}
        </div>
      </div>

      <a
        href={`/b/${shopSlug}`}
        className="mt-6 rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-700"
      >
        Volver a la barbería
      </a>
    </div>
  );
}
