"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AppointmentStatus } from "@/lib/types";

const ALLOWED: AppointmentStatus[] = [
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
];

export interface UpdateResult {
  ok: boolean;
  error?: string;
}

// Marca una cita. RLS garantiza que el estilista solo pueda tocar las suyas
// (y el dueño las de su barbería).
export async function updateAppointmentStatusAction(
  appointmentId: string,
  status: AppointmentStatus
): Promise<UpdateResult> {
  if (!ALLOWED.includes(status)) {
    return { ok: false, error: "Estado no válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  return { ok: true };
}
