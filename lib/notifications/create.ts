import { prisma } from "@/lib/db/client";

export async function notifyUser(userId: string, type: string, payload: Record<string, unknown>) {
  await prisma.notification.create({ data: { userId, type, payload: payload as object } });
}

export async function notifyMember(memberId: string, type: string, payload: Record<string, unknown>) {
  const member = await prisma.member.findUnique({ where: { id: memberId }, select: { userId: true } });
  if (!member) return;
  await notifyUser(member.userId, type, payload);
}
