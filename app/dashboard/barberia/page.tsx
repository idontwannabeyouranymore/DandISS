import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ShopConfigEditor } from "@/components/ShopConfigEditor";
import { getProfessionalContext } from "@/lib/owner";
import type { Barbershop, BusinessHour } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BarberiaPage() {
  const ctx = await getProfessionalContext();
  if (!ctx.userId) redirect("/login");

  const isOwner = ctx.role === "owner" && ctx.barbershopId;

  if (!isOwner) {
    return (
      <>
        <DashboardHeader role={ctx.role} />
        <main className="mx-auto max-w-3xl px-5 pb-20 pt-8">
          <h1 className="text-2xl font-bold tracking-tight">Mi barbería</h1>
          <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta sección es solo para dueños de barbería.
          </p>
        </main>
      </>
    );
  }

  const [{ data: shop }, { data: hours }] = await Promise.all([
    ctx.supabase
      .from("barbershops")
      .select("*")
      .eq("id", ctx.barbershopId)
      .maybeSingle<Barbershop>(),
    ctx.supabase
      .from("business_hours")
      .select("*")
      .eq("barbershop_id", ctx.barbershopId)
      .order("day_of_week", { ascending: true }),
  ]);

  return (
    <>
      <DashboardHeader role={ctx.role} />
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-8">
        <h1 className="text-2xl font-bold tracking-tight">Mi barbería</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Configura los datos públicos y los horarios de atención.
        </p>

        {!shop ? (
          <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No se encontró tu barbería. Verifica que tu usuario sea el owner_id de
            la barbería (revisa crear-dueno-demo.sql).
          </p>
        ) : (
          <div className="mt-6">
            <ShopConfigEditor
              shop={shop}
              hours={(hours ?? []) as BusinessHour[]}
            />
          </div>
        )}
      </main>
    </>
  );
}
