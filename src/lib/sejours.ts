import type { Prisma } from "@prisma/client";

/** L'arrivée s'enregistre entre le jour prévu et la veille du départ prévu. */
export function arriveePossibleLe(
  arriveePrevue: Date,
  departPrevu: Date,
  jour: Date,
): boolean {
  return jour >= arriveePrevue && jour < departPrevu;
}

/**
 * Verrouille la ligne du séjour jusqu'à la fin de la transaction, pour qu'un
 * paiement et un départ simultanés travaillent toujours sur un solde à jour.
 * Doit être la première lecture de la transaction.
 */
export async function verrouillerSejour(tx: Prisma.TransactionClient, sejourId: number): Promise<void> {
  await tx.$queryRaw`SELECT id FROM sejour WHERE id = ${sejourId} FOR UPDATE`;
}
