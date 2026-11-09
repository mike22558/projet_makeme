import type { NextAuthConfig } from "next-auth";

const HUIT_HEURES = 8 * 60 * 60;

/**
 * Partie de la configuration Auth.js partagée avec le middleware.
 * Le middleware s'exécute à chaque requête : ce fichier reste léger et n'importe
 * ni Prisma ni bcrypt, qui sont réservés à `auth.ts`.
 */
export const authConfig = {
  // L'application est servie par son propre serveur, derrière une adresse locale.
  trustHost: true,
  pages: { signIn: "/login" },
  // La durée correspond à une journée de travail à la réception.
  session: { strategy: "jwt", maxAge: HUIT_HEURES },
  providers: [],
  callbacks: {
    /** Décide si le middleware laisse passer la requête. */
    authorized({ auth, request: { nextUrl } }) {
      const connecte = Boolean(auth?.user);
      if (nextUrl.pathname !== "/login") return connecte;
      return connecte ? Response.redirect(new URL("/dashboard", nextUrl)) : true;
    },
    /** Copie l'identifiant et le rôle dans le jeton à la connexion. */
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    /** Expose l'identifiant et le rôle dans la session. */
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
} satisfies NextAuthConfig;
