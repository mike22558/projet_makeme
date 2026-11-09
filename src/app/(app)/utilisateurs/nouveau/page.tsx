import type { Metadata } from "next";

import { creerUtilisateur } from "@/actions/utilisateurs";
import { EnTetePage, LienRetour } from "@/components/commun/elements";
import { BoutonEnvoi, Champ, FormulaireAction } from "@/components/commun/formulaire-action";
import { ChampsUtilisateur } from "@/components/utilisateurs/champs-utilisateur";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/permissions";

export const metadata: Metadata = { title: "Nouvel utilisateur" };

export default async function PageNouvelUtilisateur() {
  await requirePermission("utilisateurs.gerer");

  return (
    <div className="max-w-2xl">
      <LienRetour href="/utilisateurs" libelle="Utilisateurs" />
      <EnTetePage titre="Nouvel utilisateur" />
      <Card>
        <CardContent>
          <FormulaireAction action={creerUtilisateur} className="space-y-4">
            <ChampsUtilisateur />
            <Champ
              nom="motDePasse"
              libelle="Mot de passe initial"
              type="password"
              autoComplete="new-password"
              aide="Au moins 8 caractères, avec une minuscule, une majuscule et un chiffre."
              required
            />
            <BoutonEnvoi>Créer l&apos;utilisateur</BoutonEnvoi>
          </FormulaireAction>
        </CardContent>
      </Card>
    </div>
  );
}
