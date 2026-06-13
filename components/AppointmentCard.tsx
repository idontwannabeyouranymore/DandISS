"use client";

import { useState, useTransition } from "react";
import { Check, X, UserX, Clock, MessageCircle } from "lucide-react";
import { updateAppointmentStatusAction } from "@/app/dashboard/actions";
import { formatSlotTime, formatDuration } from "@/lib/format";
import type { AppointmentStatus } from "@/lib/types";

const STATUS_META: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  confirmed: { label: "Confirmada", className: "bg-neutral-100 text-neutral-600" },
  completed: { label: "Completada", className: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelada", className: "bg-red-100 text-red-700" },
  no_show: { label: "No asistió", className: "bg-amber-100 text-amber-700" },
};

export interface AgendaItem {
  id: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  serviceName: string;
  clientName: string;
  clientWhatsapp: string;
  clientComment: string | null;
  status: AppointmentStatus;
}

export function AppointmentCard({ item }: { item: AgendaItem }) {
  const [status, setStatus] = useState<AppointmentStatus>(item.status);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function mark(next: AppointmentStatus) {
    setError(null);
    const prev = status;
    setStatus(next); // optimista
    startTransition(async () => {
      const res = await updateAppointmentStatusAction(item.id, next);
      if (!res.ok) {
        setStatus(prev);
        setError(res.error ?? "No se pudo actualizar.");
      }
    });
  }

  const meta = STATUS_META[status];
  const waLink = `https://wa.me/${item.clientWhatsapp.replace(/\D/g, "")}`;
  const closed = status !== "confirmed";

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4 text-neutral-400" />
            {formatSlotTime(item.startsAt)}
            <span className="text-xs font-normal text-neutral-400">
              · {formatDuration(item.durationMinutes)}
            </span>
          </div>
          <div className="mt-1.5 font-medium">{item.clientName}</div>
          <div className="text-sm text-neutral-500">{item.serviceName}</div>
          {item.clientComment && (
            <div className="mt-1.5 flex items-start gap-1.5 text-xs text-neutral-400">
              <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {item.clientComment}
            </div>
          )}
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs font-medium text-neutral-600 underline"
          >
            {item.clientWhatsapp}
          </a>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.className}`}
        >
          {meta.label}
        </span>
      </div>

      {!closed && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
          <button
            disabled={pending}
            onClick={() => mark("completed")}
            className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" /> Completada
          </button>
          <button
            disabled={pending}
            onClick={() => mark("no_show")}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50"
          >
            <UserX className="h-3.5 w-3.5" /> No asistió
          </button>
          <button
            disabled={pending}
            onClick={() => mark("cancelled")}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" /> Cancelar
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
