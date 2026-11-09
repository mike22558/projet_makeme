"use server";

import bcrypt from "bcryptjs";
import { AuthError, CredentialsSignin } from "next-auth";

import { signIn, signOut } from "@/auth";
import { echec, erreursValidation, type EtatAction, executer, succes } from "@/lib/actions";
import { journaliser } from "@/lib/journal";
import { requireUtilisateur } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { schemaChangementMotDePasse, schemaConnexion } from "@/validations/auth";

export interface EtatConnexion {
  erreur?: string;
  /** Renvoyé pour que le champ reste rempli après une erreur. */
  email?: string;
}

function messageErreurConnexion(erreur: AuthError): string {
  if (erreur instanceof CredentialsSignin && erreur.code === "compte_desactive") {
    return "Ce compte est désactivé. Contactez l'administrateur.";
  }
  if (erreur instanceof CredentialsSignin) {
    return "Adresse e-mail ou mot de passe incorrect.";
  }
  return "La connexion a échoué. Veuillez réessayer.";
}

export async function connecter(
  _etatPrecedent: EtatConnexion,
  formulaire: FormData,
): Promise<EtatConnexion> {
  const email = String(formulaire.get("email") ?? "");
  const donnees = schemaConnexion.safeParse({
    email,
    motDePasse: formulaire.get("motDePasse"),
  });
  if (!donnees.success) {
    return { email, erreur: "Adresse e-mail ou mot de passe incorrect." };
  }

  try {
    await signIn("credentials", { ...donnees.data, redirectTo: "/dashboard" });
    return {};
  } catch (erreur) {
    // La redirection de succès est transmise sous forme d'exception : on la relance.
    if (erreur instanceof AuthError) {
      return { email, erreur: messageErreurConnexion(erreur) };
    }
    throw erreur;
  }
}

export async function deconnecter(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

export async function changerMotDePasse(
  _etatPrecedent: EtatAction,
  formulaire: FormData,
): Promise<EtatAction> {
  return executer(async () => {
    const utilisateur = await requireUtilisateur();
    const donnees = schemaChangementMotDePasse.safeParse(Object.fromEntries(formulaire));
    if (!donnees.success) return erreursValidation(donnees.error);

    const compte = await prisma.utilisateur.findUniqueOrThrow({
      where: { id: utilisateur.id },
      select: { motDePasse: true },
    });
    const actuelValide = await bcrypt.compare(donnees.data.motDePasseActuel, compte.motDePasse);
    if (!actuelValide) {
      return {
        ...echec("Le mot de passe n'a pas été modifié."),
        erreurs: { motDePasseActuel: ["Le mot de passe actuel est incorrect."] },
      };
    }

    const empreinte = await bcrypt.hash(donnees.data.nouveauMotDePasse, 10);
    await prisma.$transaction(async (tx) => {
      await tx.utilisateur.update({
        where: { id: utilisateur.id },
        data: { motDePasse: empreinte },
      });
      await journaliser(tx, utilisateur.id, "MOT_DE_PASSE_MODIFIE");
    });

    return succes("Votre mot de passe a été modifié.");
  });
}
