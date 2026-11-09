import { EtatChambre, type Prisma, StatutReservation, StatutSejour } from "@prisma/client";

import { ajouterJours, aujourdhui, debutJour } from "@/lib/dates";
import { ErreurMetier } from "@/lib/erreurs";
import { prisma } from "@/lib/prisma";

export interface Periode {
  debut: Date;
  fin: Date;
}

type ClientBase = Prisma.TransactionClient;

/** RG4 : debutExistant < finDemandee ET finExistante > debutDemandee. */
export function periodesSeChevauchent(existante: Periode, demandee: Periode): boolean {
  return existante.debut < demandee.fin && existante.fin > demandee.debut;
}

export function chambreLibre(occupations: readonly Periode[], demandee: Periode): boolean {
  return !occupations.some((occupation) => periodesSeChevauchent(occupation, demandee));
}

/**
 * Fin d'occupation d'un séjour en cours. Un client resté au-delà de la date prévue
 * occupe toujours la chambre : elle n'est donc pas libre avant demain.
 */
export function finOccupationSejour(dateDepartPrevue: Date, jour: Date): Date {
  return dateDepartPrevue < jour ? ajouterJours(jour, 1) : dateDepartPrevue;
}

/** Lit les occupations qui chevauchent la période, regroupées par chambre. */
async function lireOccupations(
  client: ClientBase,
  demandee: Periode,
  exclureReservationId?: number,
): Promise<Map<number, Periode[]>> {
  const [reservations, sejours] = await Promise.all([
    client.reservation.findMany({
      where: {
        statut: StatutReservation.CONFIRMEE,
        dateArriveePrevue: { lt: demandee.fin },
        dateDepartPrevue: { gt: demandee.debut },
        id: exclureReservationId ? { not: exclureReservationId } : undefined,
      },
      select: { chambreId: true, dateArriveePrevue: true, dateDepartPrevue: true },
    }),
    client.sejour.findMany({
      where: { statut: StatutSejour.EN_COURS, dateArriveeEffective: { lt: demandee.fin } },
      select: { chambreId: true, dateArriveeEffective: true, dateDepartPrevue: true },
    }),
  ]);

  const jour = aujourdhui();
  const occupations = new Map<number, Periode[]>();
  const ajouter = (chambreId: number, periode: Periode) => {
    occupations.set(chambreId, [...(occupations.get(chambreId) ?? []), periode]);
  };

  reservations.forEach((r) =>
    ajouter(r.chambreId, { debut: r.dateArriveePrevue, fin: r.dateDepartPrevue }),
  );
  sejours.forEach((s) =>
    ajouter(s.chambreId, {
      debut: debutJour(s.dateArriveeEffective),
      fin: finOccupationSejour(s.dateDepartPrevue, jour),
    }),
  );
  return occupations;
}

/**
 * Verrouille la ligne de la chambre jusqu'à la fin de la transaction.
 * Doit être la première lecture de la transaction : deux réservations simultanées
 * de la même chambre passent alors l'une après l'autre, et la seconde voit la première.
 */
export async function verrouillerChambre(tx: ClientBase, chambreId: number): Promise<void> {
  await tx.$queryRaw`SELECT id FROM chambre WHERE id = ${chambreId} FOR UPDATE`;
}

/** Vérification RG4 à refaire dans la transaction, juste avant d'enregistrer. */
export async function verifierDisponibilite(
  tx: ClientBase,
  chambreId: number,
  demandee: Periode,
  exclureReservationId?: number,
) {
  await verrouillerChambre(tx, chambreId);

  const chambre = await tx.chambre.findUnique({
    where: { id: chambreId },
    include: { type: true },
  });
  if (!chambre) throw new ErreurMetier("Cette chambre n'existe pas.");
  if (chambre.etat === EtatChambre.HORS_SERVICE) {
    throw new ErreurMetier(`La chambre ${chambre.numero} est hors service.`);
  }

  const occupations = await lireOccupations(tx, demandee, exclureReservationId);
  if (!chambreLibre(occupations.get(chambreId) ?? [], demandee)) {
    throw new ErreurMetier(`La chambre ${chambre.numero} n'est pas disponible sur cette période.`);
  }
  return chambre;
}

/** RG5 : le nombre de personnes ne dépasse pas la capacité du type de chambre. */
export function verifierCapacite(nbPersonnes: number, capacite: number): void {
  if (nbPersonnes > capacite) {
    throw new ErreurMetier(`Cette chambre accueille au maximum ${capacite} personne(s).`);
  }
}

interface OptionsRecherche {
  nbPersonnes?: number;
  typeId?: number;
  /** Pour une arrivée immédiate : la chambre doit être prête tout de suite. */
  seulementPretes?: boolean;
  exclureReservationId?: number;
}

/** Liste des chambres disponibles sur une période (recherche et assistants). */
export async function chercherChambresDisponibles(demandee: Periode, options: OptionsRecherche = {}) {
  const { nbPersonnes = 1, typeId, seulementPretes, exclureReservationId } = options;
  const [chambres, occupations] = await Promise.all([
    prisma.chambre.findMany({
      where: {
        etat: seulementPretes ? EtatChambre.DISPONIBLE : { not: EtatChambre.HORS_SERVICE },
        typeId,
        type: { capacite: { gte: nbPersonnes } },
      },
      include: { type: true },
      orderBy: { numero: "asc" },
    }),
    lireOccupations(prisma, demandee, exclureReservationId),
  ]);
  return chambres.filter((c) => chambreLibre(occupations.get(c.id) ?? [], demandee));
}
