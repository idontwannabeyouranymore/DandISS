import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminHeader } from "@/components/AdminHeader";
import { getProfessionalContext } from "@/lib/owner";
import { formatPrice } from "@/lib/format";
import type { AppointmentStatus, BarbershopStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

interface ApptRow {
  status: AppointmentStatus;
  services: { price: number } | { price: number }[] | null;
  barbershops: { name: string } | { name: string }[] | null;
}

function one<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

export default async function AdminHome() {
  const ctx = await getProfessionalContext();
  if (!ctx.userId) redirect("/login");
  if (ctx.role !== "platform_admin") redirect("/dashboard");

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [{ data: shops }, { data: stylistRows }, { data: appts }] =
    await Promise.all([
      ctx.supabase.from("barbershops").select("status"),
      ctx.supabase.from("stylists").select("id"),
      ctx.supabase
        .from("appointments")
        .select("status, services(price), barbershops(name)")
        .gte("starts_at", since)
        .returns<ApptRow[]>(),
    ]);

  const byStatus: Record<BarbershopStatus, number> = {
    active: 0,
    suspended: 0,
    pending: 0,
  };
  for (const s of shops ?? []) {
    const st = s.status as BarbershopStatus;
    byStatus[st] = (byStatus[st] ?? 0) + 1;
  }

  let revenue = 0;
  const revenueByShop = new Map<string, number>();
  for (const a of appts ?? []) {
    if (a.status === "completed") {
      const price = one(a.services)?.price ?? 0;
      revenue += price;
      const shopName = one(a.barbershops)?.name ?? "—";
      revenueByShop.set(shopName, (revenueByShop.get(shopName) ?? 0) + price);
    }
  }

  const ranking = [...revenueByShop.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxRev = ranking[0]?.[1] ?? 1;

  const totalShops = (shops ?? []).length;
  const totalStylists = (stylistRows ?? []).length;

  return (
    <>
      <AdminHeader />
      <main className="mx-auto max-w-4xl px-5 pb-20 pt-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Resumen de plataforma
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Métricas globales · últimos 30 días.
            </p>
          </div>
          <Link
            href="/admin/barberias"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Gestionar barberías
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="Barberías" value={String(totalShops)} />
          <Kpi label="Activas" value={String(byStatus.active)} />
          <Kpi label="Estilistas" value={String(totalStylists)} />
          <Kpi label="Ingresos (30d)" value={formatPrice(revenue)} />
        </div>

        <div className="mt-3 flex gap-2 text-xs text-neutral-400">
          <span>{byStatus.suspended} suspendidas</span>·
          <span>{byStatus.pending} pendientes</span>·
          <span>{(appts ?? []).length} citas en el periodo</span>
        </div>

        <section className="mt-8">
          <h2 className="mb-3 font-semibold tracking-tight">
            Barberías por ingresos (30 días)
          </h2>
          {ranking.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Sin citas completadas en el periodo.
            </p>
          ) : (
            <div className="space-y-2.5">
              {ranking.map(([name, rev]) => (
                <div key={name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{name}</span>
                    <span className="text-neutral-500">{formatPrice(rev)}</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-neutral-900"
                      style={{ width: `${Math.max((rev / maxRev) * 100, 4)}%` }}
                    />
                  </div>
                </div>
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
