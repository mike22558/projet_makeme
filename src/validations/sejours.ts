import { ModePaiement } from "@prisma/client";
import { z } from "zod";

import { aujourdhui } from "@/lib/dates";
import { dateJour, entierPositif, identifiant, texteOptionnel } from "@/validations/commun";

const champsWalkIn = {
  depart: dateJour,
  nbPersonnes: entierPositif("Nombre de personnes"),
};

/** Arrivée sans réservation : le client arrive aujourd'hui et repart plus tard (RG3). */
export const schemaPeriodeWalkIn = z
  .object(champsWalkIn)
  .refine((d) => d.depart > aujourdhui(), {
    path: ["depart"],
    message: "Le départ doit être postérieur à aujourd'hui.",
  });

export const schemaWalkIn = z
  .object({ ...champsWalkIn, chambreId: identifiant })
  .refine((d) => d.depart > aujourdhui(), {
    path: ["depart"],
    message: "Le départ doit être postérieur à aujourd'hui.",
  });

export interface DemandeWalkIn {
  depart: string;
  nbPersonnes: number;
  chambreId: number;
}

export const schemaPaiement = z.object({
  montant: entierPositif("Montant"),
  mode: z.enum(ModePaiement, { error: "Mode de paiement invalide." }),
  reference: texteOptionnel(100),
});
