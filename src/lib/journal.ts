import type { Prisma } from "@prisma/client";

/** Actions sensibles tracées dans le journal d'activité (RG13), avec leur libellé. */
export const ACTIONS_JOURNAL = {
  CONNEXION: "Connexion",
  MOT_DE_PASSE_MODIFIE: "Mot de passe modifié",
  UTILISATEUR_CREE: "Utilisateur créé",
  UTILISATEUR_MODIFIE: "Utilisateur modifié",
  UTILISATEUR_ACTIVE: "Compte activé",
  UTILISATEUR_DESACTIVE: "Compte désactivé",
  MOT_DE_PASSE_REINITIALISE: "Mot de passe réinitialisé",
  PARAMETRES_MODIFIES: "Paramètres modifiés",
  CLIENT_CREE: "Client créé",
  CLIENT_MODIFIE: "Client modifié",
  TYPE_CHAMBRE_CREE: "Type de chambre créé",
  TYPE_CHAMBRE_MODIFIE: "Type de chambre modifié",
  TYPE_CHAMBRE_SUPPRIME: "Type de chambre supprimé",
  CHAMBRE_CREEE: "Chambre créée",
  CHAMBRE_MODIFIEE: "Chambre modifiée",
  CHAMBRE_SUPPRIMEE: "Chambre supprimée",
  CHAMBRE_ETAT_MODIFIE: "État de chambre modifié",
  RESERVATION_CREEE: "Réservation créée",
  RESERVATION_MODIFIEE: "Réservation modifiée",
  RESERVATION_ANNULEE: "Réservation annulée",
  ARRIVEE: "Arrivée",
  DEPART: "Départ",
  PAIEMENT: "Paiement",
} as const;

export type ActionJournal = keyof typeof ACTIONS_JOURNAL;

/**
 * Écrit une entrée dans le journal.
 * Le client reçu en paramètre permet d'écrire dans une transaction en cours :
 * l'action et sa trace sont alors enregistrées ensemble, ou pas du tout.
 */
export async function journaliser(
  client: Prisma.TransactionClient,
  utilisateurId: number,
  action: ActionJournal,
  details?: Prisma.InputJsonObject,
): Promise<void> {
  await client.journalActivite.create({
    data: { utilisateurId, action, details },
  });
}
