"use client";

import { useState, useRef, useTransition } from "react";
import { Camera, Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Photo } from "@/components/ui";
import { dayLabel } from "@/lib/format";
import {
  updateShopAction,
  updateShopImageAction,
  updateHoursAction,
  type HourInput,
} from "@/app/dashboard/barberia/actions";
import type { Barbershop, BusinessHour } from "@/lib/types";

const BUCKET = "media";
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Lunes ... Domingo

function ext(name: string) {
  const p = name.split(".");
  return p.length > 1 ? p.pop()!.toLowerCase() : "jpg";
}

function hhmm(t: string | null): string {
  return t ? t.slice(0, 5) : "";
}

export function ShopConfigEditor({
  shop,
  hours,
}: {
  shop: Barbershop;
  hours: BusinessHour[];
}) {
  const supabase = createClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function flash(text: string) {
    setMsg(text);
    setErr(null);
    setTimeout(() => setMsg(null), 2000);
  }

  // ----- Datos -----
  const [name, setName] = useState(shop.name);
  const [tagline, setTagline] = useState(shop.tagline ?? "");
  const [about, setAbout] = useState(shop.about ?? "");
  const [address, setAddress] = useState(shop.address ?? "");
  const [savingData, startData] = useTransition();

  function saveData() {
    setErr(null);
    startData(async () => {
      const r = await updateShopAction({ name, tagline, about, address });
      if (r.ok) flash("Datos guardados");
      else setErr(r.error ?? "Error");
    });
  }

  // ----- Portada -----
  const [cover, setCover] = useState(shop.cover_url);
  const [uploading, setUploading] = useState(false);
  const coverInput = useRef<HTMLInputElement>(null);

  async function onCover(file: File) {
    setErr(null);
    setUploading(true);
    try {
      const path = `shops/${shop.id}/cover-${Date.now()}.${ext(file.name)}`;
      const up = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true });
      if (up.error) throw up.error;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const r = await updateShopImageAction("cover_url", data.publicUrl);
      if (!r.ok) throw new Error(r.error);
      setCover(data.publicUrl);
      flash("Portada actualizada");
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  // ----- Horarios -----
  const initialHours: Record<number, HourInput> = {};
  for (const d of DAY_ORDER) {
    const row = hours.find((h) => h.day_of_week === d);
    initialHours[d] = {
      day_of_week: d,
      open_time: hhmm(row?.open_time ?? null) || "09:00",
      close_time: hhmm(row?.close_time ?? null) || "18:00",
      is_closed: row?.is_closed ?? false,
    };
  }
  const [hoursState, setHoursState] = useState(initialHours);
  const [savingHours, startHours] = useTransition();

  function setDay(d: number, patch: Partial<HourInput>) {
    setHoursState((prev) => ({ ...prev, [d]: { ...prev[d], ...patch } }));
  }

  function saveHours() {
    setErr(null);
    startHours(async () => {
      const r = await updateHoursAction(DAY_ORDER.map((d) => hoursState[d]));
      if (r.ok) flash("Horarios guardados");
      else setErr(r.error ?? "Error");
    });
  }

  return (
    <div className="space-y-6">
      {(msg || err) && (
        <div
          className={`rounded-lg px-4 py-2.5 text-sm ${
            err ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
          }`}
        >
          {err ?? (
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4" /> {msg}
            </span>
          )}
        </div>
      )}

      {/* Portada */}
      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="relative">
          <Photo
            src={cover}
            alt={name}
            label
            className="h-40 w-full"
          />
          <button
            onClick={() => coverInput.current?.click()}
            disabled={uploading}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-neutral-900/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-900"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
            Cambiar portada
          </button>
          <input
            ref={coverInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onCover(e.target.files[0])}
          />
        </div>
      </section>

      {/* Datos */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 font-semibold tracking-tight">Datos de la barbería</h2>
        <div className="space-y-4">
          <Field label="Nombre" value={name} onChange={setName} />
          <Field
            label="Eslogan"
            value={tagline}
            onChange={setTagline}
            placeholder="Ej. Barbería premium"
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium">Descripción</label>
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              rows={3}
              placeholder="Quiénes somos…"
              className="w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-neutral-900"
            />
          </div>
          <Field label="Dirección" value={address} onChange={setAddress} />
          <button
            onClick={saveData}
            disabled={savingData}
            className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:bg-neutral-300"
          >
            {savingData ? "Guardando…" : "Guardar datos"}
          </button>
        </div>
      </section>

      {/* Horarios */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 font-semibold tracking-tight">Horarios de atención</h2>
        <div className="space-y-2">
          {DAY_ORDER.map((d) => {
            const h = hoursState[d];
            return (
              <div
                key={d}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 px-3 py-2.5"
              >
                <span className="w-24 text-sm font-medium">{dayLabel(d)}</span>
                {h.is_closed ? (
                  <span className="flex-1 text-sm text-neutral-400">Cerrado</span>
                ) : (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="time"
                      value={h.open_time ?? ""}
                      onChange={(e) => setDay(d, { open_time: e.target.value })}
                      className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-900"
                    />
                    <span className="text-neutral-400">a</span>
                    <input
                      type="time"
                      value={h.close_time ?? ""}
                      onChange={(e) => setDay(d, { close_time: e.target.value })}
                      className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-900"
                    />
                  </div>
                )}
                <label className="flex items-center gap-1.5 text-xs text-neutral-500">
                  <input
                    type="checkbox"
                    checked={h.is_closed}
                    onChange={(e) => setDay(d, { is_closed: e.target.checked })}
                  />
                  Cerrado
                </label>
              </div>
            );
          })}
        </div>
        <button
          onClick={saveHours}
          disabled={savingHours}
          className="mt-4 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:bg-neutral-300"
        >
          {savingHours ? "Guardando…" : "Guardar horarios"}
        </button>
      </section>
    </div>
  );
}

function Field({
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
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-neutral-900"
      />
    </div>
  );
}
