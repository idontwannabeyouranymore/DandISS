import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { createClient } from "@/lib/supabase/server";
import { SHOP_TIMEZONE } from "@/lib/format";
import { formatInTz, todayInTz, zonedWallToUtc } from "@/lib/tz";
import {
  AppointmentCard,
  type AgendaItem,
} from "@/components/AppointmentCard";
import type { AppointmentStatus, Profile, Stylist } from "@/lib/types";

export const dynamic = "force-dynamic";

function shift(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

interface Row {
  id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  client_name: string;
  client_whatsapp: string;
  client_comment: string | null;
  services: { name: string } | { name: string }[] | null;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const supabase = await createClient();
  const sp = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (profile?.role === "platform_admin") redirect("/admin");

  const todayLocal = todayInTz(SHOP_TIMEZONE);
  const date = sp.date ?? todayLocal;

  const dayStart = zonedWallToUtc(`${date}T00:00:00`, SHOP_TIMEZONE);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  // Identifica al estilista (si el usuario es estilista).
  let stylist: Stylist | null = null;
  if (profile?.role === "stylist") {
    const { data } = await supabase
      .from("stylists")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle<Stylist>();
    stylist = data;
  }

  // Consulta de citas del día. RLS limita el alcance:
  //  - estilista -> solo sus citas; dueño -> las de su barbería.
  let query = supabase
    .from("appointments")
    .select(
      "id, starts_at, ends_at, status, client_name, client_whatsapp, client_comment, services(name)"
    )
    .gte("starts_at", dayStart.toISOString())
    .lt("starts_at", dayEnd.toISOString())
    .order("starts_at", { ascending: true });

  if (stylist) query = query.eq("stylist_id", stylist.id);

  const { data: rows } = await query.returns<Row[]>();

  const items: AgendaItem[] = (rows ?? []).map((r) => {
    const svc = Array.isArray(r.services) ? r.services[0] : r.services;
    return {
      id: r.id,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      durationMinutes: Math.round(
        (new Date(r.ends_at).getTime() - new Date(r.starts_at).getTime()) / 60000
      ),
      serviceName: svc?.name ?? "Servicio",
      clientName: r.client_name,
      clientWhatsapp: r.client_whatsapp,
      clientComment: r.client_comment,
      status: r.status,
    };
  });

  const heading = formatInTz(dayStart, SHOP_TIMEZONE, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const displayName =
    stylist?.name ?? profile?.full_name ?? user.email ?? "Profesional";

  return (
    <>
      <DashboardHeader role={profile?.role} />

      <main className="mx-auto max-w-3xl px-5 pb-20 pt-8">
        <div className="mb-1 text-sm text-neutral-500">Hola, {displayName}</div>
        <h1 className="text-2xl font-bold tracking-tight">Tu agenda</h1>

        {/* Navegación de fecha */}
        <div className="mt-5 flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3">
          <Link
            href={`/dashboard?date=${shift(date, -1)}`}
            className="rounded p-1 hover:bg-neutral-100"
          >
            <ChevronLeft className="h-5 w-5 text-neutral-500" />
          </Link>
          <div className="text-center">
            <div className="text-sm font-semibold capitalize">{heading}</div>
            {date !== todayLocal && (
              <Link
                href="/dashboard"
                className="text-xs text-neutral-400 underline"
              >
                Ir a hoy
              </Link>
            )}
          </div>
          <Link
            href={`/dashboard?date=${shift(date, 1)}`}
            className="rounded p-1 hover:bg-neutral-100"
          >
            <ChevronRight className="h-5 w-5 text-neutral-500" />
          </Link>
        </div>

        {!profile && (
          <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Tu perfil aún no tiene rol asignado. Contacta al administrador.
          </p>
        )}

        {profile?.role === "owner" && (
          <p className="mt-4 text-sm text-neutral-500">
            Vista de dueño: citas de toda tu barbería. El panel de configuración y
            estadísticas llega en la Fase 4.
          </p>
        )}

        <div className="mt-5 space-y-3">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-500">
              No hay citas para este día.
            </div>
          ) : (
            items.map((item) => <AppointmentCard key={item.id} item={item} />)
          )}
        </div>
      </main>
    </>
  );
}
