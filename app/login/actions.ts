"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const explicitRedirect = String(formData.get("redirect") ?? "");

  if (!email || !password) {
    return { error: "Ingresa tu correo y contraseña." };
  }

  const supabase = await createClient();
  const { data: signIn, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !signIn.user) {
    return { error: "Credenciales inválidas. Verifica tus datos." };
  }

  // Si hay un destino explícito (ruta protegida que pedía login), respétalo.
  if (explicitRedirect && explicitRedirect !== "/dashboard") {
    redirect(explicitRedirect);
  }

  // Si no, manda al admin de plataforma a su panel.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", signIn.user.id)
    .maybeSingle<{ role: string }>();

  redirect(profile?.role === "platform_admin" ? "/admin" : "/dashboard");
}
