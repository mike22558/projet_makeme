import { Sexe, TypePiece } from "@prisma/client";
import { z } from "zod";

import {
  dateJourOptionnelle,
  emailOptionnel,
  telephone,
  texteOptionnel,
  texteRequis,
} from "@/validations/commun";

export const schemaClient = z.object({
  nom: texteRequis("Nom", 100),
  prenoms: texteRequis("Prénoms", 150),
  sexe: z.enum(Sexe, { error: "Sexe invalide." }),
  dateNaissance: dateJourOptionnelle,
  nationalite: texteRequis("Nationalité", 80),
  typePiece: z.enum(TypePiece, { error: "Type de pièce invalide." }),
  numeroPiece: texteRequis("Numéro de pièce", 50),
  telephone,
  email: emailOptionnel,
  adresse: texteOptionnel(255),
});

export type DonneesClient = z.infer<typeof schemaClient>;
