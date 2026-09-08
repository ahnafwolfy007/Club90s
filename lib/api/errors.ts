import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function errorJson(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Central mapping from a caught error to the SRS §23.1 error shape. Unexpected errors are logged, never leaked. */
export function handleApiError(err: unknown) {
  if (err instanceof ApiError) {
    return errorJson(err.status, err.code, err.message);
  }
  if (err instanceof ZodError) {
    return errorJson(422, "VALIDATION_ERROR", err.issues.map((i) => i.message).join("; "));
  }
  console.error(err);
  return errorJson(500, "INTERNAL_ERROR", "Something went wrong.");
}

export const Errors = {
  unauthenticated: () => new ApiError(401, "SESSION_EXPIRED", "You must be logged in."),
  forbidden: (message = "You do not have permission to perform this action.") =>
    new ApiError(403, "INSUFFICIENT_PERMISSION", message),
  notFound: (what = "Resource") => new ApiError(404, "NOT_FOUND", `${what} not found.`),
  conflict: (code: string, message: string) => new ApiError(409, code, message),
};
