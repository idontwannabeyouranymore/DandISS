import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/DashboardHeader";
import { getProfessionalContext } from "@/lib/owner";
import { formatPrice } from "@/lib/format";
import type { AppointmentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  status: AppointmentStatus;
  starts_at: string;
  services: { name: string; price: number } | { name: string; price: number }[] | null;
  stylists: { name: string } | { name: string }[] | null;
}

const PERIODS = [
  { days: 7, label: "7 días" },
  { days: 30, label: "30 días" },
  { days: 90, label: "90 días" },
];

function one<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

export default async function EstadisticasPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const ctx = await getProfessionalContext();
  if (!ctx.userId) redirect("/login");

  const isOwner = ctx.role === "owner" && ctx.barbershopId;
  const sp = await searchParams;
  const days = PERIODS.some((p) => String(p.days) === sp.days)
    ? Number(sp.days)
    : 30;

  if (!isOwner) {
    return (
      <>
        <DashboardHeader role={ctx.role} />
        <main className="mx-auto max-w-3xl px-5 pb-20 pt-8">
          <h1 className="text-2xl font-bold tracking-tight">Estadísticas</h1>
          <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta sección es solo para dueños de barbería.
          </p>
        </main>
      </>
    );
  }

  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data } = await ctx.supabase
    .from("appointments")
    .select(
      "id, status, starts_at, services(name, price), stylists(name)"
    )
    .eq("barbershop_id", ctx.barbershopId)
    .gte("starts_at", since)
    .returns<Row[]>();

  const rows = data ?? [];

  // --- Agregados ---
  const byStatus: Record<AppointmentStatus, number> = {
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0,
  };
  let revenue = 0; // ingresos de citas completadas
  let upcoming = 0; // ingresos potenciales (confirmadas)

  const serviceCount = new Map<string, number>();
  const stylistStat = new Map<string, { count: number; revenue: number }>();

  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    const svc = one(r.services);
    const sty = one(r.stylists);
    const price = svc?.price ?? 0;

    if (r.status === "completed") {
      revenue += price;
      if (sty) {
        const cur = stylistStat.get(sty.name) ?? { count: 0, revenue: 0 };
        stylistStat.set(sty.name, {
          count: cur.count + 1,
          revenue: cur.revenue + price,
        });
      }
    }
    if (r.status === "confirmed") upcoming += price;

    if (svc && (r.status === "completed" || r.status === "confirmed")) {
      serviceCount.set(svc.name, (serviceCount.get(svc.name) ?? 0) + 1);
    }
  }

  const topServices = [...serviceCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxService = topServices[0]?.[1] ?? 1;

  const ranking = [...stylistStat.entries()]
    .map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => b.revenue - a.revenue);
  const maxStylist = ranking[0]?.revenue ?? 1;

  return (
    <>
      <DashboardHeader role={ctx.role} />
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Estadísticas</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Últimos {days} días.
            </p>
          </div>
          <div className="flex w-fit gap-1 rounded-lg border border-neutral-200 bg-white p-1">
            {PERIODS.map((p) => (
              <Link
                key={p.days}
                href={`/dashboard/estadisticas?days=${p.days}`}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  p.days === days
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-500 hover:bg-neutral-100"
                }`}
              >
                {p.label}
              </Link>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="Citas" value={String(rows.length)} />
          <Kpi label="Completadas" value={String(byStatus.completed)} />
          <Kpi label="Ingresos" value={formatPrice(revenue)} />
          <Kpi
            label="Cancel./No asist."
            value={String(byStatus.cancelled + byStatus.no_show)}
          />
        </div>
        {upcoming > 0 && (
          <p className="mt-3 text-xs text-neutral-400">
            Ingresos potenciales de citas confirmadas próximas:{" "}
            {formatPrice(upcoming)}
          </p>
        )}

        {/* Servicios más vendidos */}
        <section className="mt-8">
          <h2 className="mb-3 font-semibold tracking-tight">
            Servicios más vendidos
          </h2>
          {topServices.length === 0 ? (
            <p className="text-sm text-neutral-500">Sin datos en el periodo.</p>
          ) : (
            <div className="space-y-2.5">
              {topServices.map(([name, count]) => (
                <Bar
                  key={name}
                  label={name}
                  value={`${count}`}
                  pct={(count / maxService) * 100}
                />
              ))}
            </div>
          )}
        </section>

        {/* Ranking de estilistas */}
        <section className="mt-8">
          <h2 className="mb-3 font-semibold tracking-tight">
            Ranking de estilistas
          </h2>
          <p className="mb-3 text-xs text-neutral-400">
            Por ingresos de citas completadas.
          </p>
          {ranking.length === 0 ? (
            <p className="text-sm text-neutral-500">Sin datos en el periodo.</p>
          ) : (
            <div className="space-y-2.5">
              {ranking.map((s) => (
                <Bar
                  key={s.name}
                  label={s.name}
                  value={`${formatPrice(s.revenue)} · ${s.count} citas`}
                  pct={(s.revenue / maxStylist) * 100}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 text-xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

function Bar({
  label,
  value,
  pct,
}: {
  label: string;
  value: string;
  pct: number;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-neutral-500">{value}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full bg-neutral-900"
          style={{ width: `${Math.max(pct, 4)}%` }}
        />
      </div>
    </div>
  );
}
