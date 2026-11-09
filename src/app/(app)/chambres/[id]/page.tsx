import { Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { modifierChambre, supprimerChambre } from "@/actions/chambres";
import { ChampsChambre } from "@/components/chambres/champs";
import { DialogueAction } from "@/components/commun/dialogue-action";
import { EnTetePage, LienRetour } from "@/components/commun/elements";
import { BoutonEnvoi, FormulaireAction } from "@/components/commun/formulaire-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { lireOptionsTypes } from "@/lib/requetes/chambres";
import { idDeRoute } from "@/lib/url";

export const metadata: Metadata = { title: "Modifier une chambre" };

export default async function PageChambre({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("chambres.ecrire");
  const id = await idDeRoute(params);
  const [chambre, types] = await Promise.all([prisma.chambre.findUnique({ where: { id } }), lireOptionsTypes()]);
  if (!chambre) notFound();

  const supprimer = async () => {
    "use server";
    return supprimerChambre(id);
  };

  return (
    <div className="max-w-2xl">
      <LienRetour href="/chambres" libelle="Chambres" />
      <EnTetePage titre={`Chambre ${chambre.numero}`}>
        <DialogueAction
          action={supprimer}
          declencheur={
            <Button variant="outline">
              <Trash2 aria-hidden /> Supprimer
            </Button>
          }
          titre="Supprimer cette chambre ?"
          description="Une chambre qui possède un historique ne peut pas être supprimée."
          libelleConfirmation="Supprimer"
          variante="destructive"
        />
      </EnTetePage>
      <Card>
        <CardContent>
          <FormulaireAction action={modifierChambre.bind(null, id)} className="space-y-4">
            <ChampsChambre chambre={chambre} types={types} />
            <BoutonEnvoi>Enregistrer</BoutonEnvoi>
          </FormulaireAction>
        </CardContent>
      </Card>
    </div>
  );
}
