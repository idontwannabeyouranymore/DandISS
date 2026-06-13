import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditor } from "@/components/ProfileEditor";
import type { Profile, Stylist, StylistGalleryItem, SocialLink } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  const { data: stylist } = await supabase
    .from("stylists")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle<Stylist>();

  return (
    <>
      <DashboardHeader role={profile?.role} />

      <main className="mx-auto max-w-3xl px-5 pb-20 pt-8">
        <Link
          href="/dashboard"
          className="mb-5 flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900"
        >
          <ChevronLeft className="h-4 w-4" /> Volver a la agenda
        </Link>

        <h1 className="text-2xl font-bold tracking-tight">Mi perfil</h1>

        {!stylist ? (
          <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {profile?.role === "owner"
              ? "La edición de perfil es para estilistas. El panel del dueño llega en la Fase 4."
              : "Tu usuario no está vinculado a un estilista. Pide al dueño que te asigne."}
          </p>
        ) : (
          <div className="mt-6">
            <GalleryAndSocial stylist={stylist} />
          </div>
        )}
      </main>
    </>
  );
}

async function GalleryAndSocial({ stylist }: { stylist: Stylist }) {
  const supabase = await createClient();

  const [{ data: gallery }, { data: socials }] = await Promise.all([
    supabase
      .from("stylist_gallery")
      .select("*")
      .eq("stylist_id", stylist.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("social_links")
      .select("*")
      .eq("stylist_id", stylist.id),
  ]);

  return (
    <ProfileEditor
      stylistId={stylist.id}
      initialName={stylist.name}
      initialTitle={stylist.title ?? ""}
      initialBio={stylist.bio ?? ""}
      initialPhoto={stylist.photo_url}
      gallery={(gallery ?? []) as StylistGalleryItem[]}
      socials={(socials ?? []) as SocialLink[]}
    />
  );
}
