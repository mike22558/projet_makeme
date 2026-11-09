import type { Metadata } from "next";

import { creerClient } from "@/actions/clients";
import { ChampsClient } from "@/components/clients/champs-client";
import { EnTetePage, LienRetour } from "@/components/commun/elements";
import { BoutonEnvoi, FormulaireAction } from "@/components/commun/formulaire-action";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/permissions";

export const metadata: Metadata = { title: "Nouveau client" };

export default async function PageNouveauClient() {
  await requirePermission("clients.ecrire");

  return (
    <div className="max-w-2xl">
      <LienRetour href="/clients" libelle="Clients" />
      <EnTetePage titre="Nouveau client" />
      <Card>
        <CardContent>
          <FormulaireAction action={creerClient} className="space-y-4">
            <ChampsClient />
            <BoutonEnvoi>Enregistrer le client</BoutonEnvoi>
          </FormulaireAction>
        </CardContent>
      </Card>
    </div>
  );
}
