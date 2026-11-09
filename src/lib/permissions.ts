import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Liste exhaustive des droits de l'application. */
export type Permission =
  | "utilisateurs.gerer"
  | "parametres.gerer"
  | "journal.lire"
  | "clients.lire"
  | "clients.ecrire"
  | "chambres.lire"
  | "chambres.ecrire"
  | "chambres.changerEtat"
  | "reservations.lire"
  | "reservations.ecrire"
  | "sejours.lire"
  | "sejours.ecrire"
  | "paiements.lire"
  | "paiements.ecrire"
  | "dashboard.lire"
  | "dashboard.operationnel"
  | "dashboard.financier"
  | "rapports.financiers"
  | "rapports.occupation";

const LECTURE_ACTIVITE: readonly Permission[] = [
  "clients.lire",
  "chambres.lire",
  "reservations.lire",
  "sejours.lire",
  "paiements.lire",
  "dashboard.lire",
];

/** Matrice des droits par rôle : c'est l'unique source de vérité. */
const DROITS_PAR_ROLE: Record<Role, readonly Permission[]> = {
  ADMIN: [
    ...LECTURE_ACTIVITE,
    "utilisateurs.gerer",
    "parametres.gerer",
    "journal.lire",
    "clients.ecrire",
    "chambres.ecrire",
    "chambres.changerEtat",
    "reservations.ecrire",
    "sejours.ecrire",
    "paiements.ecrire",
    "dashboard.operationnel",
    "dashboard.financier",
    "rapports.financiers",
    "rapports.occupation",
  ],
  RECEPTIONNISTE: [
    ...LECTURE_ACTIVITE,
    "clients.ecrire",
    "chambres.changerEtat",
    "reservations.ecrire",
    "sejours.ecrire",
    "dashboard.operationnel",
  ],
  COMPTABLE: [
    ...LECTURE_ACTIVITE,
    "paiements.ecrire",
    "dashboard.financier",
    "rapports.financiers",
  ],
  RESPONSABLE: [
    ...LECTURE_ACTIVITE,
    "journal.lire",
    "dashboard.operationnel",
    "dashboard.financier",
    "rapports.financiers",
    "rapports.occupation",
  ],
};

export function aPermission(role: Role, permission: Permission): boolean {
  return DROITS_PAR_ROLE[role].includes(permission);
}

/**
 * Lit l'utilisateur connecté dans la base.
 * Le rôle et l'état du compte ne sont pas repris du jeton : une désactivation
 * ou un changement de rôle s'applique donc dès la requête suivante (RG1).
 * Le mot de passe n'est jamais sélectionné.
 */
const lireUtilisateurDeSession = cache(async (idSession: string) => {
  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id: Number(idSession) },
    select: { id: true, nom: true, prenoms: true, email: true, role: true, actif: true },
  });
  return utilisateur?.actif ? utilisateur : null;
});

export type UtilisateurCourant = NonNullable<
  Awaited<ReturnType<typeof lireUtilisateurDeSession>>
>;

/** Exige un compte connecté et actif, sinon interrompt le rendu ou l'action. */
export async function requireUtilisateur(): Promise<UtilisateurCourant> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const utilisateur = await lireUtilisateurDeSession(session.user.id);
  // Le jeton reste valide : il faut le supprimer, sinon le middleware
  // renverrait l'utilisateur de /login vers /dashboard en boucle.
  if (!utilisateur) redirect("/session-revoquee");

  return utilisateur;
}

/** À appeler au début de chaque page serveur et de chaque Server Action. */
export async function requirePermission(permission: Permission): Promise<UtilisateurCourant> {
  const utilisateur = await requireUtilisateur();
  if (!aPermission(utilisateur.role, permission)) redirect("/acces-refuse");
  return utilisateur;
}
