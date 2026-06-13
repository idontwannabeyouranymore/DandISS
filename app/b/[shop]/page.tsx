import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  Clock,
  MapPin,
  Star,
  Instagram,
  Facebook,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Monogram, Photo, Pill } from "@/components/ui";
import {
  getBarbershopBySlug,
  getBusinessHours,
  getStylistsByShop,
  getShopSocialLinks,
} from "@/lib/queries";
import { dayLabel, formatTimeLabel } from "@/lib/format";

export const revalidate = 60;

interface Props {
  params: Promise<{ shop: string }>;
}

const SOCIAL_ICONS: Record<string, typeof Instagram> = {
  instagram: Instagram,
  facebook: Facebook,
};

export default async function BarbershopPage({ params }: Props) {
  const { shop: shopSlug } = await params;
  const shop = await getBarbershopBySlug(shopSlug);
  if (!shop || shop.status !== "active") notFound();

  const [hours, stylists, socials] = await Promise.all([
    getBusinessHours(shop.id),
    getStylistsByShop(shop.id),
    getShopSocialLinks(shop.id),
  ]);

  const openDays = hours.filter(
    (h) => !h.is_closed && h.open_time && h.close_time
  );

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-5 pb-20">
        <div className="py-8">
          <Link
            href="/"
            className="mb-5 flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900"
          >
            <ChevronLeft className="h-4 w-4" /> Volver
          </Link>

          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <Photo
              className="h-44 w-full sm:h-52"
              label
              src={shop.cover_url}
              alt={shop.name}
            />
            <div className="p-6">
              <h1 className="text-2xl font-bold tracking-tight">{shop.name}</h1>
              {shop.tagline && (
                <div className="mt-1 flex items-center gap-2 text-sm text-neutral-500">
                  <Pill>{shop.tagline}</Pill>
                </div>
              )}
              {shop.about && (
                <p className="mt-4 max-w-2xl text-sm text-neutral-600">
                  {shop.about}
                </p>
              )}

              <div className="mt-5 space-y-1.5 text-sm text-neutral-600">
                {openDays.map((h) => (
                  <div key={h.id} className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-neutral-400" />
                    <span className="w-24 text-neutral-400">
                      {dayLabel(h.day_of_week)}
                    </span>
                    {formatTimeLabel(h.open_time!)} –{" "}
                    {formatTimeLabel(h.close_time!)}
                  </div>
                ))}
                {shop.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-neutral-400" />
                    {shop.address}
                  </div>
                )}
              </div>

              {socials.length > 0 && (
                <div className="mt-4 flex gap-3 text-neutral-400">
                  {socials.map((s) => {
                    const Icon = SOCIAL_ICONS[s.platform.toLowerCase()];
                    return Icon ? (
                      <a
                        key={s.id}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-neutral-900"
                      >
                        <Icon className="h-5 w-5" />
                      </a>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </div>

          <h2 className="mb-4 mt-9 text-lg font-semibold tracking-tight">
            Nuestros estilistas
          </h2>
          {stylists.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Esta barbería aún no tiene estilistas publicados.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stylists.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border border-neutral-200 bg-white p-5 text-center"
                >
                  {t.photo_url ? (
                    <Photo
                      src={t.photo_url}
                      alt={t.name}
                      className="mx-auto h-16 w-16 rounded-full"
                    />
                  ) : (
                    <Monogram
                      name={t.name}
                      size="h-16 w-16 mx-auto"
                      text="text-lg"
                    />
                  )}
                  <div className="mt-3 font-medium">{t.name}</div>
                  <div className="text-xs text-neutral-500">{t.title}</div>
                  {t.rating != null && (
                    <div className="mt-1.5 flex items-center justify-center gap-1 text-sm">
                      <Star className="h-3.5 w-3.5 fill-neutral-900" /> {t.rating}
                    </div>
                  )}
                  <Link
                    href={`/b/${shop.slug}/${t.slug}`}
                    className="mt-4 block w-full rounded-lg border border-neutral-300 py-2 text-sm font-medium hover:bg-neutral-50"
                  >
                    Ver perfil
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
