import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { BookingFlow } from "@/components/BookingFlow";
import {
  getBarbershopBySlug,
  getStylistBySlug,
  getStylistServices,
  getStylistGallery,
  getStylistSocialLinks,
} from "@/lib/queries";

export const revalidate = 30;

interface Props {
  params: Promise<{ shop: string; stylist: string }>;
}

export default async function StylistPage({ params }: Props) {
  const { shop: shopSlug, stylist: stylistSlug } = await params;
  const shop = await getBarbershopBySlug(shopSlug);
  if (!shop || shop.status !== "active") notFound();

  const stylist = await getStylistBySlug(shop.id, stylistSlug);
  if (!stylist || !stylist.is_active) notFound();

  const [services, gallery, socials] = await Promise.all([
    getStylistServices(stylist.id, shop.id),
    getStylistGallery(stylist.id),
    getStylistSocialLinks(stylist.id),
  ]);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-5 pb-20">
        <div className="py-8">
          <Link
            href={`/b/${shop.slug}`}
            className="mb-5 flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900"
          >
            <ChevronLeft className="h-4 w-4" /> Volver
          </Link>

          <BookingFlow
            stylist={stylist}
            services={services}
            gallery={gallery}
            socials={socials}
            shopSlug={shop.slug}
          />
        </div>
      </main>
    </>
  );
}
