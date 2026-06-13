"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Pencil,
  Check,
  X,
  Loader2,
  KeyRound,
  CircleCheck,
} from "lucide-react";
import { Monogram } from "@/components/ui";
import {
  createStylistAction,
  updateStylistAction,
  createStylistCredentialsAction,
} from "@/app/dashboard/estilistas/actions";
import type { Stylist } from "@/lib/types";

export function StylistsManager({
  stylists,
  shopSlug,
}: {
  stylists: Stylist[];
  shopSlug: string;
}) {
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [credsFor, setCredsFor] = useState<string | null>(null);

  function flashOk(text: string) {
    setOk(text);
    setErr(null);
    setTimeout(() => setOk(null), 2500);
  }

  return (
    <div className="space-y-4">
      {err && (
        <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {err}
        </div>
      )}
      {ok && (
        <div className="rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-700">
          {ok}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => {
            setAdding(true);
            setEditingId(null);
          }}
          className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          <Plus className="h-4 w-4" /> Nuevo estilista
        </button>
      </div>

      {adding && (
        <StylistForm
          onCancel={() => setAdding(false)}
          onError={setErr}
          onDone={() => {
            setAdding(false);
            flashOk("Estilista creado");
          }}
        />
      )}

      <div className="space-y-2">
        {stylists.map((s) =>
          editingId === s.id ? (
            <StylistForm
              key={s.id}
              stylist={s}
              onCancel={() => setEditingId(null)}
              onError={setErr}
              onDone={() => {
                setEditingId(null);
                flashOk("Cambios guardados");
              }}
            />
          ) : (
            <div key={s.id} className="rounded-xl border border-neutral-200 bg-white">
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Monogram name={s.name} size="h-11 w-11" text="text-sm" />
                  <div>
                    <div className="flex items-center gap-2 font-medium">
                      {s.name}
                      {!s.is_active && (
                        <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-normal text-neutral-500">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-neutral-500">
                      {s.title || "Sin título"} · /{shopSlug}/{s.slug}
                    </div>
                    <div className="mt-0.5 text-xs">
                      {s.user_id ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <CircleCheck className="h-3.5 w-3.5" /> Con acceso
                        </span>
                      ) : (
                        <span className="text-neutral-400">Sin acceso</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <ToggleActive stylist={s} onError={setErr} />
                  {!s.user_id && (
                    <button
                      onClick={() =>
                        setCredsFor(credsFor === s.id ? null : s.id)
                      }
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                    >
                      <KeyRound className="h-3.5 w-3.5" /> Crear acceso
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditingId(s.id);
                      setAdding(false);
                    }}
                    className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
                    aria-label="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {credsFor === s.id && (
                <CredentialsForm
                  stylistId={s.id}
                  onCancel={() => setCredsFor(null)}
                  onError={setErr}
                  onDone={() => {
                    setCredsFor(null);
                    flashOk(`Acceso creado para ${s.name}`);
                  }}
                />
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function ToggleActive({
  stylist,
  onError,
}: {
  stylist: Stylist;
  onError: (m: string | null) => void;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        onError(null);
        start(async () => {
          const r = await updateStylistAction(stylist.id, {
            name: stylist.name,
            title: stylist.title ?? "",
            bio: stylist.bio ?? "",
            isActive: !stylist.is_active,
          });
          if (!r.ok) onError(r.error ?? "Error");
        });
      }}
      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-100"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : stylist.is_active ? (
        "Desactivar"
      ) : (
        "Activar"
      )}
    </button>
  );
}

function StylistForm({
  stylist,
  onCancel,
  onDone,
  onError,
}: {
  stylist?: Stylist;
  onCancel: () => void;
  onDone: () => void;
  onError: (m: string | null) => void;
}) {
  const [name, setName] = useState(stylist?.name ?? "");
  const [title, setTitle] = useState(stylist?.title ?? "");
  const [bio, setBio] = useState(stylist?.bio ?? "");
  const [pending, start] = useTransition();

  function save() {
    onError(null);
    start(async () => {
      const r = stylist
        ? await updateStylistAction(stylist.id, {
            name,
            title,
            bio,
            isActive: stylist.is_active,
          })
        : await createStylistAction({ name, title, bio });
      if (r.ok) onDone();
      else onError(r.error ?? "Error");
    });
  }

  return (
    <div className="rounded-xl border border-neutral-900 bg-white p-4">
      <div className="space-y-3">
        <Input label="Nombre" value={name} onChange={setName} placeholder="Ej. Juan Pérez" />
        <Input
          label="Título / especialidad"
          value={title}
          onChange={setTitle}
          placeholder="Ej. Especialista en fades"
        />
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">
            Biografía
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={save}
          disabled={pending}
          className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:bg-neutral-300"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Guardar
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
        >
          <X className="h-4 w-4" /> Cancelar
        </button>
      </div>
    </div>
  );
}

function CredentialsForm({
  stylistId,
  onCancel,
  onDone,
  onError,
}: {
  stylistId: string;
  onCancel: () => void;
  onDone: () => void;
  onError: (m: string | null) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    onError(null);
    start(async () => {
      const r = await createStylistCredentialsAction(stylistId, {
        email,
        password,
      });
      if (r.ok) onDone();
      else onError(r.error ?? "Error");
    });
  }

  return (
    <div className="border-t border-neutral-100 bg-neutral-50 p-4">
      <div className="mb-2 text-xs font-medium text-neutral-500">
        Crear credenciales de acceso para este estilista
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="correo@ejemplo.com"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="text"
          placeholder="Contraseña (mín. 6)"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={submit}
          disabled={pending}
          className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:bg-neutral-300"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <KeyRound className="h-4 w-4" />
          )}
          Crear acceso
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-white"
        >
          Cancelar
        </button>
      </div>
      <p className="mt-2 text-xs text-neutral-400">
        Comparte estos datos con el estilista para que entre en /login. Podrá
        cambiarlos luego.
      </p>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-500">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
      />
    </div>
  );
}
