import { NextResponse } from "next/server";
import {
  findAdminUserByIdWithPassword,
  toPublicAdminUser,
  updateOwnAdminProfile,
} from "@/lib/auth/admin-users";
import { getAdminSession } from "@/lib/auth/get-session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  ADMIN_SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { updateOwnProfileBodySchema } from "@/lib/validations/admin-user";

export async function PATCH(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const parsed = updateOwnProfileBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const name = parsed.data.name.trim();
    if (name.length < 2) {
      return NextResponse.json({ error: "Name must be at least 2 characters" }, { status: 400 });
    }

    const newPassword = parsed.data.newPassword?.trim() ?? "";
    const user = await findAdminUserByIdWithPassword(session.sub);
    if (!user?.passwordHash) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let passwordHash: string | undefined;
    if (newPassword) {
      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters" },
          { status: 400 },
        );
      }
      const currentPassword = parsed.data.currentPassword ?? "";
      if (!currentPassword) {
        return NextResponse.json({ error: "Enter your current password" }, { status: 400 });
      }
      const matches = await verifyPassword(currentPassword, user.passwordHash);
      if (!matches) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }
      passwordHash = await hashPassword(newPassword);
    }

    const updated = await updateOwnAdminProfile(session.sub, { name, passwordHash });
    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const publicUser = toPublicAdminUser(updated);
    const token = await createSessionToken({
      sub: publicUser.id,
      email: publicUser.email,
      name: publicUser.name,
      role: publicUser.role,
    });

    const response = NextResponse.json({ user: publicUser });
    response.cookies.set(ADMIN_SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
