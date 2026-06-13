"use client";

import { useState, useTransition } from "react";
import { Loader2, Ban, CheckCircle2, Clock3 } from "lucide-react";
import { setBarbershopStatusAction } from "@/app/admin/actions";
import type { Barbershop, BarbershopStatus } from "@/lib/types";

const STATUS_META: Record<
  BarbershopStatus,
  { label: string; className: string }
> = {
  active: { label: "Activa", className: "bg-green-100 text-green-700" },
  suspended: { label: "Suspendida", className: "bg-red-100 text-red-700" },
  pending: { label: "Pendiente", className: "bg-amber-100 text-amber-700" },
};

export interface AdminShopRow extends Barbershop {
  stylistCount: number;
}

export function BarbershopAdminList({ shops }: { shops: AdminShopRow[] }) {
  const [err, setErr] = useState<string | null>(null);

  if (shops.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        Aún no hay barberías registradas en la plataforma.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {err && (
        <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {err}
        </div>
      )}
      {shops.map((shop) => (
        <ShopRow key={shop.id} shop={shop} onError={setErr} />
      ))}
    </div>
  );
}

function ShopRow({
  shop,
  onError,
}: {
  shop: AdminShopRow;
  onError: (m: string | null) => void;
}) {
  const [status, setStatus] = useState<BarbershopStatus>(shop.status);
  const [pending, start] = useTransition();
  const meta = STATUS_META[status];

  function change(next: BarbershopStatus) {
    onError(null);
    const prev = status;
    setStatus(next);
    start(async () => {
      const r = await setBarbershopStatusAction(shop.id, next);
      if (!r.ok) {
        setStatus(prev);
        onError(r.error ?? "Error");
      }
    });
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{shop.name}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}
            >
              {meta.label}
            </span>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
              Plan {shop.plan}
            </span>
          </div>
          <div className="mt-1 text-sm text-neutral-500">
            /{shop.slug} · {shop.stylistCount} estilista
            {shop.stylistCount === 1 ? "" : "s"}
            {shop.address ? ` · ${shop.address}` : ""}
          </div>
        </div>
        {pending && (
          <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
        <button
          disabled={pending || status === "active"}
          onClick={() => change("active")}
          className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50 disabled:opacity-40"
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Activar
        </button>
        <button
          disabled={pending || status === "suspended"}
          onClick={() => change("suspended")}
          className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
        >
          <Ban className="h-3.5 w-3.5" /> Suspender
        </button>
        <button
          disabled={pending || status === "pending"}
          onClick={() => change("pending")}
          className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-50 disabled:opacity-40"
        >
          <Clock3 className="h-3.5 w-3.5" /> Marcar pendiente
        </button>
      </div>
    </div>
  );
}
