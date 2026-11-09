import { z } from "zod";

import { entierPositif, identifiant, texteOptionnel, texteRequis } from "@/validations/commun";

export const schemaTypeChambre = z.object({
  libelle: texteRequis("Libellé", 50),
  description: texteOptionnel(255),
  capacite: entierPositif("Capacité"),
  tarifNuit: entierPositif("Tarif"),
});

export const schemaChambre = z.object({
  numero: texteRequis("Numéro", 10),
  etage: z.coerce
    .number({ error: "Étage invalide." })
    .int("Étage invalide.")
    .min(0, "Étage invalide.")
    .max(200, "Étage invalide."),
  typeId: identifiant,
});
