import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ServicesManager } from "@/components/ServicesManager";
import { getProfessionalContext } from "@/lib/owner";
import type { Service } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ServiciosPage() {
  const ctx = await getProfessionalContext();
  if (!ctx.userId) redirect("/login");

  const isOwner = ctx.role === "owner" && ctx.barbershopId;

  let services: Service[] = [];
  if (isOwner) {
    const { data } = await ctx.supabase
      .from("services")
      .select("*")
      .eq("barbershop_id", ctx.barbershopId)
      .order("created_at", { ascending: true });
    services = (data ?? []) as Service[];
  }

  return (
    <>
      <DashboardHeader role={ctx.role} />
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-8">
        <h1 className="text-2xl font-bold tracking-tight">Servicios</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Define el catálogo, precios y duración de tu barbería.
        </p>

        {!isOwner ? (
          <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta sección es solo para dueños de barbería.
          </p>
        ) : (
          <div className="mt-6">
            <ServicesManager services={services} />
          </div>
        )}
      </main>
    </>
  );
}
