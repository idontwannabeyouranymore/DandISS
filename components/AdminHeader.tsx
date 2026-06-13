"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, LogOut, Menu, X } from "lucide-react";

const LINKS = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/barberias", label: "Barberías" },
];

export function AdminHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3.5">
        <Link
          href="/admin"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <ShieldCheck className="h-5 w-5" /> DandISS · Admin
        </Link>

        <nav className="hidden items-center gap-5 text-sm text-neutral-500 sm:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-neutral-900">
              {l.label}
            </Link>
          ))}
          <form action="/auth/signout" method="post">
            <button className="flex items-center gap-1.5 hover:text-neutral-900">
              <LogOut className="h-4 w-4" /> Salir
            </button>
          </form>
        </nav>

        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-100 sm:hidden"
          aria-label="Menú"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-neutral-100 bg-white px-3 py-2 sm:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              {l.label}
            </Link>
          ))}
          <form action="/auth/signout" method="post">
            <button className="flex w-full items-center gap-1.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-100">
              <LogOut className="h-4 w-4" /> Salir
            </button>
          </form>
        </nav>
      )}
    </header>
  );
}
