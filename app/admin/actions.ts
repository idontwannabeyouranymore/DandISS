"use server";

import { revalidatePath } from "next/cache";
import { getProfessionalContext } from "@/lib/owner";
import type { BarbershopStatus } from "@/lib/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const VALID: BarbershopStatus[] = ["active", "suspended", "pending"];

async function requireAdmin() {
  const ctx = await getProfessionalContext();
  if (ctx.role !== "platform_admin") return { ...ctx, ok: false as const };
  return { ...ctx, ok: true as const };
}

export async function setBarbershopStatusAction(
  id: string,
  status: BarbershopStatus
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { ok: false, error: "No autorizado." };
  if (!VALID.includes(status)) return { ok: false, error: "Estado inválido." };

  const { data, error } = await ctx.supabase
    .from("barbershops")
    .update({ status })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "No se aplicó el cambio." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/barberias");
  revalidatePath("/", "layout"); // el catálogo público depende del estado
  return { ok: true };
}
