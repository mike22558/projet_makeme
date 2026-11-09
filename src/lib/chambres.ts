import { EtatChambre } from "@prisma/client";

/**
 * Changements d'état manuels autorisés. Les passages à OCCUPEE et de OCCUPEE à
 * NETTOYAGE sont réservés à l'arrivée et au départ d'un client (RG8).
 */
export const TRANSITIONS_ETAT: Record<EtatChambre, readonly EtatChambre[]> = {
  DISPONIBLE: [EtatChambre.NETTOYAGE, EtatChambre.HORS_SERVICE],
  OCCUPEE: [],
  NETTOYAGE: [EtatChambre.DISPONIBLE, EtatChambre.HORS_SERVICE],
  HORS_SERVICE: [EtatChambre.DISPONIBLE, EtatChambre.NETTOYAGE],
};
