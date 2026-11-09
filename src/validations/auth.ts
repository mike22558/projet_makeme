import { z } from "zod";

import { email, motDePasseRobuste } from "@/validations/commun";

export const schemaConnexion = z.object({
  email,
  motDePasse: z.string().min(1, "Le mot de passe est obligatoire."),
});

export const schemaChangementMotDePasse = z
  .object({
    motDePasseActuel: z.string().min(1, "Saisissez votre mot de passe actuel."),
    nouveauMotDePasse: motDePasseRobuste,
    confirmation: z.string(),
  })
  .refine((d) => d.nouveauMotDePasse === d.confirmation, {
    path: ["confirmation"],
    message: "Les deux mots de passe ne sont pas identiques.",
  })
  .refine((d) => d.nouveauMotDePasse !== d.motDePasseActuel, {
    path: ["nouveauMotDePasse"],
    message: "Le nouveau mot de passe doit être différent de l'actuel.",
  });
