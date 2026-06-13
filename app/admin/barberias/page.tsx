import { redirect } from "next/navigation";
import { AdminHeader } from "@/components/AdminHeader";
import { CreateBarbershopForm } from "@/components/CreateBarbershopForm";
import {
  BarbershopAdminList,
  type AdminShopRow,
} from "@/components/BarbershopAdminList";
import { getProfessionalContext } from "@/lib/owner";
import type { Barbershop } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminBarberiasPage() {
  const ctx = await getProfessionalContext();
  if (!ctx.userId) redirect("/login");
  if (ctx.role !== "platform_admin") redirect("/dashboard");

  // El admin ve TODAS las barberías (RLS: is_platform_admin()).
  const { data: shops } = await ctx.supabase
    .from("barbershops")
    .select("*")
    .order("created_at", { ascending: true });

  // Conteo de estilistas por barbería.
  const { data: stylistRows } = await ctx.supabase
    .from("stylists")
    .select("barbershop_id");

  const counts = new Map<string, number>();
  for (const r of stylistRows ?? []) {
    counts.set(r.barbershop_id, (counts.get(r.barbershop_id) ?? 0) + 1);
  }

  const rows: AdminShopRow[] = ((shops ?? []) as Barbershop[]).map((s) => ({
    ...s,
    stylistCount: counts.get(s.id) ?? 0,
  }));

  return (
    <>
      <AdminHeader />
      <main className="mx-auto max-w-4xl px-5 pb-20 pt-8">
        <h1 className="text-2xl font-bold tracking-tight">Barberías</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Todas las barberías de la plataforma. Suspende para ocultarlas del
          catálogo público.
        </p>

        <div className="mt-6">
          <CreateBarbershopForm />
        </div>

        <div className="mt-4">
          <BarbershopAdminList shops={rows} />
        </div>
      </main>
    </>
  );
}
