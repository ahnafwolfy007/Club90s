import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, revokeSession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) await revokeSession(token);

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
