import { prisma } from "@/lib/db/client";
import { recordAudit } from "@/lib/audit/log";
import { ApiError, Errors } from "@/lib/api/errors";

/**
 * Folds one member record into another and deletes the source.
 *
 * This exists because importing the club's finance sheet creates a record for
 * every name that appears there, and some of those are the same person as a
 * registered member under a different spelling ("Shaikhul Apon" vs "NH
 * Shaikhul Islam"). Matching them automatically would risk misattributing
 * someone's payment history, so the app imports them separately and an admin
 * confirms the merge here.
 *
 * Everything the source owns is reassigned to the target before deletion, so
 * no financial history is lost. Where a uniqueness constraint would collide
 * (both already RSVP'd to the same match, say), the target's row wins and the
 * source's is dropped — it's the same person either way.
 */
export async function mergeMembers(sourceId: string, targetId: string, actorUserId: string) {
  if (sourceId === targetId) {
    throw new ApiError(422, "VALIDATION_ERROR", "Pick two different members.");
  }

  const [source, target] = await Promise.all([
    prisma.member.findUnique({ where: { id: sourceId }, include: { user: true, roleAssignments: { where: { status: "active" } } } }),
    prisma.member.findUnique({ where: { id: targetId }, include: { user: true } }),
  ]);
  if (!source) throw Errors.notFound("Source member");
  if (!target) throw Errors.notFound("Target member");

  // Roles carry permissions; silently moving or dropping them would be a
  // security decision the admin didn't make explicitly.
  if (source.roleAssignments.length > 0) {
    throw new ApiError(
      409,
      "SOURCE_HAS_ROLES",
      "Remove the source member's roles before merging, so no permission is transferred by accident.",
    );
  }

  const summary = await prisma.$transaction(async (tx) => {
    const moved = { transactions: 0, rsvps: 0, teamPlayers: 0, posts: 0, achievements: 0, tournamentEntries: 0 };

    const tx1 = await tx.financialTransaction.updateMany({ where: { memberId: sourceId }, data: { memberId: targetId } });
    moved.transactions = tx1.count;
    await tx.financialTransaction.updateMany({ where: { recordedById: sourceId }, data: { recordedById: targetId } });
    await tx.financialTransaction.updateMany({ where: { voidedById: sourceId }, data: { voidedById: targetId } });

    // Drop source rows that would collide with the target's, then move the rest.
    const targetRsvpMatches = (await tx.matchRsvp.findMany({ where: { memberId: targetId }, select: { matchId: true } })).map((r) => r.matchId);
    await tx.matchRsvp.deleteMany({ where: { memberId: sourceId, matchId: { in: targetRsvpMatches } } });
    moved.rsvps = (await tx.matchRsvp.updateMany({ where: { memberId: sourceId }, data: { memberId: targetId } })).count;

    const targetTeams = (await tx.teamPlayer.findMany({ where: { memberId: targetId }, select: { teamId: true } })).map((r) => r.teamId);
    await tx.teamPlayer.deleteMany({ where: { memberId: sourceId, teamId: { in: targetTeams } } });
    moved.teamPlayers = (await tx.teamPlayer.updateMany({ where: { memberId: sourceId }, data: { memberId: targetId } })).count;

    const targetTournaments = (await tx.tournamentPlayer.findMany({ where: { memberId: targetId }, select: { tournamentId: true } })).map((r) => r.tournamentId);
    await tx.tournamentPlayer.deleteMany({ where: { memberId: sourceId, tournamentId: { in: targetTournaments } } });
    moved.tournamentEntries = (await tx.tournamentPlayer.updateMany({ where: { memberId: sourceId }, data: { memberId: targetId } })).count;

    const targetPosts = (await tx.postReaction.findMany({ where: { memberId: targetId }, select: { postId: true } })).map((r) => r.postId);
    await tx.postReaction.deleteMany({ where: { memberId: sourceId, postId: { in: targetPosts } } });
    await tx.postReaction.updateMany({ where: { memberId: sourceId }, data: { memberId: targetId } });

    moved.posts = (await tx.post.updateMany({ where: { authorId: sourceId }, data: { authorId: targetId } })).count;
    await tx.postComment.updateMany({ where: { authorId: sourceId }, data: { authorId: targetId } });
    moved.achievements = (await tx.achievement.updateMany({ where: { memberId: sourceId }, data: { memberId: targetId } })).count;
    await tx.announcement.updateMany({ where: { authorId: sourceId }, data: { authorId: targetId } });
    await tx.match.updateMany({ where: { organizerId: sourceId }, data: { organizerId: targetId } });
    await tx.team.updateMany({ where: { createdById: sourceId }, data: { createdById: targetId } });
    await tx.bid.updateMany({ where: { placedById: sourceId }, data: { placedById: targetId } });
    await tx.tournamentTeam.updateMany({ where: { ownerMemberId: sourceId }, data: { ownerMemberId: targetId } });
    await tx.sector.updateMany({ where: { createdById: sourceId }, data: { createdById: targetId } });
    await tx.importBatch.updateMany({ where: { importedById: sourceId }, data: { importedById: targetId } });
    await tx.clubSetting.updateMany({ where: { updatedById: sourceId }, data: { updatedById: targetId } });
    await tx.roleAssignment.updateMany({ where: { grantedById: sourceId }, data: { grantedById: targetId } });
    await tx.recruitmentApplication.updateMany({ where: { submittedById: sourceId }, data: { submittedById: targetId } });
    await tx.recruitmentApplication.updateMany({ where: { reviewedById: sourceId }, data: { reviewedById: targetId } });
    await tx.election.updateMany({ where: { createdById: sourceId }, data: { createdById: targetId } });
    await tx.election.updateMany({ where: { firstConfirmedById: sourceId }, data: { firstConfirmedById: targetId } });
    await tx.election.updateMany({ where: { secondConfirmedById: sourceId }, data: { secondConfirmedById: targetId } });

    const targetElections = (await tx.electionCandidate.findMany({ where: { memberId: targetId }, select: { electionId: true } })).map((r) => r.electionId);
    await tx.electionCandidate.deleteMany({ where: { memberId: sourceId, electionId: { in: targetElections } } });
    await tx.electionCandidate.updateMany({ where: { memberId: sourceId }, data: { memberId: targetId } });

    // Deleting the user cascades to the member row, its sessions and tokens.
    await tx.user.delete({ where: { id: source.userId } });

    return moved;
  });

  await recordAudit({
    actorId: actorUserId,
    action: "member.merge",
    entityType: "member",
    entityId: targetId,
    before: { mergedMember: source.fullName, email: source.user.email },
    after: { into: target.fullName, moved: summary },
  });

  return { summary, sourceName: source.fullName, targetName: target.fullName };
}
