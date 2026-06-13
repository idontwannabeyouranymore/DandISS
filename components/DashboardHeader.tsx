import Link from "next/link";
import { Scissors, LogOut } from "lucide-react";
import type { UserRole } from "@/lib/types";

export function DashboardHeader({ role }: { role?: UserRole | null }) {
  const isOwner = role === "owner";
  const isStylist = role === "stylist";

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <Scissors className="h-5 w-5" /> DandISS
        </Link>
        <div className="flex items-center gap-5 text-sm text-neutral-500">
          <Link href="/dashboard" className="hover:text-neutral-900">
            Agenda
          </Link>
          {isOwner && (
            <>
              <Link
                href="/dashboard/barberia"
                className="hover:text-neutral-900"
              >
                Barbería
              </Link>
              <Link
                href="/dashboard/servicios"
                className="hover:text-neutral-900"
              >
                Servicios
              </Link>
              <Link
                href="/dashboard/estilistas"
                className="hover:text-neutral-900"
              >
                Estilistas
              </Link>
              <Link
                href="/dashboard/estadisticas"
                className="hover:text-neutral-900"
              >
                Estadísticas
              </Link>
            </>
          )}
          {isStylist && (
            <Link href="/dashboard/perfil" className="hover:text-neutral-900">
              Mi perfil
            </Link>
          )}
          <form action="/auth/signout" method="post">
            <button className="flex items-center gap-1.5 hover:text-neutral-900">
              <LogOut className="h-4 w-4" /> Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
