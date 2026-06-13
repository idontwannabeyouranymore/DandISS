import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { Photo } from "@/components/ui";
import { getActiveBarbershops, getBusinessHours } from "@/lib/queries";
import { dayLabel, formatTimeLabel } from "@/lib/format";

export const revalidate = 60;

async function hoursSummary(barbershopId: string): Promise<string> {
  const hours = await getBusinessHours(barbershopId);
  const open = hours.find((h) => !h.is_closed && h.open_time && h.close_time);
  if (!open) return "Horario por confirmar";
  return `${dayLabel(open.day_of_week)} · ${formatTimeLabel(
    open.open_time!
  )} – ${formatTimeLabel(open.close_time!)}`;
}

export default async function HomePage() {
  const shops = await getActiveBarbershops();
  const summaries = await Promise.all(
    shops.map((s) => hoursSummary(s.id).catch(() => ""))
  );

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-5 pb-20">
        {/* Hero */}
        <section className="grid items-center gap-8 py-12 sm:grid-cols-2">
          <div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Agenda tu cita en minutos
            </h1>
            <p className="mt-4 max-w-md text-neutral-500">
              Encuentra tu barbería favorita y reserva tu horario sin llamadas
              ni esperas.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="#barberias"
                className="rounded-lg bg-neutral-900 px-5 py-3 text-sm font-medium text-white hover:bg-neutral-700"
              >
                Reservar ahora
              </Link>
              <Link
                href="#barberias"
                className="rounded-lg border border-neutral-300 bg-white px-5 py-3 text-sm font-medium hover:bg-neutral-50"
              >
                Explorar barberías
              </Link>
            </div>
          </div>
          <Photo className="h-64 w-full rounded-2xl sm:h-72" label />
        </section>

        {/* Barberías */}
        <section id="barberias" className="scroll-mt-20 py-4">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Barberías destacadas
              </h2>
              <p className="text-sm text-neutral-500">
                Explora las mejores barberías en tu ciudad
              </p>
            </div>
          </div>

          {shops.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-500">
              Aún no hay barberías activas. Si eres dueño,{" "}
              <Link href="/login" className="font-medium text-neutral-900 underline">
                accede a tu panel
              </Link>{" "}
              para configurar la tuya.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {shops.map((s, i) => (
                <Link
                  key={s.id}
                  href={`/b/${s.slug}`}
                  className="overflow-hidden rounded-xl border border-neutral-200 bg-white text-left transition hover:shadow-md"
                >
                  <Photo
                    className="h-28 w-full"
                    label
                    src={s.cover_url}
                    alt={s.name}
                  />
                  <div className="p-3.5">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-neutral-500">{s.tagline}</div>
                    <div className="mt-2 text-xs text-neutral-400">
                      {summaries[i]}
                    </div>
                    <div className="mt-3 flex items-center gap-1 text-sm font-medium">
                      Ver barbería <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
