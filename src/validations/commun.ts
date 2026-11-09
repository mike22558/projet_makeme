import { z } from "zod";

import { aujourdhui, lireDateIso } from "@/lib/dates";

export const ENTIER_MAX = 2_147_483_647;

export function texteRequis(libelle: string, longueurMax: number) {
  return z
    .string({ error: `${libelle} : champ obligatoire.` })
    .trim()
    .min(1, `${libelle} : champ obligatoire.`)
    .max(longueurMax, `${libelle} : ${longueurMax} caractères au maximum.`);
}

/** Texte facultatif : une chaîne vide devient null en base. */
export function texteOptionnel(longueurMax: number) {
  return z
    .string()
    .trim()
    .max(longueurMax, `${longueurMax} caractères au maximum.`)
    .optional()
    .transform((valeur) => valeur || null);
}

export function entierPositif(libelle: string) {
  return z.coerce
    .number({ error: `${libelle} : nombre invalide.` })
    .int(`${libelle} : un nombre entier est attendu.`)
    .positive(`${libelle} : la valeur doit être supérieure à 0.`)
    .max(ENTIER_MAX, `${libelle} : valeur trop grande.`);
}

export const identifiant = z.coerce.number().int().positive();

export const telephone = z
  .string({ error: "Téléphone : champ obligatoire." })
  .trim()
  .regex(/^[0-9+ ]{8,20}$/, "Téléphone invalide (8 à 20 chiffres).");

export const email = z
  .string({ error: "Adresse e-mail : champ obligatoire." })
  .trim()
  .toLowerCase()
  .pipe(z.email("Adresse e-mail invalide."));

export const emailOptionnel = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.union([z.literal(""), z.email("Adresse e-mail invalide.")]))
  .optional()
  .transform((valeur) => valeur || null);

/** Date au format AAAA-MM-JJ, convertie en Date à minuit UTC. */
export const dateJour = z
  .string({ error: "Date obligatoire." })
  .transform((valeur, contexte) => {
    const date = lireDateIso(valeur);
    if (date) return date;
    contexte.addIssue({ code: "custom", message: "Date invalide." });
    return z.NEVER;
  });

export const dateJourOptionnelle = z
  .string()
  .optional()
  .transform((valeur, contexte) => {
    if (!valeur) return null;
    const date = lireDateIso(valeur);
    if (date) return date;
    contexte.addIssue({ code: "custom", message: "Date invalide." });
    return z.NEVER;
  });

/** Politique commune à tous les mots de passe ; bcrypt ignore au-delà de 72 octets. */
export const motDePasseRobuste = z
  .string({ error: "Mot de passe : champ obligatoire." })
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .max(72, "Le mot de passe ne doit pas dépasser 72 caractères.")
  .regex(/[a-z]/, "Le mot de passe doit contenir une minuscule.")
  .regex(/[A-Z]/, "Le mot de passe doit contenir une majuscule.")
  .regex(/[0-9]/, "Le mot de passe doit contenir un chiffre.");

/** RG3 : à appliquer sur tout objet possédant une arrivée et un départ. */
export function departApresArrivee(d: { arrivee: Date; depart: Date }): boolean {
  return d.depart > d.arrivee;
}

export function arriveeNonPassee(d: { arrivee: Date }): boolean {
  return d.arrivee >= aujourdhui();
}
