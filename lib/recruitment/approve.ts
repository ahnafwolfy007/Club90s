import { prisma } from "@/lib/db/client";
import { issueActivationToken } from "@/lib/auth/activation";
import { sendEmail } from "@/lib/email/send";
import { activationEmail } from "@/lib/email/templates";
import { ApiError, Errors } from "@/lib/api/errors";

/**
 * Approving a recruitment application reuses the same account-activation
 * mechanism as bulk import (SRS §12.3): a prospective member added one at a
 * time is functionally a single-row import.
 */
export async function approveRecruitment(applicationId: string, email: string, reviewedByMemberId: string) {
  const application = await prisma.recruitmentApplication.findUnique({ where: { id: applicationId } });
  if (!application) throw Errors.notFound("Application");
  if (application.status !== "submitted" && application.status !== "in_review") {
    throw new ApiError(409, "ALREADY_REVIEWED", "This application has already been reviewed.");
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new ApiError(409, "EMAIL_TAKEN", "A member with this email already exists.");

  const user = await prisma.user.create({ data: { email, status: "unactivated" } });
  const member = await prisma.member.create({
    data: { userId: user.id, fullName: application.fullName, joiningDate: new Date(), status: "active" },
  });

  await prisma.recruitmentApplication.update({
    where: { id: applicationId },
    data: { status: "approved", reviewedById: reviewedByMemberId },
  });

  const token = await issueActivationToken(user.id);
  const activationUrl = `${process.env.APP_URL}/activate?token=${token}`;
  const email_ = activationEmail(application.fullName, activationUrl);
  await sendEmail(user.email, email_.subject, email_.text);

  return { user, member };
}
