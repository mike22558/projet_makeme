"use client";

import { changerMotDePasse } from "@/actions/auth";
import { BoutonEnvoi, Champ, FormulaireAction } from "@/components/commun/formulaire-action";

export function FormulaireMotDePasse() {
  return (
    <FormulaireAction action={changerMotDePasse} reinitialiser className="space-y-5">
      <Champ nom="motDePasseActuel" libelle="Mot de passe actuel" type="password" autoComplete="current-password" required />
      <Champ nom="nouveauMotDePasse" libelle="Nouveau mot de passe" type="password" autoComplete="new-password" required />
      <Champ nom="confirmation" libelle="Confirmation du nouveau mot de passe" type="password" autoComplete="new-password" required />
      <p className="text-xs text-muted-foreground">
        Au moins 8 caractères, avec une minuscule, une majuscule et un chiffre.
      </p>
      <BoutonEnvoi>Enregistrer</BoutonEnvoi>
    </FormulaireAction>
  );
}
