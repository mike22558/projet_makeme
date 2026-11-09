import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z, type ZodError } from "zod";

import { ErreurMetier } from "@/lib/erreurs";

/** Résultat renvoyé par une Server Action au formulaire qui l'a appelée. */
export interface EtatAction {
  succes?: boolean;
  message?: string;
  erreurs?: Record<string, string[] | undefined>;
  redirection?: string;
}

export type ActionFormulaire = (etat: EtatAction, formulaire: FormData) => Promise<EtatAction>;

export function succes(message: string, redirection?: string): EtatAction {
  return { succes: true, message, redirection };
}

export function echec(message: string): EtatAction {
  return { succes: false, message };
}

export function erreursValidation(erreur: ZodError): EtatAction {
  return {
    succes: false,
    message: "Veuillez corriger les champs signalés.",
    erreurs: z.flattenError(erreur).fieldErrors as EtatAction["erreurs"],
  };
}

export function estErreurPrisma(erreur: unknown, code: string): boolean {
  return erreur instanceof Prisma.PrismaClientKnownRequestError && erreur.code === code;
}

interface MessagesErreur {
  /** Violation d'une contrainte d'unicité (P2002). */
  doublon?: string;
  /** Suppression bloquée par l'historique (P2003). */
  reference?: string;
}

/**
 * Exécute le travail d'une Server Action et traduit les erreurs en messages.
 * Les redirections (session expirée, droits insuffisants) sont laissées passer.
 */
export async function executer(
  travail: () => Promise<EtatAction>,
  messages: MessagesErreur = {},
): Promise<EtatAction> {
  try {
    const resultat = await travail();
    // Sans redirection, la page affichée se met à jour. Avec une redirection, on ne la
    // rafraîchit pas : après une suppression, elle afficherait « page introuvable ».
    if (resultat.succes && !resultat.redirection) revalidatePath("/", "layout");
    return resultat;
  } catch (erreur) {
    unstable_rethrow(erreur);
    if (erreur instanceof ErreurMetier) return echec(erreur.message);
    if (messages.doublon && estErreurPrisma(erreur, "P2002")) return echec(messages.doublon);
    if (messages.reference && estErreurPrisma(erreur, "P2003")) return echec(messages.reference);
    console.error("Erreur inattendue dans une Server Action :", erreur);
    return echec("L'opération a échoué. Veuillez réessayer.");
  }
}
