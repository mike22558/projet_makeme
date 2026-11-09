import { signOut } from "@/auth";

/**
 * Ferme la session d'un compte désactivé pendant qu'il était connecté.
 * Une page serveur ne peut pas supprimer un cookie : un gestionnaire de route est nécessaire.
 */
export async function GET(): Promise<void> {
  await signOut({ redirectTo: "/login?raison=compte_desactive" });
}
