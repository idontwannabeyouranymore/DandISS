"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Scissors, ArrowRight } from "lucide-react";

export interface HeroSlide {
  name: string;
  slug: string;
  tagline: string | null;
  coverUrl: string | null;
}

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const t = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(t);
  }, [slides.length, paused]);

  // Sin barberías: placeholder decorativo.
  if (slides.length === 0) {
    return (
      <div className="relative h-64 w-full overflow-hidden rounded-2xl bg-neutral-800 sm:h-72">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg,#fff 0 1px,transparent 1px 14px)",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Scissors className="h-8 w-8 text-white/40" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative h-64 w-full overflow-hidden rounded-2xl bg-neutral-900 sm:h-72"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((s, i) => (
        <Link
          key={`${s.slug}-${i}`}
          href={`/b/${s.slug}`}
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{
            opacity: i === index ? 1 : 0,
            pointerEvents: i === index ? "auto" : "none",
          }}
          aria-hidden={i !== index}
        >
          {s.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={s.coverUrl}
              alt={s.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-neutral-800">
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(135deg,#fff 0 1px,transparent 1px 14px)",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Scissors className="h-8 w-8 text-white/40" />
              </div>
            </div>
          )}

          {/* Degradado + info */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-white">{s.name}</div>
                {s.tagline && (
                  <div className="text-sm text-white/70">{s.tagline}</div>
                )}
              </div>
              <span className="flex items-center gap-1 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-neutral-900">
                Ver <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </Link>
      ))}

      {/* Indicadores */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.preventDefault();
                setIndex(i);
              }}
              aria-label={`Ir a la imagen ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-white" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
