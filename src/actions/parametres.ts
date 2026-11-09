"use server";

import { erreursValidation, type EtatAction, executer, succes } from "@/lib/actions";
import { journaliser } from "@/lib/journal";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { schemaParametres } from "@/validations/utilisateurs";

export async function enregistrerParametres(_etat: EtatAction, formulaire: FormData): Promise<EtatAction> {
  return executer(async () => {
    const admin = await requirePermission("parametres.gerer");
    const donnees = schemaParametres.safeParse(Object.fromEntries(formulaire));
    if (!donnees.success) return erreursValidation(donnees.error);

    await prisma.$transaction(async (tx) => {
      for (const [cle, valeur] of Object.entries(donnees.data)) {
        await tx.parametre.upsert({ where: { cle }, create: { cle, valeur }, update: { valeur } });
      }
      await journaliser(tx, admin.id, "PARAMETRES_MODIFIES", donnees.data);
    });
    return succes("Paramètres enregistrés.");
  });
}
