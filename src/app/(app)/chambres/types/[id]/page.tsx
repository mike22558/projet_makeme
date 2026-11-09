import { Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { modifierTypeChambre, supprimerTypeChambre } from "@/actions/chambres";
import { ChampsTypeChambre } from "@/components/chambres/champs";
import { DialogueAction } from "@/components/commun/dialogue-action";
import { EnTetePage, LienRetour } from "@/components/commun/elements";
import { BoutonEnvoi, FormulaireAction } from "@/components/commun/formulaire-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { idDeRoute } from "@/lib/url";

export const metadata: Metadata = { title: "Modifier un type de chambre" };

export default async function PageType({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("chambres.ecrire");
  const id = await idDeRoute(params);
  const type = await prisma.typeChambre.findUnique({ where: { id } });
  if (!type) notFound();

  const supprimer = async () => {
    "use server";
    return supprimerTypeChambre(id);
  };

  return (
    <div className="max-w-2xl">
      <LienRetour href="/chambres/types" libelle="Types de chambres" />
      <EnTetePage titre={type.libelle}>
        <DialogueAction
          action={supprimer}
          declencheur={
            <Button variant="outline">
              <Trash2 aria-hidden /> Supprimer
            </Button>
          }
          titre="Supprimer ce type ?"
          description="Un type utilisé par des chambres ne peut pas être supprimé."
          libelleConfirmation="Supprimer"
          variante="destructive"
        />
      </EnTetePage>
      <Card>
        <CardContent>
          <FormulaireAction action={modifierTypeChambre.bind(null, id)} className="space-y-4">
            <ChampsTypeChambre type={type} />
            <BoutonEnvoi>Enregistrer</BoutonEnvoi>
          </FormulaireAction>
        </CardContent>
      </Card>
    </div>
  );
}
