import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/app/generated/prisma/client";

// Next.js dev-mode hot reload creates a new module instance per edit; without
// a global singleton this leaks a new connection pool on every save.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createClient() {
  const adapter = new PrismaMariaDb({
    host: requireEnv("DB_HOST"),
    port: Number(requireEnv("DB_PORT")),
    user: requireEnv("DB_USER"),
    password: requireEnv("DB_PASSWORD"),
    database: requireEnv("DB_NAME"),
    ssl: { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" },
    // Small pool per serverless instance (each cold start gets its own pool
    // anyway — a large per-instance limit just multiplies total connections
    // against Aiven under concurrent invocations, SRS §11 spirit re: budget).
    connectionLimit: 3,
    // Generous timeouts: a serverless cold start adds latency on top of the
    // TLS handshake to a managed DB in another region, and the driver's
    // 10s default has been observed too tight on Vercel against Aiven.
    connectTimeout: 20000,
    acquireTimeout: 20000,
  }, {
    // Surfaces the real underlying network error (ETIMEDOUT/ECONNREFUSED/etc.)
    // in server logs — Prisma's own error wrapping otherwise buries it a few
    // `cause` levels deep, which log viewers commonly truncate.
    onConnectionError: (err) => {
      console.error("[db] pool connection error:", {
        message: err.message,
        code: err.code,
        errno: err.errno,
        sqlState: err.sqlState,
        cause: err.cause,
      });
    },
  });

  return new PrismaClient({ adapter });
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
