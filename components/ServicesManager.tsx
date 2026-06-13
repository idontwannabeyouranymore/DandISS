"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import {
  createServiceAction,
  updateServiceAction,
  deleteServiceAction,
} from "@/app/dashboard/servicios/actions";
import { formatPrice, formatDuration } from "@/lib/format";
import type { Service } from "@/lib/types";

const DURATIONS = [30, 60, 90, 120, 150, 180];

export function ServicesManager({ services }: { services: Service[] }) {
  const [err, setErr] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      {err && (
        <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {err}
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
          <Plus className="h-4 w-4" /> Nuevo servicio
        </button>
      </div>

      {adding && (
        <ServiceForm
          onCancel={() => setAdding(false)}
          onError={setErr}
          onDone={() => setAdding(false)}
        />
      )}

      {services.length === 0 && !adding ? (
        <p className="text-sm text-neutral-500">
          Aún no tienes servicios. Crea el primero.
        </p>
      ) : (
        <div className="space-y-2">
          {services.map((s) =>
            editingId === s.id ? (
              <ServiceForm
                key={s.id}
                service={s}
                onCancel={() => setEditingId(null)}
                onError={setErr}
                onDone={() => setEditingId(null)}
              />
            ) : (
              <ServiceRow
                key={s.id}
                service={s}
                onEdit={() => {
                  setEditingId(s.id);
                  setAdding(false);
                }}
                onError={setErr}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

function ServiceRow({
  service,
  onEdit,
  onError,
}: {
  service: Service;
  onEdit: () => void;
  onError: (m: string | null) => void;
}) {
  const [pending, start] = useTransition();

  function toggleActive() {
    onError(null);
    start(async () => {
      const r = await updateServiceAction(service.id, {
        name: service.name,
        price: service.price,
        durationMinutes: service.duration_minutes,
        isActive: !service.is_active,
      });
      if (!r.ok) onError(r.error ?? "Error");
    });
  }

  function remove() {
    onError(null);
    if (!confirm(`¿Borrar "${service.name}"?`)) return;
    start(async () => {
      const r = await deleteServiceAction(service.id);
      if (!r.ok) onError(r.error ?? "Error");
    });
  }

  return (
    <div
      className={`flex items-center justify-between rounded-xl border p-4 ${
        service.is_active
          ? "border-neutral-200 bg-white"
          : "border-neutral-200 bg-neutral-50"
      }`}
    >
      <div>
        <div className="flex items-center gap-2 font-medium">
          {service.name}
          {!service.is_active && (
            <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-normal text-neutral-500">
              Inactivo
            </span>
          )}
        </div>
        <div className="text-sm text-neutral-500">
          {formatPrice(service.price)} · {formatDuration(service.duration_minutes)}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={toggleActive}
          disabled={pending}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-100"
        >
          {service.is_active ? "Desactivar" : "Activar"}
        </button>
        <button
          onClick={onEdit}
          className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
          aria-label="Editar"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={remove}
          disabled={pending}
          className="rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600"
          aria-label="Borrar"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

function ServiceForm({
  service,
  onCancel,
  onDone,
  onError,
}: {
  service?: Service;
  onCancel: () => void;
  onDone: () => void;
  onError: (m: string | null) => void;
}) {
  const [name, setName] = useState(service?.name ?? "");
  const [price, setPrice] = useState(String(service?.price ?? ""));
  const [duration, setDuration] = useState(service?.duration_minutes ?? 60);
  const [pending, start] = useTransition();

  function save() {
    onError(null);
    start(async () => {
      const payload = {
        name,
        price: Number(price),
        durationMinutes: duration,
      };
      const r = service
        ? await updateServiceAction(service.id, {
            ...payload,
            isActive: service.is_active,
          })
        : await createServiceAction(payload);
      if (r.ok) onDone();
      else onError(r.error ?? "Error");
    });
  }

  return (
    <div className="rounded-xl border border-neutral-900 bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_120px_140px]">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">
            Nombre
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Corte clásico"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">
            Precio (MXN)
          </label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            placeholder="250"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">
            Duración
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          >
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {formatDuration(d)}
              </option>
            ))}
          </select>
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
