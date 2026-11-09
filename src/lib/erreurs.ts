/**
 * Erreur liée à une règle de gestion (chambre indisponible, reste dépassé…).
 * Levée dans une transaction, elle l'annule ; son message est affiché à l'utilisateur.
 */
export class ErreurMetier extends Error {}
