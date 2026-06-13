import Link from "next/link";
import { Header } from "@/components/Header";

export default function NotFound() {
  return (
    <>
      <Header showCta={false} />
      <main className="mx-auto flex max-w-5xl flex-col items-center px-5 py-32 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Página no encontrada</h1>
        <p className="mt-2 text-neutral-500">
          La barbería o el estilista que buscas no existe o no está disponible.
        </p>
        <Link
          href="/"
          className="mt-6 rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Volver al inicio
        </Link>
      </main>
    </>
  );
}
