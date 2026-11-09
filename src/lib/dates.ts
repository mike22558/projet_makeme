// Outils de dates. Tous les calculs sont faits en UTC, l'heure de la Côte d'Ivoire (GMT).

export const MS_PAR_JOUR = 86_400_000;

/** Ramène une date à minuit UTC du même jour. */
export function debutJour(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function aujourdhui(): Date {
  return debutJour(new Date());
}

export function ajouterJours(date: Date, jours: number): Date {
  return new Date(date.getTime() + jours * MS_PAR_JOUR);
}

/** Nombre de jours calendaires séparant deux dates, sans tenir compte des heures. */
export function differenceJours(debut: Date, fin: Date): number {
  return Math.round((debutJour(fin).getTime() - debutJour(debut).getTime()) / MS_PAR_JOUR);
}

export function debutMois(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function ajouterMois(date: Date, mois: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + mois, 1));
}

/** Convertit une date au format AAAA-MM-JJ, en refusant les dates inexistantes. */
export function lireDateIso(valeur: string | undefined): Date | null {
  if (!valeur || !/^\d{4}-\d{2}-\d{2}$/.test(valeur)) return null;
  const date = new Date(`${valeur}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return versDateIso(date) === valeur ? date : null;
}

/** Format attendu par les champs <input type="date">. */
export function versDateIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}
