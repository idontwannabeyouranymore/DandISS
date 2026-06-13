"use client";

import { Suspense, useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Scissors } from "lucide-react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-neutral-900 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
    >
      {pending ? "Accediendo…" : "Iniciar sesión"}
    </button>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-7">
      <h1 className="text-xl font-bold tracking-tight">Acceso profesionales</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Estilistas y dueños de barbería.
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="redirect" value={redirect} />
        <div>
          <label className="mb-1.5 block text-sm font-medium">Correo</label>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="tu@correo.com"
            className="w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-neutral-900"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Contraseña</label>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-neutral-900"
          />
        </div>

        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <SubmitButton />
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 text-lg font-semibold tracking-tight"
        >
          <Scissors className="h-5 w-5" /> DandISS
        </Link>

        <Suspense
          fallback={
            <div className="h-72 rounded-2xl border border-neutral-200 bg-white" />
          }
        >
          <LoginForm />
        </Suspense>

        <p className="mt-5 text-center text-xs text-neutral-400">
          ¿Eres cliente?{" "}
          <Link href="/" className="font-medium text-neutral-600 underline">
            Reserva sin cuenta
          </Link>
        </p>
      </div>
    </main>
  );
}
