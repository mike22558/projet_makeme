import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DocumentImprimable } from "@/components/commun/document-imprimable";
import { LienRetour, LigneInfo } from "@/components/commun/elements";
import { formaterDateHeure, formaterFcfa, LIBELLES_MODES, nomComplet } from "@/lib/format";
import { lireParametres } from "@/lib/parametres";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { idDeRoute } from "@/lib/url";

export const metadata: Metadata = { title: "Reçu de paiement" };

export default async function PageRecu({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("paiements.lire");
  const id = await idDeRoute(params);
  const [paiement, hotel] = await Promise.all([
    prisma.paiement.findUnique({
      where: { id },
      include: {
        sejour: { include: { client: true, chambre: true } },
        enregistrePar: { select: { nom: true, prenoms: true } },
      },
    }),
    lireParametres(),
  ]);
  if (!paiement) notFound();

  return (
    <div>
      <LienRetour href={`/sejours/${paiement.sejourId}`} libelle="Retour au séjour" />
      <DocumentImprimable
        hotel={hotel}
        titre="Reçu de paiement"
        numero={`REC-${String(id).padStart(6, "0")}`}
        date={formaterDateHeure(paiement.datePaiement)}
      >
        <dl className="divide-y">
          <LigneInfo libelle="Client">{nomComplet(paiement.sejour.client)}</LigneInfo>
          <LigneInfo libelle="Chambre">{paiement.sejour.chambre.numero}</LigneInfo>
          <LigneInfo libelle="Mode de paiement">{LIBELLES_MODES[paiement.mode]}</LigneInfo>
          {paiement.reference && <LigneInfo libelle="Référence">{paiement.reference}</LigneInfo>}
          <LigneInfo libelle="Encaissé par">{nomComplet(paiement.enregistrePar)}</LigneInfo>
        </dl>
        <p className="flex items-baseline justify-between rounded-md bg-muted px-4 py-3">
          <span className="text-sm">Montant reçu</span>
          <span className="text-xl font-semibold">{formaterFcfa(paiement.montant)}</span>
        </p>
      </DocumentImprimable>
    </div>
  );
}
