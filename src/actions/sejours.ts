"use server";

import { EtatChambre, type Prisma, StatutReservation, StatutSejour } from "@prisma/client";

import { echec, erreursValidation, type EtatAction, executer, succes } from "@/lib/actions";
import { soldeSejour } from "@/lib/calculs";
import { aujourdhui } from "@/lib/dates";
import { verifierCapacite, verifierDisponibilite, verrouillerChambre } from "@/lib/disponibilite";
import { ErreurMetier } from "@/lib/erreurs";
import { formaterFcfa } from "@/lib/format";
import { journaliser } from "@/lib/journal";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { arriveePossibleLe, verrouillerSejour } from "@/lib/sejours";
import { schemaClient } from "@/validations/clients";
import { type DemandeWalkIn, schemaWalkIn } from "@/validations/sejours";

const TX = { timeout: 15_000, maxWait: 10_000 };

type DonneesWalkIn = ReturnType<typeof schemaWalkIn.parse>;

/** RG8 : une chambre ne reçoit un client que si elle est prête. */
function exigerChambrePrete(chambre: { numero: string; etat: EtatChambre }): void {
  if (chambre.etat !== EtatChambre.DISPONIBLE) {
    throw new ErreurMetier(`La chambre ${chambre.numero} n'est pas prête à recevoir un client.`);
  }
}

/** RG7 et RG8 : check-in depuis une réservation confirmée. */
export async function enregistrerArrivee(reservationId: number): Promise<EtatAction> {
  return executer(async () => {
    const utilisateur = await requirePermission("sejours.ecrire");
    // Lecture hors transaction : le verrou doit rester la première lecture de celle-ci.
    const { chambreId } = await prisma.reservation.findUniqueOrThrow({
      where: { id: reservationId },
      select: { chambreId: true },
    });

    const sejour = await prisma.$transaction(async (tx) => {
      await verrouillerChambre(tx, chambreId);
      const reservation = await tx.reservation.findUniqueOrThrow({
        where: { id: reservationId },
        include: { chambre: true },
      });
      if (reservation.statut !== StatutReservation.CONFIRMEE) {
        throw new ErreurMetier("Cette réservation n'est plus confirmée.");
      }
      if (!arriveePossibleLe(reservation.dateArriveePrevue, reservation.dateDepartPrevue, aujourdhui())) {
        throw new ErreurMetier("L'arrivée ne peut être enregistrée qu'à partir du jour prévu, et avant le départ.");
      }
      exigerChambrePrete(reservation.chambre);

      const cree = await tx.sejour.create({
        data: {
          reservationId,
          clientId: reservation.clientId,
          chambreId,
          dateArriveeEffective: new Date(),
          dateDepartPrevue: reservation.dateDepartPrevue,
          tarifNuitApplique: reservation.tarifNuitApplique, // RG6
          arriveeParId: utilisateur.id,
        },
      });
      await tx.reservation.update({
        where: { id: reservationId },
        data: { statut: StatutReservation.HONOREE },
      });
      await tx.chambre.update({ where: { id: chambreId }, data: { etat: EtatChambre.OCCUPEE } });
      await journaliser(tx, utilisateur.id, "ARRIVEE", {
        sejourId: cree.id,
        chambre: reservation.chambre.numero,
        reservation: reservation.code,
      });
      return cree;
    }, TX);
    return succes("Arrivée enregistrée.", `/sejours/${sejour.id}`);
  });
}

/** RG7 : séjour d'un client qui se présente sans réservation (walk-in). */
async function insererWalkIn(
  tx: Prisma.TransactionClient,
  donnees: DonneesWalkIn,
  obtenirClientId: (tx: Prisma.TransactionClient) => Promise<number>,
  utilisateurId: number,
) {
  const periode = { debut: aujourdhui(), fin: donnees.depart };
  const chambre = await verifierDisponibilite(tx, donnees.chambreId, periode);
  exigerChambrePrete(chambre);
  verifierCapacite(donnees.nbPersonnes, chambre.type.capacite);

  const sejour = await tx.sejour.create({
    data: {
      clientId: await obtenirClientId(tx),
      chambreId: donnees.chambreId,
      dateArriveeEffective: new Date(),
      dateDepartPrevue: donnees.depart,
      tarifNuitApplique: chambre.type.tarifNuit, // RG6
      arriveeParId: utilisateurId,
    },
  });
  await tx.chambre.update({ where: { id: donnees.chambreId }, data: { etat: EtatChambre.OCCUPEE } });
  await journaliser(tx, utilisateurId, "ARRIVEE", { sejourId: sejour.id, chambre: chambre.numero, walkIn: true });
  return sejour;
}

export async function walkInClientExistant(demande: DemandeWalkIn, clientId: number): Promise<EtatAction> {
  return executer(async () => {
    const utilisateur = await requirePermission("sejours.ecrire");
    const donnees = schemaWalkIn.safeParse(demande);
    if (!donnees.success) return echec(donnees.error.issues[0].message);

    const sejour = await prisma.$transaction(
      (tx) => insererWalkIn(tx, donnees.data, async () => clientId, utilisateur.id),
      TX,
    );
    return succes("Arrivée enregistrée.", `/sejours/${sejour.id}`);
  });
}

export async function walkInNouveauClient(
  demande: DemandeWalkIn,
  _etat: EtatAction,
  formulaire: FormData,
): Promise<EtatAction> {
  return executer(async () => {
    const utilisateur = await requirePermission("sejours.ecrire");
    const donnees = schemaWalkIn.safeParse(demande);
    if (!donnees.success) return echec(donnees.error.issues[0].message);
    const client = schemaClient.safeParse(Object.fromEntries(formulaire));
    if (!client.success) return erreursValidation(client.error);

    const sejour = await prisma.$transaction(
      (tx) =>
        insererWalkIn(
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
    );
    return succes("Arrivée enregistrée.", `/sejours/${sejour.id}`);
  });
}

/**
 * RG8 et RG11 : check-out. Le client paie les nuits réellement passées :
 * le reste doit être nul, et un éventuel trop-perçu est rendu et tracé.
 */
export async function enregistrerDepart(sejourId: number): Promise<EtatAction> {
  return executer(async () => {
    const utilisateur = await requirePermission("sejours.ecrire");

    const tropPercu = await prisma.$transaction(async (tx) => {
      await verrouillerSejour(tx, sejourId);
      const sejour = await tx.sejour.findUniqueOrThrow({
        where: { id: sejourId },
        include: { paiements: true, chambre: true },
      });
      if (sejour.statut !== StatutSejour.EN_COURS) throw new ErreurMetier("Ce séjour est déjà terminé.");

      const maintenant = new Date();
      const solde = soldeSejour(sejour, maintenant);
      if (solde.reste > 0) {
        throw new ErreurMetier(`Départ refusé : il reste ${formaterFcfa(solde.reste)} à payer.`);
      }

      await tx.sejour.update({
        where: { id: sejourId },
        data: {
          statut: StatutSejour.TERMINE,
          dateDepartEffective: maintenant,
          departParId: utilisateur.id,
          montantRembourse: solde.tropPercu,
        },
      });
      await tx.chambre.update({ where: { id: sejour.chambreId }, data: { etat: EtatChambre.NETTOYAGE } });
      await journaliser(tx, utilisateur.id, "DEPART", {
        sejourId,
        chambre: sejour.chambre.numero,
        nuits: solde.nuits,
        total: solde.total,
        rembourse: solde.tropPercu,
      });
      return solde.tropPercu;
    }, TX);

    return succes(
      tropPercu > 0 ? `Départ enregistré. ${formaterFcfa(tropPercu)} à rendre au client.` : "Départ enregistré.",
    );
  });
}
