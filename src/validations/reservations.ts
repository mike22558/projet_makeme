import { z } from "zod";

import {
  arriveeNonPassee,
  dateJour,
  departApresArrivee,
  entierPositif,
  identifiant,
  texteRequis,
} from "@/validations/commun";

const MESSAGE_DEPART = "Le départ doit être postérieur à l'arrivée.";
const MESSAGE_PASSE = "L'arrivée ne peut pas être dans le passé.";

const champsPeriode = {
  arrivee: dateJour,
  depart: dateJour,
  nbPersonnes: entierPositif("Nombre de personnes"),
};

/** RG3 : contrôles communs à la recherche et à l'enregistrement. */
export const schemaPeriode = z
  .object(champsPeriode)
  .refine(departApresArrivee, { path: ["depart"], message: MESSAGE_DEPART })
  .refine(arriveeNonPassee, { path: ["arrivee"], message: MESSAGE_PASSE });

export const schemaReservation = z
  .object({ ...champsPeriode, chambreId: identifiant })
  .refine(departApresArrivee, { path: ["depart"], message: MESSAGE_DEPART })
  .refine(arriveeNonPassee, { path: ["arrivee"], message: MESSAGE_PASSE });

/** Données portées par l'assistant, revalidées par le serveur à l'enregistrement. */
export interface DemandeReservation {
  arrivee: string;
  depart: string;
  nbPersonnes: number;
  chambreId: number;
}

export const schemaAnnulation = z.object({
  motif: texteRequis("Motif", 255),
});
