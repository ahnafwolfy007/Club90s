import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/context";
import { ProfileForm } from "@/components/profile/profile-form";
import { AchievementsSection } from "@/components/profile/achievements-section";

export default async function ProfilePage() {
  const ctx = await getCurrentUser();
  if (!ctx) redirect("/login");

  const member = await prisma.member.findUnique({
    where: { id: ctx.memberId },
    include: { user: { select: { email: true } } },
  });
  if (!member) redirect("/login");

  return (
    <div className="fade-up flex flex-col gap-4 px-4 py-4">
      <h1 className="gold-gradient font-display text-xl font-semibold tracking-wide">My profile</h1>
      <ProfileForm
        member={{
          id: member.id,
          fullName: member.fullName,
          position: member.position,
          jerseyNumber: member.jerseyNumber,
          preferredFoot: member.preferredFoot,
          phone: member.phone,
          dob: member.dob ? member.dob.toISOString() : null,
          emergencyContact: member.emergencyContact,
          email: member.user.email,
        }}
      />
      <AchievementsSection />
    </div>
  );
}
