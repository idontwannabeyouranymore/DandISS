import Link from "next/link";
import { Scissors } from "lucide-react";

export function Header({ showCta = true }: { showCta?: boolean }) {
  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <Scissors className="h-5 w-5" /> DandISS
        </Link>
        <nav className="hidden gap-7 text-sm text-neutral-500 sm:flex">
          <Link href="/" className="hover:text-neutral-900">
            Inicio
          </Link>
          <Link href="/#barberias" className="hover:text-neutral-900">
            Barberías
          </Link>
          <Link href="/login" className="hover:text-neutral-900">
            Acceso profesionales
          </Link>
        </nav>
        {showCta && (
          <Link
            href="/#barberias"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Reservar ahora
          </Link>
        )}
      </div>
    </header>
  );
}
