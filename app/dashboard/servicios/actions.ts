"use server";

import { revalidatePath } from "next/cache";
import { getProfessionalContext } from "@/lib/owner";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function requireOwner() {
  const ctx = await getProfessionalContext();
  if (ctx.role !== "owner" || !ctx.barbershopId) {
    return { ...ctx, ok: false as const };
  }
  return { ...ctx, ok: true as const };
}

function revalidate() {
  revalidatePath("/dashboard/servicios");
  revalidatePath("/b", "layout");
}

function parsePrice(value: number): number | null {
  if (Number.isNaN(value) || value < 0) return null;
  return Math.round(value * 100) / 100;
}

export async function createServiceAction(input: {
  name: string;
  price: number;
  durationMinutes: number;
}): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (!ctx.ok) return { ok: false, error: "No autorizado." };

  if (!input.name.trim()) return { ok: false, error: "El nombre es obligatorio." };
  const price = parsePrice(input.price);
  if (price === null) return { ok: false, error: "Precio inválido." };
  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0) {
    return { ok: false, error: "La duración debe ser un número de minutos." };
  }

  const { error } = await ctx.supabase.from("services").insert({
    barbershop_id: ctx.barbershopId,
    name: input.name.trim(),
    price,
    duration_minutes: input.durationMinutes,
  });
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function updateServiceAction(
  id: string,
  input: {
    name: string;
    price: number;
    durationMinutes: number;
    isActive: boolean;
  }
): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (!ctx.ok) return { ok: false, error: "No autorizado." };

  const price = parsePrice(input.price);
  if (!input.name.trim() || price === null || input.durationMinutes <= 0) {
    return { ok: false, error: "Datos inválidos." };
  }

  const { error } = await ctx.supabase
    .from("services")
    .update({
      name: input.name.trim(),
      price,
      duration_minutes: input.durationMinutes,
      is_active: input.isActive,
    })
    .eq("id", id)
    .eq("barbershop_id", ctx.barbershopId);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function deleteServiceAction(id: string): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (!ctx.ok) return { ok: false, error: "No autorizado." };

  const { error } = await ctx.supabase
    .from("services")
    .delete()
    .eq("id", id)
    .eq("barbershop_id", ctx.barbershopId);
  if (error) {
    // Si el servicio tiene citas asociadas, la FK lo impide.
    return {
      ok: false,
      error:
        "No se pudo borrar. Si tiene citas asociadas, mejor desactívalo en vez de borrarlo.",
    };
  }
  revalidate();
  return { ok: true };
}
