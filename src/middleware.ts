import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";

/**
 * Première barrière : redirige vers /login toute requête sans session.
 * Le contrôle des droits par rôle est fait par requirePermission() côté serveur.
 */
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
