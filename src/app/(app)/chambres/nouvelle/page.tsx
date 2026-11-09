import type { Metadata } from "next";

import { creerChambre } from "@/actions/chambres";
import { ChampsChambre } from "@/components/chambres/champs";
import { EnTetePage, LienRetour } from "@/components/commun/elements";
import { BoutonEnvoi, FormulaireAction } from "@/components/commun/formulaire-action";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/permissions";
import { lireOptionsTypes } from "@/lib/requetes/chambres";

export const metadata: Metadata = { title: "Nouvelle chambre" };

export default async function PageNouvelleChambre() {
  await requirePermission("chambres.ecrire");
  const types = await lireOptionsTypes();

  return (
    <div className="max-w-2xl">
      <LienRetour href="/chambres" libelle="Chambres" />
      <EnTetePage titre="Nouvelle chambre" />
      <Card>
        <CardContent>
          <FormulaireAction action={creerChambre} className="space-y-4">
            <ChampsChambre types={types} />
            <BoutonEnvoi>Créer la chambre</BoutonEnvoi>
          </FormulaireAction>
        </CardContent>
      </Card>
    </div>
  );
}
