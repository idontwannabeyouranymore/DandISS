import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/DashboardHeader";
import { StylistsManager } from "@/components/StylistsManager";
import { getProfessionalContext } from "@/lib/owner";
import type { Stylist } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EstilistasPage() {
  const ctx = await getProfessionalContext();
  if (!ctx.userId) redirect("/login");

  const isOwner = ctx.role === "owner" && ctx.barbershopId;

  let stylists: Stylist[] = [];
  let shopSlug = "";
  if (isOwner) {
    const [{ data: list }, { data: shop }] = await Promise.all([
      ctx.supabase
        .from("stylists")
        .select("*")
        .eq("barbershop_id", ctx.barbershopId)
        .order("created_at", { ascending: true }),
      ctx.supabase
        .from("barbershops")
        .select("slug")
        .eq("id", ctx.barbershopId)
        .maybeSingle<{ slug: string }>(),
    ]);
    stylists = (list ?? []) as Stylist[];
    shopSlug = shop?.slug ?? "";
  }

  return (
    <>
      <DashboardHeader role={ctx.role} />
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-8">
        <h1 className="text-2xl font-bold tracking-tight">Estilistas</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Gestiona tu equipo y crea sus credenciales de acceso.
        </p>

        {!isOwner ? (
          <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta sección es solo para dueños de barbería.
          </p>
        ) : (
          <div className="mt-6">
            <StylistsManager stylists={stylists} shopSlug={shopSlug} />
          </div>
        )}
      </main>
    </>
  );
}
