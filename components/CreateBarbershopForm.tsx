"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2, X, Store } from "lucide-react";
import { createBarbershopWithOwnerAction } from "@/app/admin/actions";

export function CreateBarbershopForm() {
  const [open, setOpen] = useState(false);
  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function reset() {
    setShopName("");
    setOwnerName("");
    setEmail("");
    setPassword("");
    setErr(null);
  }

  function submit() {
    setErr(null);
    start(async () => {
      const r = await createBarbershopWithOwnerAction({
        shopName,
        ownerName,
        ownerEmail: email,
        ownerPassword: password,
      });
      if (r.ok) {
        reset();
        setOpen(false);
        window.location.reload();
      } else {
        setErr(r.error ?? "No se pudo crear.");
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
      >
        <Plus className="h-4 w-4" /> Nueva barbería
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-900 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold tracking-tight">
          <Store className="h-4 w-4" /> Alta de barbería + dueño
        </h2>
        <button
          onClick={() => {
            setOpen(false);
            reset();
          }}
          className="text-neutral-400 hover:text-neutral-900"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Barbería
          </div>
          <Field
            label="Nombre de la barbería"
            value={shopName}
            onChange={setShopName}
            placeholder="Ej. The Classic Barber"
          />
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Dueño (sus credenciales de acceso)
          </div>
          <div className="space-y-3">
            <Field
              label="Nombre del dueño"
              value={ownerName}
              onChange={setOwnerName}
              placeholder="Ej. María López"
            />
            <Field
              label="Correo"
              value={email}
              onChange={setEmail}
              type="email"
              placeholder="dueno@ejemplo.com"
            />
            <Field
              label="Contraseña (mín. 6)"
              value={password}
              onChange={setPassword}
              type="text"
              placeholder="Contraseña temporal"
            />
          </div>
        </div>

        {err && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </p>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={submit}
            disabled={pending}
            className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:bg-neutral-300"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Crear barbería y dueño
          </button>
          <button
            onClick={() => {
              setOpen(false);
              reset();
            }}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Cancelar
          </button>
        </div>
        <p className="text-xs text-neutral-400">
          Se crea la barbería (activa, con horarios por defecto) y la cuenta del
          dueño, asignado solo a esa barbería. Comparte las credenciales con él
          para que entre en /login.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-500">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
      />
    </div>
  );
}
