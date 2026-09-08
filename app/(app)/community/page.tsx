import { getCurrentUser } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { CommunityTabs } from "@/components/community/community-tabs";

export default async function CommunityPage() {
  const ctx = await getCurrentUser();
  const commsSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.COMMUNICATIONS);
  const canModerate = ctx ? can.moderateFeed(ctx) : false;
  const canPublish = ctx ? can.isAdmin(ctx) || (commsSectorId ? can.isPresidentOfSector(ctx, commsSectorId) : false) : false;

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <h1 className="text-lg font-semibold">Community</h1>
      <CommunityTabs canModerate={canModerate} canPublish={canPublish} />
    </div>
  );
}
