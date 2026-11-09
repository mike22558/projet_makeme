import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DocumentImprimable } from "@/components/commun/document-imprimable";
import { LienRetour, LigneInfo } from "@/components/commun/elements";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { aujourdhui } from "@/lib/dates";
import { formaterDate, formaterDateHeure, formaterFcfa, LIBELLES_MODES, nomComplet } from "@/lib/format";
import { lireParametres } from "@/lib/parametres";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { INCLUSION_SEJOUR, soldeActuel } from "@/lib/requetes/sejours";
import { idDeRoute } from "@/lib/url";

export const metadata: Metadata = { title: "Facture de séjour" };

export default async function PageFacture({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("paiements.lire");
  const id = await idDeRoute(params);
  const [sejour, hotel] = await Promise.all([
    prisma.sejour.findUnique({ where: { id }, include: INCLUSION_SEJOUR }),
    lireParametres(),
  ]);
  if (!sejour) notFound();
  const solde = soldeActuel(sejour);

  return (
    <div>
      <LienRetour href={`/sejours/${id}`} libelle="Retour au séjour" />
      <DocumentImprimable
        hotel={hotel}
        titre={sejour.statut === "EN_COURS" ? "Facture provisoire" : "Facture"}
        numero={`FAC-${String(id).padStart(6, "0")}`}
        date={formaterDate(sejour.dateDepartEffective ?? aujourdhui())}
      >
        <section>
          <h2 className="text-sm font-semibold">Client</h2>
          <p className="text-sm">{nomComplet(sejour.client)}</p>
          <p className="text-sm text-muted-foreground">
            {sejour.client.telephone} · {sejour.client.numeroPiece}
          </p>
        </section>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Désignation</TableHead>
              <TableHead className="text-right">Nuits</TableHead>
              <TableHead className="text-right">Prix unitaire</TableHead>
              <TableHead className="text-right">Montant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="whitespace-normal">
                Chambre {sejour.chambre.numero} ({sejour.chambre.type.libelle}), du{" "}
                {formaterDate(sejour.dateArriveeEffective)} au{" "}
                {formaterDate(sejour.dateDepartEffective ?? sejour.dateDepartPrevue)}
              </TableCell>
              <TableCell className="text-right">{solde.nuits}</TableCell>
              <TableCell className="text-right">{formaterFcfa(sejour.tarifNuitApplique)}</TableCell>
              <TableCell className="text-right">{formaterFcfa(solde.total)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {sejour.paiements.length > 0 && (
          <section>
            <h2 className="mb-1 text-sm font-semibold">Paiements reçus</h2>
            <ul className="text-sm">
              {sejour.paiements.map((p) => (
                <li key={p.id} className="flex justify-between py-0.5">
                  <span>
                    {formaterDateHeure(p.datePaiement)} · {LIBELLES_MODES[p.mode]}
                  </span>
                  <span>{formaterFcfa(p.montant)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <dl className="ml-auto max-w-xs divide-y">
          <LigneInfo libelle="Total">{formaterFcfa(solde.total)}</LigneInfo>
          <LigneInfo libelle="Payé">{formaterFcfa(solde.paye)}</LigneInfo>
          {solde.rembourse > 0 && <LigneInfo libelle="Rendu au client">{formaterFcfa(solde.rembourse)}</LigneInfo>}
          <LigneInfo libelle="Reste à payer">{formaterFcfa(solde.reste)}</LigneInfo>
        </dl>
      </DocumentImprimable>
    </div>
  );
}
