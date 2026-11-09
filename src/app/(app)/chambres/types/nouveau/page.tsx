import type { Metadata } from "next";

import { creerTypeChambre } from "@/actions/chambres";
import { ChampsTypeChambre } from "@/components/chambres/champs";
import { EnTetePage, LienRetour } from "@/components/commun/elements";
import { BoutonEnvoi, FormulaireAction } from "@/components/commun/formulaire-action";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/permissions";

export const metadata: Metadata = { title: "Nouveau type de chambre" };

export default async function PageNouveauType() {
  await requirePermission("chambres.ecrire");

  return (
    <div className="max-w-2xl">
      <LienRetour href="/chambres/types" libelle="Types de chambres" />
      <EnTetePage titre="Nouveau type de chambre" />
      <Card>
        <CardContent>
          <FormulaireAction action={creerTypeChambre} className="space-y-4">
            <ChampsTypeChambre />
            <BoutonEnvoi>Créer le type</BoutonEnvoi>
          </FormulaireAction>
        </CardContent>
      </Card>
    </div>
  );
}
