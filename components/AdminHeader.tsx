import Link from "next/link";
import { ShieldCheck, LogOut } from "lucide-react";

export function AdminHeader() {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3.5">
        <Link
          href="/admin"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <ShieldCheck className="h-5 w-5" /> DandISS · Admin
        </Link>
        <div className="flex items-center gap-5 text-sm text-neutral-500">
          <Link href="/admin" className="hover:text-neutral-900">
            Resumen
          </Link>
          <Link href="/admin/barberias" className="hover:text-neutral-900">
            Barberías
          </Link>
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
