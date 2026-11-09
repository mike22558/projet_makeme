import { Role } from "@prisma/client";
import { z } from "zod";

import { email, motDePasseRobuste, telephone, texteRequis } from "@/validations/commun";

const champsUtilisateur = {
  nom: texteRequis("Nom", 100),
  prenoms: texteRequis("Prénoms", 150),
  email,
  telephone,
  role: z.enum(Role, { error: "Rôle invalide." }),
};

export const schemaCreationUtilisateur = z.object({
  ...champsUtilisateur,
  motDePasse: motDePasseRobuste,
});

export const schemaModificationUtilisateur = z.object(champsUtilisateur);

export const schemaReinitialisation = z.object({ motDePasse: motDePasseRobuste });

export const schemaParametres = z.object({
  nom_hotel: texteRequis("Nom de l'hôtel", 255),
  adresse: texteRequis("Adresse", 255),
  telephone: texteRequis("Téléphone", 255),
  heure_liberation: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide (format HH:MM)."),
});
