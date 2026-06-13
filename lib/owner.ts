import "server-only";
import { createClient } from "./supabase/server";
import type { UserRole } from "./types";

// Contexto del profesional autenticado. `ownerBarbershopId` solo viene lleno si
// el usuario tiene rol "owner" (lo usamos para acotar los CRUD del dueño).
export async function getProfessionalContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      userId: null as string | null,
      role: null as UserRole | null,
      barbershopId: null as string | null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, barbershop_id")
    .eq("id", user.id)
    .maybeSingle<{ role: UserRole; barbershop_id: string | null }>();

  return {
    supabase,
    userId: user.id,
    role: profile?.role ?? null,
    barbershopId: profile?.barbershop_id ?? null,
  };
}
