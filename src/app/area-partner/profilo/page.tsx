import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { PartnerPageHeader } from "@/components/partner/page-header";
import { ProfileForm } from "@/components/partner/profile-form";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { requirePartner } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { partners, users } from "@/lib/db/schema";

export const metadata = { title: "Profilo" };

export default function ProfilePage() {
  return (
    <Suspense fallback={<PartnerSkeleton />}>
      <Profile />
    </Suspense>
  );
}

async function Profile() {
  const { user, partner, memberRole } = await requirePartner();
  const [[p], [u]] = await Promise.all([
    db
      .select({
        businessName: partners.businessName,
        vatNumber: partners.vatNumber,
        address: partners.address,
        tagline: partners.tagline,
        description: partners.description,
        phone: partners.phone,
        email: partners.email,
      })
      .from(partners)
      .where(eq(partners.id, partner.id)),
    db.select({ avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, user.id)),
  ]);
  const [firstName, ...rest] = user.name.split(" ");

  return (
    <div className="flex flex-col gap-6">
      <PartnerPageHeader title="Profilo" subtitle="I tuoi dati e quelli della tua azienda" partnerName={partner.displayName} logoUrl={partner.logoUrl} />
      <ProfileForm
        canEditFiscal={memberRole === "owner"}
        values={{
          ...p,
          address: p.address ?? "",
          displayName: partner.displayName,
          logoUrl: partner.logoUrl,
          avatarUrl: u?.avatarUrl ?? null,
          firstName,
          lastName: rest.join(" "),
        }}
      />
    </div>
  );
}
