import type { Prisma } from "@prisma/client";

/** Recherche d'un client par nom, prénoms, téléphone ou numéro de pièce. */
export function filtreRechercheClient(q: string): Prisma.ClientWhereInput {
  if (!q) return {};
  return {
    OR: [
      { nom: { contains: q } },
      { prenoms: { contains: q } },
      { telephone: { contains: q } },
      { numeroPiece: { contains: q } },
    ],
  };
}
