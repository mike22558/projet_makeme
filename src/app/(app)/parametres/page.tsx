import type { Metadata } from "next";

import { enregistrerParametres } from "@/actions/parametres";
import { EnTetePage } from "@/components/commun/elements";
import { BoutonEnvoi, Champ, FormulaireAction } from "@/components/commun/formulaire-action";
import { Card, CardContent } from "@/components/ui/card";
import { lireParametres } from "@/lib/parametres";
import { requirePermission } from "@/lib/permissions";

export const metadata: Metadata = { title: "Paramètres" };

export default async function PageParametres() {
  await requirePermission("parametres.gerer");
  const parametres = await lireParametres();

  return (
    <div className="max-w-2xl">
      <EnTetePage titre="Paramètres" description="Ces informations figurent sur les reçus et les factures." />
      <Card>
        <CardContent>
          <FormulaireAction action={enregistrerParametres} className="space-y-4">
            <Champ nom="nom_hotel" libelle="Nom de l'hôtel" defaultValue={parametres.nom_hotel} required />
            <Champ nom="adresse" libelle="Adresse" defaultValue={parametres.adresse} required />
            <Champ nom="telephone" libelle="Téléphone" defaultValue={parametres.telephone} required />
            <Champ
              nom="heure_liberation"
              libelle="Heure de libération des chambres"
              type="time"
              defaultValue={parametres.heure_liberation}
              required
            />
            <BoutonEnvoi>Enregistrer</BoutonEnvoi>
          </FormulaireAction>
        </CardContent>
      </Card>
    </div>
  );
}
