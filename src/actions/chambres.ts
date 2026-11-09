"use server";

import { EtatChambre } from "@prisma/client";

import { erreursValidation, type EtatAction, executer, succes } from "@/lib/actions";
import { TRANSITIONS_ETAT } from "@/lib/chambres";
import { verrouillerChambre } from "@/lib/disponibilite";
import { ErreurMetier } from "@/lib/erreurs";
import { LIBELLES_ETATS } from "@/lib/format";
import { journaliser } from "@/lib/journal";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { schemaChambre, schemaTypeChambre } from "@/validations/chambres";

const DOUBLON_TYPE = { doublon: "Un type de chambre porte déjà ce libellé." };
const DOUBLON_CHAMBRE = { doublon: "Une chambre porte déjà ce numéro." };

export async function creerTypeChambre(_etat: EtatAction, formulaire: FormData): Promise<EtatAction> {
  return executer(async () => {
    const utilisateur = await requirePermission("chambres.ecrire");
    const donnees = schemaTypeChambre.safeParse(Object.fromEntries(formulaire));
    if (!donnees.success) return erreursValidation(donnees.error);

    await prisma.$transaction(async (tx) => {
      const type = await tx.typeChambre.create({ data: donnees.data });
      await journaliser(tx, utilisateur.id, "TYPE_CHAMBRE_CREE", { typeId: type.id, libelle: type.libelle });
    });
    return succes("Type de chambre créé.", "/chambres/types");
  }, DOUBLON_TYPE);
}

export async function modifierTypeChambre(
  id: number,
  _etat: EtatAction,
  formulaire: FormData,
): Promise<EtatAction> {
  return executer(async () => {
    const utilisateur = await requirePermission("chambres.ecrire");
    const donnees = schemaTypeChambre.safeParse(Object.fromEntries(formulaire));
    if (!donnees.success) return erreursValidation(donnees.error);

    await prisma.$transaction(async (tx) => {
      await tx.typeChambre.update({ where: { id }, data: donnees.data });
      await journaliser(tx, utilisateur.id, "TYPE_CHAMBRE_MODIFIE", {
        typeId: id,
        tarifNuit: donnees.data.tarifNuit,
      });
    });
    return succes("Type de chambre modifié.", "/chambres/types");
  }, DOUBLON_TYPE);
}

export async function supprimerTypeChambre(id: number): Promise<EtatAction> {
  return executer(
    async () => {
      const utilisateur = await requirePermission("chambres.ecrire");
      await prisma.$transaction(async (tx) => {
        const type = await tx.typeChambre.delete({ where: { id } });
        await journaliser(tx, utilisateur.id, "TYPE_CHAMBRE_SUPPRIME", { libelle: type.libelle });
      });
      return succes("Type de chambre supprimé.", "/chambres/types");
    },
    { reference: "Ce type est utilisé par des chambres : il ne peut pas être supprimé." },
  );
}

export async function creerChambre(_etat: EtatAction, formulaire: FormData): Promise<EtatAction> {
  return executer(async () => {
    const utilisateur = await requirePermission("chambres.ecrire");
    const donnees = schemaChambre.safeParse(Object.fromEntries(formulaire));
    if (!donnees.success) return erreursValidation(donnees.error);

    await prisma.$transaction(async (tx) => {
      const chambre = await tx.chambre.create({ data: donnees.data });
      await journaliser(tx, utilisateur.id, "CHAMBRE_CREEE", { chambreId: chambre.id, numero: chambre.numero });
    });
    return succes("Chambre créée.", "/chambres");
  }, DOUBLON_CHAMBRE);
}

export async function modifierChambre(
  id: number,
  _etat: EtatAction,
  formulaire: FormData,
): Promise<EtatAction> {
  return executer(async () => {
    const utilisateur = await requirePermission("chambres.ecrire");
    const donnees = schemaChambre.safeParse(Object.fromEntries(formulaire));
    if (!donnees.success) return erreursValidation(donnees.error);

    await prisma.$transaction(async (tx) => {
      await tx.chambre.update({ where: { id }, data: donnees.data });
      await journaliser(tx, utilisateur.id, "CHAMBRE_MODIFIEE", { chambreId: id, numero: donnees.data.numero });
    });
    return succes("Chambre modifiée.", "/chambres");
  }, DOUBLON_CHAMBRE);
}

export async function supprimerChambre(id: number): Promise<EtatAction> {
  return executer(
    async () => {
      const utilisateur = await requirePermission("chambres.ecrire");
      await prisma.$transaction(async (tx) => {
        const chambre = await tx.chambre.delete({ where: { id } });
        await journaliser(tx, utilisateur.id, "CHAMBRE_SUPPRIMEE", { numero: chambre.numero });
      });
      return succes("Chambre supprimée.", "/chambres");
    },
    { reference: "Cette chambre possède un historique : elle ne peut pas être supprimée. Mettez-la hors service." },
  );
}

/** Changement d'état manuel, par exemple après le nettoyage (RG8). */
export async function changerEtatChambre(id: number, nouvelEtat: EtatChambre): Promise<EtatAction> {
  return executer(async () => {
    const utilisateur = await requirePermission("chambres.changerEtat");

    await prisma.$transaction(async (tx) => {
      await verrouillerChambre(tx, id);
      const chambre = await tx.chambre.findUniqueOrThrow({ where: { id } });
      if (!TRANSITIONS_ETAT[chambre.etat].includes(nouvelEtat)) {
        throw new ErreurMetier(
          `Passage de « ${LIBELLES_ETATS[chambre.etat]} » à « ${LIBELLES_ETATS[nouvelEtat]} » non autorisé.`,
        );
      }
      await tx.chambre.update({ where: { id }, data: { etat: nouvelEtat } });
      await journaliser(tx, utilisateur.id, "CHAMBRE_ETAT_MODIFIE", {
        numero: chambre.numero,
        de: chambre.etat,
        vers: nouvelEtat,
      });
    });
    return succes(`Chambre passée à l'état « ${LIBELLES_ETATS[nouvelEtat]} ».`);
  });
}
