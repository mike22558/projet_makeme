import { notFound } from "next/navigation";

import { lireDateIso } from "@/lib/dates";

export const TAILLE_PAGE = 20;

export type ParametresBruts = Record<string, string | string[] | undefined>;
export type ParametresRecherche = Promise<ParametresBruts>;

/** Première valeur d'un paramètre d'URL, sans espaces superflus. */
export function texte(parametres: ParametresBruts, cle: string): string {
  const valeur = parametres[cle];
  return (Array.isArray(valeur) ? valeur[0] : valeur)?.trim() ?? "";
}

export function numeroPage(parametres: ParametresBruts): number {
  const page = Number(texte(parametres, "page"));
  return Number.isInteger(page) && page > 0 ? page : 1;
}

/** Options `skip` et `take` de Prisma pour une pagination côté serveur. */
export function fenetre(page: number) {
  return { skip: (page - 1) * TAILLE_PAGE, take: TAILLE_PAGE };
}

export function entierUrl(parametres: ParametresBruts, cle: string): number | undefined {
  const valeur = Number(texte(parametres, cle));
  return Number.isInteger(valeur) && valeur > 0 ? valeur : undefined;
}

export function dateUrl(parametres: ParametresBruts, cle: string): Date | undefined {
  return lireDateIso(texte(parametres, cle)) ?? undefined;
}

/** Valeur d'un paramètre si elle appartient à l'énumération, sinon undefined. */
export function enumUrl<T extends string>(
  parametres: ParametresBruts,
  cle: string,
  valeurs: Record<string, T>,
): T | undefined {
  const valeur = texte(parametres, cle);
  return Object.values(valeurs).includes(valeur as T) ? (valeur as T) : undefined;
}

/** Identifiant d'une route dynamique ; une valeur incorrecte donne une page 404. */
export async function idDeRoute(params: Promise<{ id: string }>): Promise<number> {
  const { id } = await params;
  const valeur = Number(id);
  if (!Number.isInteger(valeur) || valeur <= 0) notFound();
  return valeur;
}
