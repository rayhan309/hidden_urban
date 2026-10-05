import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";
import type { AdminRole } from "@/lib/validations/admin-user";

export const ADMIN_SESSION_COOKIE = "eco_admin_session";
const SESSION_TTL = "7d";

export type AdminSessionPayload = {
  sub: string;
  email: string;
  name: string;
  role: AdminRole;
};

function getSecretKey() {
  const secret =
    process.env.AUTH_SECRET?.trim() ||
    // Live hosts that omit AUTH_SECRET still need a stable signing key.
    process.env.MONGODB_URI?.trim() ||
    "hidden-urban-admin-session-fallback-key";

  if (secret.length < 16) {
    throw new Error("AUTH_SECRET must be at least 16 characters.");
  }

  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: AdminSessionPayload): Promise<string> {
  return new SignJWT({
    email: payload.email,
    name: payload.name,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const email = typeof payload.email === "string" ? payload.email : null;
    const name = typeof payload.name === "string" ? payload.name : null;
    const role = payload.role as AdminRole | undefined;

    if (!sub || !email || !name || !role) return null;
    if (!["super_admin", "shop_manager", "moderator"].includes(role)) return null;

    return { sub, email, name, role };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAgeSeconds = 60 * 60 * 24 * 7) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
