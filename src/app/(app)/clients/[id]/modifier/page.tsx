import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { modifierClient } from "@/actions/clients";
import { ChampsClient } from "@/components/clients/champs-client";
import { EnTetePage, LienRetour } from "@/components/commun/elements";
import { BoutonEnvoi, FormulaireAction } from "@/components/commun/formulaire-action";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { idDeRoute } from "@/lib/url";

export const metadata: Metadata = { title: "Modifier un client" };

export default async function PageModifierClient({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("clients.ecrire");
  const id = await idDeRoute(params);
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) notFound();

  return (
    <div className="max-w-2xl">
      <LienRetour href={`/clients/${id}`} libelle="Fiche du client" />
      <EnTetePage titre="Modifier le client" />
      <Card>
        <CardContent>
          <FormulaireAction action={modifierClient.bind(null, id)} className="space-y-4">
            <ChampsClient client={client} />
            <BoutonEnvoi>Enregistrer</BoutonEnvoi>
          </FormulaireAction>
        </CardContent>
      </Card>
    </div>
  );
}
