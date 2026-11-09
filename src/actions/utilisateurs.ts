"use server";

import bcrypt from "bcryptjs";

import { echec, erreursValidation, type EtatAction, executer, succes } from "@/lib/actions";
import { journaliser } from "@/lib/journal";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  schemaCreationUtilisateur,
  schemaModificationUtilisateur,
  schemaReinitialisation,
} from "@/validations/utilisateurs";

const MESSAGE_DOUBLON = { doublon: "Cette adresse e-mail est déjà utilisée." };

export async function creerUtilisateur(_etat: EtatAction, formulaire: FormData): Promise<EtatAction> {
  return executer(async () => {
    const admin = await requirePermission("utilisateurs.gerer");
    const donnees = schemaCreationUtilisateur.safeParse(Object.fromEntries(formulaire));
    if (!donnees.success) return erreursValidation(donnees.error);

    const motDePasse = await bcrypt.hash(donnees.data.motDePasse, 10);
    await prisma.$transaction(async (tx) => {
      const cree = await tx.utilisateur.create({ data: { ...donnees.data, motDePasse } });
      await journaliser(tx, admin.id, "UTILISATEUR_CREE", { utilisateurId: cree.id, email: cree.email });
    });
    return succes("Utilisateur créé.", "/utilisateurs");
  }, MESSAGE_DOUBLON);
}

export async function modifierUtilisateur(
  id: number,
  _etat: EtatAction,
  formulaire: FormData,
): Promise<EtatAction> {
  return executer(async () => {
    const admin = await requirePermission("utilisateurs.gerer");
    const donnees = schemaModificationUtilisateur.safeParse(Object.fromEntries(formulaire));
    if (!donnees.success) return erreursValidation(donnees.error);
    // Évite qu'un administrateur se retire à lui-même l'accès à ce module.
    if (id === admin.id && donnees.data.role !== admin.role) {
      return echec("Vous ne pouvez pas modifier votre propre rôle.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.utilisateur.update({ where: { id }, data: donnees.data });
      await journaliser(tx, admin.id, "UTILISATEUR_MODIFIE", { utilisateurId: id, role: donnees.data.role });
    });
    return succes("Utilisateur modifié.", "/utilisateurs");
  }, MESSAGE_DOUBLON);
}

/** RG1 : un compte n'est jamais supprimé, seulement activé ou désactivé. */
export async function basculerActivation(id: number): Promise<EtatAction> {
  return executer(async () => {
    const admin = await requirePermission("utilisateurs.gerer");
    if (id === admin.id) return echec("Vous ne pouvez pas désactiver votre propre compte.");

    const actif = await prisma.$transaction(async (tx) => {
      const compte = await tx.utilisateur.findUniqueOrThrow({ where: { id }, select: { actif: true } });
      await tx.utilisateur.update({ where: { id }, data: { actif: !compte.actif } });
      await journaliser(tx, admin.id, compte.actif ? "UTILISATEUR_DESACTIVE" : "UTILISATEUR_ACTIVE", {
        utilisateurId: id,
      });
      return !compte.actif;
    });
    return succes(actif ? "Compte activé." : "Compte désactivé.");
  });
}

export async function reinitialiserMotDePasse(
  id: number,
  _etat: EtatAction,
  formulaire: FormData,
): Promise<EtatAction> {
  return executer(async () => {
    const admin = await requirePermission("utilisateurs.gerer");
    const donnees = schemaReinitialisation.safeParse(Object.fromEntries(formulaire));
    if (!donnees.success) return erreursValidation(donnees.error);

    const motDePasse = await bcrypt.hash(donnees.data.motDePasse, 10);
    await prisma.$transaction(async (tx) => {
      await tx.utilisateur.update({ where: { id }, data: { motDePasse } });
      await journaliser(tx, admin.id, "MOT_DE_PASSE_REINITIALISE", { utilisateurId: id });
    });
    return succes("Mot de passe réinitialisé.");
  });
}
