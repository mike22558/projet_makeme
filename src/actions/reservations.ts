"use server";

import { Prisma, StatutReservation } from "@prisma/client";

import {
  echec,
  erreursValidation,
  estErreurPrisma,
  type EtatAction,
  executer,
  succes,
} from "@/lib/actions";
import { verifierCapacite, verifierDisponibilite } from "@/lib/disponibilite";
import { ErreurMetier } from "@/lib/erreurs";
import { journaliser } from "@/lib/journal";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { schemaClient } from "@/validations/clients";
import { type DemandeReservation, schemaAnnulation, schemaReservation } from "@/validations/reservations";

const NB_TENTATIVES_CODE = 3;
const TX = { timeout: 15_000, maxWait: 10_000 };

type DonneesReservation = ReturnType<typeof schemaReservation.parse>;

/** Prochain code de l'année, de la forme RES-2026-0001. */
async function prochainCode(tx: Prisma.TransactionClient): Promise<string> {
  const annee = new Date().getUTCFullYear();
  const prefixe = `RES-${annee}-`;
  const derniere = await tx.reservation.findFirst({
    where: { code: { startsWith: prefixe } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  const rang = derniere ? Number(derniere.code.slice(prefixe.length)) + 1 : 1;
  return `${prefixe}${String(rang).padStart(4, "0")}`;
}

/**
 * RG2 à RG6 : enregistre la réservation après les contrôles dans la transaction.
 * Le client est obtenu APRÈS la vérification : le verrou de la chambre doit rester
 * la première opération, sinon MySQL figerait trop tôt sa vue des données.
 */
async function inserer(
  tx: Prisma.TransactionClient,
  donnees: DonneesReservation,
  obtenirClientId: (tx: Prisma.TransactionClient) => Promise<number>,
  utilisateurId: number,
) {
  const periode = { debut: donnees.arrivee, fin: donnees.depart };
  const chambre = await verifierDisponibilite(tx, donnees.chambreId, periode);
  verifierCapacite(donnees.nbPersonnes, chambre.type.capacite);

  const reservation = await tx.reservation.create({
    data: {
      code: await prochainCode(tx),
      clientId: await obtenirClientId(tx),
      chambreId: donnees.chambreId,
      dateArriveePrevue: donnees.arrivee,
      dateDepartPrevue: donnees.depart,
      nbPersonnes: donnees.nbPersonnes,
      tarifNuitApplique: chambre.type.tarifNuit, // RG6
      statut: StatutReservation.CONFIRMEE,
      creeParId: utilisateurId,
    },
  });
  await journaliser(tx, utilisateurId, "RESERVATION_CREEE", {
    code: reservation.code,
    chambre: chambre.numero,
  });
  return reservation;
}

/** Deux réservations simultanées peuvent obtenir le même code : on recommence. */
async function avecReprise<T>(travail: () => Promise<T>): Promise<T> {
  for (let tentative = 1; ; tentative++) {
    try {
      return await travail();
    } catch (erreur) {
      if (tentative >= NB_TENTATIVES_CODE || !estErreurPrisma(erreur, "P2002")) throw erreur;
    }
  }
}

export async function creerReservationClientExistant(
  demande: DemandeReservation,
  clientId: number,
): Promise<EtatAction> {
  return executer(async () => {
    const utilisateur = await requirePermission("reservations.ecrire");
    const donnees = schemaReservation.safeParse(demande);
    if (!donnees.success) return echec(donnees.error.issues[0].message);

    const reservation = await avecReprise(() =>
      prisma.$transaction((tx) => inserer(tx, donnees.data, async () => clientId, utilisateur.id), TX),
    );
    return succes(`Réservation ${reservation.code} enregistrée.`, `/reservations/${reservation.id}`);
  });
}

export async function creerReservationNouveauClient(
  demande: DemandeReservation,
  _etat: EtatAction,
  formulaire: FormData,
): Promise<EtatAction> {
  return executer(async () => {
    const utilisateur = await requirePermission("reservations.ecrire");
    const donnees = schemaReservation.safeParse(demande);
    if (!donnees.success) return echec(donnees.error.issues[0].message);
    const client = schemaClient.safeParse(Object.fromEntries(formulaire));
    if (!client.success) return erreursValidation(client.error);

    const reservation = await avecReprise(() =>
      prisma.$transaction(
        (tx) =>
          inserer(
            tx,
            donnees.data,
            async (t) => {
              const cree = await t.client.create({ data: client.data });
              await journaliser(t, utilisateur.id, "CLIENT_CREE", { clientId: cree.id, nom: cree.nom });
              return cree.id;
            },
            utilisateur.id,
          ),
        TX,
      ),
    );
    return succes(`Réservation ${reservation.code} enregistrée.`, `/reservations/${reservation.id}`);
  });
}

/** RG12 : seule une réservation CONFIRMEE peut être modifiée. */
export async function modifierReservation(
  id: number,
  _etat: EtatAction,
  formulaire: FormData,
): Promise<EtatAction> {
  return executer(async () => {
    const utilisateur = await requirePermission("reservations.ecrire");
    const donnees = schemaReservation.safeParse(Object.fromEntries(formulaire));
    if (!donnees.success) return erreursValidation(donnees.error);
    const { arrivee, depart, nbPersonnes, chambreId } = donnees.data;

    await prisma.$transaction(async (tx) => {
      const chambre = await verifierDisponibilite(tx, chambreId, { debut: arrivee, fin: depart }, id);
      verifierCapacite(nbPersonnes, chambre.type.capacite);

      const actuelle = await tx.reservation.findUniqueOrThrow({ where: { id } });
      // RG6 : le tarif d'origine est conservé, sauf si le client change de chambre.
      const tarif = actuelle.chambreId === chambreId ? actuelle.tarifNuitApplique : chambre.type.tarifNuit;

      const { count } = await tx.reservation.updateMany({
        where: { id, statut: StatutReservation.CONFIRMEE },
        data: {
          chambreId,
          nbPersonnes,
          dateArriveePrevue: arrivee,
          dateDepartPrevue: depart,
          tarifNuitApplique: tarif,
        },
      });
      if (count === 0) throw new ErreurMetier("Seule une réservation confirmée peut être modifiée.");
      await journaliser(tx, utilisateur.id, "RESERVATION_MODIFIEE", {
        code: actuelle.code,
        chambre: chambre.numero,
      });
    }, TX);
    return succes("Réservation modifiée.", `/reservations/${id}`);
  });
}

/** RG12 : l'annulation exige un motif et une réservation CONFIRMEE. */
export async function annulerReservation(
  id: number,
  _etat: EtatAction,
  formulaire: FormData,
): Promise<EtatAction> {
  return executer(async () => {
    const utilisateur = await requirePermission("reservations.ecrire");
    const donnees = schemaAnnulation.safeParse(Object.fromEntries(formulaire));
    if (!donnees.success) return erreursValidation(donnees.error);

    await prisma.$transaction(async (tx) => {
      const { count } = await tx.reservation.updateMany({
        where: { id, statut: StatutReservation.CONFIRMEE },
        data: { statut: StatutReservation.ANNULEE, motifAnnulation: donnees.data.motif },
      });
      if (count === 0) throw new ErreurMetier("Seule une réservation confirmée peut être annulée.");
      const { code } = await tx.reservation.findUniqueOrThrow({ where: { id }, select: { code: true } });
      await journaliser(tx, utilisateur.id, "RESERVATION_ANNULEE", { code, motif: donnees.data.motif });
    }, TX);
    return succes("Réservation annulée.");
  });
}
