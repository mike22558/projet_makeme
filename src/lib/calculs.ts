import { ajouterJours, debutJour, differenceJours } from "@/lib/dates";

/** RG9 : différence en jours entre arrivée et départ, avec un minimum d'une nuit. */
export function nombreNuits(arrivee: Date, depart: Date): number {
  return Math.max(differenceJours(arrivee, depart), 1);
}

/** RG9 : total = nuits × tarif appliqué. */
export function montantTotal(nuits: number, tarifNuit: number): number {
  return nuits * tarifNuit;
}

export function sommePaiements(paiements: ReadonlyArray<{ montant: number }>): number {
  return paiements.reduce((somme, paiement) => somme + paiement.montant, 0);
}

/**
 * Date retenue pour estimer le total d'un séjour en cours : le départ prévu,
 * ou aujourd'hui si le client est resté au-delà de la date prévue.
 */
export function finFacturationEstimee(dateDepartPrevue: Date, jour: Date): Date {
  return dateDepartPrevue > jour ? dateDepartPrevue : jour;
}

export interface SejourAFacturer {
  dateArriveeEffective: Date;
  dateDepartPrevue: Date;
  dateDepartEffective: Date | null;
  tarifNuitApplique: number;
  montantRembourse: number;
  paiements: ReadonlyArray<{ montant: number }>;
}

export interface Solde {
  nuits: number;
  total: number;
  paye: number;
  rembourse: number;
  /** RG10 : ce que le client doit encore (0 s'il a trop payé). */
  reste: number;
  /** Somme à rendre au client après un départ anticipé. */
  tropPercu: number;
}

/**
 * Calcule la situation financière d'un séjour.
 * Le client paie les nuits réellement passées : un séjour terminé est facturé
 * jusqu'à son départ effectif, un séjour en cours jusqu'à `finFacturation`.
 */
export function soldeSejour(sejour: SejourAFacturer, finFacturation: Date): Solde {
  const fin = sejour.dateDepartEffective ?? finFacturation;
  const nuits = nombreNuits(sejour.dateArriveeEffective, fin);
  const total = montantTotal(nuits, sejour.tarifNuitApplique);
  const paye = sommePaiements(sejour.paiements);
  const net = paye - sejour.montantRembourse;

  return {
    nuits,
    total,
    paye,
    rembourse: sejour.montantRembourse,
    reste: Math.max(total - net, 0),
    tropPercu: Math.max(net - total, 0),
  };
}

/** Nombre de nuits d'un séjour comprises dans la période [debut, finExclue[. */
export function nuitsDansPeriode(
  arrivee: Date,
  depart: Date,
  debut: Date,
  finExclue: Date,
): number {
  const premiereNuit = debutJour(arrivee);
  const finSejour = ajouterJours(premiereNuit, nombreNuits(arrivee, depart));
  const borneDebut = premiereNuit > debut ? premiereNuit : debut;
  const borneFin = finSejour < finExclue ? finSejour : finExclue;
  return Math.max(differenceJours(borneDebut, borneFin), 0);
}

/** Taux d'occupation en pourcentage, arrondi à une décimale. */
export function tauxOccupation(nuitsOccupees: number, chambres: number, jours: number): number {
  const capacite = chambres * jours;
  return capacite > 0 ? Math.round((nuitsOccupees / capacite) * 1000) / 10 : 0;
}
