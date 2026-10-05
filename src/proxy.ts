import { NextResponse, type NextRequest } from "next/server";
import { canAccessPath, ROLE_HOME } from "@/lib/auth/permissions";
import {
  ADMIN_SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/auth/session";
import type { AdminRole } from "@/lib/validations/admin-user";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/dashboard/admin")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = session.role as AdminRole;
  if (!canAccessPath(role, pathname)) {
    const home = request.nextUrl.clone();
    home.pathname = ROLE_HOME[role];
    home.search = "";
    return NextResponse.redirect(home);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/admin", "/dashboard/admin/:path*"],
};
