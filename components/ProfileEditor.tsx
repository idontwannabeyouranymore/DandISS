"use client";

import { useState, useRef, useTransition } from "react";
import {
  Camera,
  Trash2,
  Plus,
  Loader2,
  Check,
  Instagram,
  Facebook,
  Music2,
  Link as LinkIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Monogram, Photo } from "@/components/ui";
import {
  updateProfileAction,
  uploadStylistPhotoAction,
  uploadGalleryImageAction,
  deleteGalleryImageAction,
  addSocialLinkAction,
  deleteSocialLinkAction,
} from "@/app/dashboard/perfil/actions";
import type { StylistGalleryItem, SocialLink } from "@/lib/types";

const BUCKET = "media";

const PLATFORMS = [
  { value: "instagram", label: "Instagram", Icon: Instagram },
  { value: "facebook", label: "Facebook", Icon: Facebook },
  { value: "tiktok", label: "TikTok", Icon: Music2 },
  { value: "whatsapp", label: "WhatsApp", Icon: LinkIcon },
];

function platformIcon(p: string) {
  return PLATFORMS.find((x) => x.value === p)?.Icon ?? LinkIcon;
}

function ext(name: string) {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "jpg";
}

export function ProfileEditor({
  stylistId,
  initialName,
  initialTitle,
  initialBio,
  initialPhoto,
  gallery,
  socials,
}: {
  stylistId: string;
  initialName: string;
  initialTitle: string;
  initialBio: string;
  initialPhoto: string | null;
  gallery: StylistGalleryItem[];
  socials: SocialLink[];
}) {
  const supabase = createClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function flash(setOk = true, text = "Guardado") {
    if (setOk) {
      setMsg(text);
      setErr(null);
      setTimeout(() => setMsg(null), 2000);
    }
  }

  // -------- Datos del perfil --------
  const [name, setName] = useState(initialName);
  const [title, setTitle] = useState(initialTitle);
  const [bio, setBio] = useState(initialBio);
  const [savingProfile, startProfile] = useTransition();

  function saveProfile() {
    setErr(null);
    startProfile(async () => {
      const r = await updateProfileAction({ name, title, bio });
      if (r.ok) flash(true);
      else setErr(r.error ?? "No se pudo guardar.");
    });
  }

  // -------- Foto --------
  const [photo, setPhoto] = useState(initialPhoto);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);

  async function onPhoto(file: File) {
    setErr(null);
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await uploadStylistPhotoAction(fd);
      if (!r.ok) throw new Error(r.error);
      setPhoto(r.url ?? null);
      flash(true, "Foto actualizada");
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo subir la foto.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  // -------- Galería --------
  const [items, setItems] = useState(gallery);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const galleryInput = useRef<HTMLInputElement>(null);

  async function onGalleryAdd(files: FileList) {
    setErr(null);
    setUploadingGallery(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const r = await uploadGalleryImageAction(fd);
        if (!r.ok) throw new Error(r.error);
      }
      flash(true, "Imagen(es) agregada(s)");
      window.location.reload();
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo subir la imagen.");
      setUploadingGallery(false);
    }
  }

  const [deletingId, setDeletingId] = useState<string | null>(null);
  async function onGalleryDelete(id: string) {
    setErr(null);
    setDeletingId(id);
    const r = await deleteGalleryImageAction(id);
    if (r.ok) {
      setItems((prev) => prev.filter((g) => g.id !== id));
    } else {
      setErr(r.error ?? "No se pudo eliminar.");
    }
    setDeletingId(null);
  }

  // -------- Redes sociales --------
  const [links, setLinks] = useState(socials);
  const [platform, setPlatform] = useState("instagram");
  const [linkUrl, setLinkUrl] = useState("");
  const [savingLink, startLink] = useTransition();

  function addLink() {
    setErr(null);
    startLink(async () => {
      const r = await addSocialLinkAction(platform, linkUrl);
      if (r.ok) {
        setLinkUrl("");
        flash(true, "Red agregada");
        window.location.reload();
      } else {
        setErr(r.error ?? "No se pudo agregar.");
      }
    });
  }

  async function removeLink(id: string) {
    setErr(null);
    const r = await deleteSocialLinkAction(id);
    if (r.ok) setLinks((prev) => prev.filter((l) => l.id !== id));
    else setErr(r.error ?? "No se pudo eliminar.");
  }

  return (
    <div className="space-y-6">
      {(msg || err) && (
        <div
          className={`rounded-lg px-4 py-2.5 text-sm ${
            err
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          {err ?? (
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4" /> {msg}
            </span>
          )}
        </div>
      )}

      {/* Foto + datos */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            {photo ? (
              <Photo
                src={photo}
                alt={name}
                className="h-20 w-20 rounded-full"
              />
            ) : (
              <Monogram name={name || "?"} size="h-20 w-20" text="text-xl" />
            )}
            <button
              onClick={() => photoInput.current?.click()}
              disabled={uploadingPhoto}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-white hover:bg-neutral-700"
              aria-label="Cambiar foto"
            >
              {uploadingPhoto ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
            </button>
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])}
            />
          </div>
          <div className="text-sm text-neutral-500">
            <div className="font-medium text-neutral-900">Foto de perfil</div>
            JPG o PNG. Se mostrará en tu perfil público.
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <Field label="Nombre" value={name} onChange={setName} />
          <Field
            label="Título / especialidad"
            value={title}
            onChange={setTitle}
            placeholder="Ej. Especialista en fades"
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium">Biografía</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Cuéntales tu experiencia…"
              className="w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-neutral-900"
            />
          </div>
          <button
            onClick={saveProfile}
            disabled={savingProfile}
            className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:bg-neutral-300"
          >
            {savingProfile ? "Guardando…" : "Guardar datos"}
          </button>
        </div>
      </section>

      {/* Galería */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold tracking-tight">Galería de trabajos</h2>
          <button
            onClick={() => galleryInput.current?.click()}
            disabled={uploadingGallery}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
          >
            {uploadingGallery ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Agregar
          </button>
          <input
            ref={galleryInput}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files?.length && onGalleryAdd(e.target.files)}
          />
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Aún no subes fotos de tus trabajos.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {items.map((g) => (
              <div key={g.id} className="group relative">
                <Photo
                  src={g.image_url}
                  alt={g.caption ?? ""}
                  className="aspect-square w-full rounded-lg"
                />
                <button
                  onClick={() => onGalleryDelete(g.id)}
                  disabled={deletingId === g.id}
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                  aria-label="Eliminar"
                >
                  {deletingId === g.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Redes sociales */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 font-semibold tracking-tight">Redes sociales</h2>

        {links.length > 0 && (
          <div className="mb-4 space-y-2">
            {links.map((l) => {
              const Icon = platformIcon(l.platform);
              return (
                <div
                  key={l.id}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-neutral-500" />
                    <span className="capitalize text-neutral-500">
                      {l.platform}
                    </span>
                    <span className="truncate text-neutral-400">{l.url}</span>
                  </span>
                  <button
                    onClick={() => removeLink(l.id)}
                    className="text-neutral-400 hover:text-red-600"
                    aria-label="Eliminar red"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-900"
          >
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://…"
            className="flex-1 rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-neutral-900"
          />
          <button
            onClick={addLink}
            disabled={savingLink}
            className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:bg-neutral-300"
          >
            Agregar
          </button>
        </div>
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
