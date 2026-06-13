"use client";

import { createBrowserClient } from "@supabase/ssr";

// Cliente de Supabase para componentes del navegador (Client Components).
// Usa la clave anon: la seguridad de datos la aplica RLS en Postgres.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
