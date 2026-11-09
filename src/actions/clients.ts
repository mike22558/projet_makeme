"use server";

import { erreursValidation, type EtatAction, executer, succes } from "@/lib/actions";
import { journaliser } from "@/lib/journal";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { schemaClient } from "@/validations/clients";

export async function creerClient(_etat: EtatAction, formulaire: FormData): Promise<EtatAction> {
  return executer(async () => {
    const utilisateur = await requirePermission("clients.ecrire");
    const donnees = schemaClient.safeParse(Object.fromEntries(formulaire));
    if (!donnees.success) return erreursValidation(donnees.error);

    const client = await prisma.$transaction(async (tx) => {
      const cree = await tx.client.create({ data: donnees.data });
      await journaliser(tx, utilisateur.id, "CLIENT_CREE", { clientId: cree.id, nom: cree.nom });
      return cree;
    });
    return succes("Client enregistré.", `/clients/${client.id}`);
  });
}

export async function modifierClient(
  id: number,
  _etat: EtatAction,
  formulaire: FormData,
): Promise<EtatAction> {
  return executer(async () => {
    const utilisateur = await requirePermission("clients.ecrire");
    const donnees = schemaClient.safeParse(Object.fromEntries(formulaire));
    if (!donnees.success) return erreursValidation(donnees.error);

    await prisma.$transaction(async (tx) => {
      await tx.client.update({ where: { id }, data: donnees.data });
      await journaliser(tx, utilisateur.id, "CLIENT_MODIFIE", { clientId: id });
    });
    return succes("Client modifié.", `/clients/${id}`);
  });
}
