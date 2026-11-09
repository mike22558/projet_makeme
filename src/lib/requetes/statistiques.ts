import { EtatChambre, ModePaiement, StatutReservation, StatutSejour } from "@prisma/client";

import { finFacturationEstimee, nuitsDansPeriode, tauxOccupation } from "@/lib/calculs";
import {
  ajouterJours,
  ajouterMois,
  aujourdhui,
  debutMois,
  differenceJours,
  versDateIso,
} from "@/lib/dates";
import { formaterJourCourt, formaterMois } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export type Granularite = "jour" | "mois";

export interface Tranche {
  debut: Date;
  finExclue: Date;
  libelle: string;
}

/** Découpe une période en jours ou en mois. */
export function decouper(debut: Date, finExclue: Date, granularite: Granularite): Tranche[] {
  const tranches: Tranche[] = [];
  let courant = debut;
  while (courant < finExclue) {
    const suivant = granularite === "jour" ? ajouterJours(courant, 1) : ajouterMois(courant, 1);
    const fin = suivant < finExclue ? suivant : finExclue;
    tranches.push({
      debut: courant,
      finExclue: fin,
      libelle: granularite === "jour" ? formaterJourCourt(courant) : formaterMois(courant),
    });
    courant = fin;
  }
  return tranches;
}

export function granulariteAdaptee(debut: Date, finExclue: Date): Granularite {
  return differenceJours(debut, finExclue) <= 62 ? "jour" : "mois";
}

export interface Recettes {
  parMode: Record<ModePaiement, number>;
  encaisse: number;
  rembourse: number;
  /** Recettes réelles : encaissements moins trop-perçus rendus aux clients. */
  net: number;
}

export async function lireRecettes(debut: Date, finExclue: Date): Promise<Recettes> {
  const [groupes, remboursements] = await Promise.all([
    prisma.paiement.groupBy({
      by: ["mode"],
      where: { datePaiement: { gte: debut, lt: finExclue } },
      _sum: { montant: true },
    }),
    prisma.sejour.aggregate({
      where: { dateDepartEffective: { gte: debut, lt: finExclue } },
      _sum: { montantRembourse: true },
    }),
  ]);

  const parMode = Object.fromEntries(Object.values(ModePaiement).map((m) => [m, 0])) as Record<ModePaiement, number>;
  groupes.forEach((g) => (parMode[g.mode] = g._sum.montant ?? 0));
  const encaisse = Object.values(parMode).reduce((a, b) => a + b, 0);
  const rembourse = remboursements._sum.montantRembourse ?? 0;
  return { parMode, encaisse, rembourse, net: encaisse - rembourse };
}

/** Recettes nettes de chaque tranche de la période. */
export async function serieRecettes(debut: Date, finExclue: Date, granularite: Granularite) {
  const [paiements, departs] = await Promise.all([
    prisma.paiement.findMany({
      where: { datePaiement: { gte: debut, lt: finExclue } },
      select: { datePaiement: true, montant: true },
    }),
    prisma.sejour.findMany({
      where: { dateDepartEffective: { gte: debut, lt: finExclue }, montantRembourse: { gt: 0 } },
      select: { dateDepartEffective: true, montantRembourse: true },
    }),
  ]);
  const cle = (date: Date) => versDateIso(date).slice(0, granularite === "jour" ? 10 : 7);
  const montants = new Map<string, number>();
  const ajouter = (date: Date, montant: number) => montants.set(cle(date), (montants.get(cle(date)) ?? 0) + montant);
  paiements.forEach((p) => ajouter(p.datePaiement, p.montant));
  departs.forEach((d) => ajouter(d.dateDepartEffective!, -d.montantRembourse));

  return decouper(debut, finExclue, granularite).map((t) => ({
    libelle: t.libelle,
    valeur: montants.get(cle(t.debut)) ?? 0,
  }));
}

export async function compterChambresEnService(): Promise<number> {
  return prisma.chambre.count({ where: { etat: { not: EtatChambre.HORS_SERVICE } } });
}

/** Une ligne par tranche, jusqu'à aujourd'hui inclus : on ne mesure pas l'avenir. */
export async function serieOccupation(debut: Date, finExclue: Date, granularite: Granularite) {
  const jour = aujourdhui();
  const demain = ajouterJours(jour, 1);
  const borne = finExclue < demain ? finExclue : demain;
  if (debut >= borne) return [];

  const [chambres, sejours] = await Promise.all([
    compterChambresEnService(),
    prisma.sejour.findMany({
      where: {
        dateArriveeEffective: { lt: borne },
        OR: [{ statut: StatutSejour.EN_COURS }, { dateDepartEffective: { gte: debut } }],
      },
      select: { dateArriveeEffective: true, dateDepartPrevue: true, dateDepartEffective: true },
    }),
  ]);

  return decouper(debut, borne, granularite).map((t) => {
    const nuits = sejours.reduce((somme, s) => {
      const depart = s.dateDepartEffective ?? finFacturationEstimee(s.dateDepartPrevue, jour);
      return somme + nuitsDansPeriode(s.dateArriveeEffective, depart, t.debut, t.finExclue);
    }, 0);
    const jours = differenceJours(t.debut, t.finExclue);
    return { libelle: t.libelle, nuits, chambres, jours, taux: tauxOccupation(nuits, chambres, jours) };
  });
}

export async function lireAnnulations(debut: Date, finExclue: Date) {
  return prisma.reservation.findMany({
    where: {
      statut: StatutReservation.ANNULEE,
      dateArriveePrevue: { gte: debut, lt: finExclue },
    },
    include: { client: true, chambre: true },
    orderBy: { dateArriveePrevue: "desc" },
  });
}

/** Six derniers mois, en ne gardant que ceux qui ont une activité. */
export async function occupationDesDerniersMois() {
  const mois = debutMois(aujourdhui());
  const lignes = await serieOccupation(ajouterMois(mois, -5), ajouterMois(mois, 1), "mois");
  return lignes.filter((l) => l.nuits > 0);
}
