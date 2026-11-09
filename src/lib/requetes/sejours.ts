import type { Prisma } from "@prisma/client";

import { finFacturationEstimee, type SejourAFacturer, type Solde, soldeSejour } from "@/lib/calculs";
import { aujourdhui } from "@/lib/dates";

/** Relations nécessaires pour afficher un séjour et calculer son solde. */
export const INCLUSION_SEJOUR = {
  client: true,
  chambre: { include: { type: true } },
  paiements: { orderBy: { datePaiement: "desc" } },
} satisfies Prisma.SejourInclude;

export type SejourDetaille = Prisma.SejourGetPayload<{ include: typeof INCLUSION_SEJOUR }>;

/** Solde actuel : un séjour en cours est estimé jusqu'à son départ prévu. */
export function soldeActuel(sejour: SejourAFacturer): Solde {
  return soldeSejour(sejour, finFacturationEstimee(sejour.dateDepartPrevue, aujourdhui()));
}

/** Filtre commun de recherche d'un séjour par client ou numéro de chambre. */
export function filtreRechercheSejour(q: string): Prisma.SejourWhereInput {
  if (!q) return {};
  return {
    OR: [
      { client: { nom: { contains: q } } },
      { client: { prenoms: { contains: q } } },
      { chambre: { numero: { contains: q } } },
    ],
  };
}
