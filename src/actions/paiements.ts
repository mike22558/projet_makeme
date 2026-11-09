"use server";

import { StatutSejour } from "@prisma/client";

import { erreursValidation, type EtatAction, executer, succes } from "@/lib/actions";
import { ErreurMetier } from "@/lib/erreurs";
import { formaterFcfa } from "@/lib/format";
import { journaliser } from "@/lib/journal";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { soldeActuel } from "@/lib/requetes/sejours";
import { verrouillerSejour } from "@/lib/sejours";
import { schemaPaiement } from "@/validations/sejours";

/** RG10 : un paiement est supérieur à 0 et au plus égal au reste à payer. */
export async function enregistrerPaiement(
  sejourId: number,
  _etat: EtatAction,
  formulaire: FormData,
): Promise<EtatAction> {
  return executer(async () => {
    const utilisateur = await requirePermission("paiements.ecrire");
    const donnees = schemaPaiement.safeParse(Object.fromEntries(formulaire));
    if (!donnees.success) return erreursValidation(donnees.error);

    const paiement = await prisma.$transaction(async (tx) => {
      await verrouillerSejour(tx, sejourId);
      const sejour = await tx.sejour.findUniqueOrThrow({
        where: { id: sejourId },
        include: { paiements: true },
      });
      if (sejour.statut !== StatutSejour.EN_COURS) {
        throw new ErreurMetier("Ce séjour est terminé : aucun paiement ne peut être ajouté.");
      }
      const { reste } = soldeActuel(sejour);
      if (reste === 0) throw new ErreurMetier("Ce séjour est déjà entièrement payé.");
      if (donnees.data.montant > reste) {
        throw new ErreurMetier(`Le montant dépasse le reste à payer (${formaterFcfa(reste)}).`);
      }

      const cree = await tx.paiement.create({
        data: { ...donnees.data, sejourId, enregistreParId: utilisateur.id },
      });
      await journaliser(tx, utilisateur.id, "PAIEMENT", {
        paiementId: cree.id,
        sejourId,
        montant: cree.montant,
        mode: cree.mode,
      });
      return cree;
    });
    return succes("Paiement enregistré.", `/paiements/${paiement.id}/recu`);
  });
}
