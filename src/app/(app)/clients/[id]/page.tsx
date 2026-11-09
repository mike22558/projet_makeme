import { Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  BadgeSejour,
  CadreTableau,
  EnTetePage,
  EtatVide,
  LienRetour,
  LigneInfo,
} from "@/components/commun/elements";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  formaterDate,
  formaterDateHeure,
  formaterFcfa,
  LIBELLES_MODES,
  LIBELLES_PIECES,
  LIBELLES_SEXE,
  nomComplet,
} from "@/lib/format";
import { aPermission, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { INCLUSION_SEJOUR, soldeActuel } from "@/lib/requetes/sejours";
import { idDeRoute } from "@/lib/url";

export const metadata: Metadata = { title: "Fiche client" };

export default async function PageClient({ params }: { params: Promise<{ id: string }> }) {
  const utilisateur = await requirePermission("clients.lire");
  const id = await idDeRoute(params);
  const client = await prisma.client.findUnique({
    where: { id },
    include: { sejours: { include: INCLUSION_SEJOUR, orderBy: { dateArriveeEffective: "desc" }, take: 50 } },
  });
  if (!client) notFound();

  const paiements = client.sejours
    .flatMap((s) => s.paiements.map((p) => ({ ...p, chambre: s.chambre.numero })))
    .sort((a, b) => b.datePaiement.getTime() - a.datePaiement.getTime());

  return (
    <div className="space-y-6">
      <div>
        <LienRetour href="/clients" libelle="Clients" />
        <EnTetePage titre={nomComplet(client)}>
          {aPermission(utilisateur.role, "clients.ecrire") && (
            <Button variant="outline" asChild>
              <Link href={`/clients/${id}/modifier`}>
                <Pencil aria-hidden /> Modifier
              </Link>
            </Button>
          )}
        </EnTetePage>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y">
            <LigneInfo libelle="Sexe">{LIBELLES_SEXE[client.sexe]}</LigneInfo>
            <LigneInfo libelle="Date de naissance">
              {client.dateNaissance ? formaterDate(client.dateNaissance) : "Non renseignée"}
            </LigneInfo>
            <LigneInfo libelle="Nationalité">{client.nationalite}</LigneInfo>
            <LigneInfo libelle="Pièce d'identité">
              {LIBELLES_PIECES[client.typePiece]} · {client.numeroPiece}
            </LigneInfo>
            <LigneInfo libelle="Téléphone">{client.telephone}</LigneInfo>
            <LigneInfo libelle="E-mail">{client.email ?? "Non renseigné"}</LigneInfo>
            <LigneInfo libelle="Adresse">{client.adresse ?? "Non renseignée"}</LigneInfo>
            <LigneInfo libelle="Enregistré le">{formaterDate(client.creeLe)}</LigneInfo>
          </dl>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Historique des séjours</h2>
        {client.sejours.length === 0 ? (
          <EtatVide message="Ce client n'a encore effectué aucun séjour." />
        ) : (
          <CadreTableau>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arrivée</TableHead>
                  <TableHead>Départ</TableHead>
                  <TableHead>Chambre</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {client.sejours.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link href={`/sejours/${s.id}`} className="font-medium hover:underline">
                        {formaterDate(s.dateArriveeEffective)}
                      </Link>
                    </TableCell>
                    <TableCell>{formaterDate(s.dateDepartEffective ?? s.dateDepartPrevue)}</TableCell>
                    <TableCell>{s.chambre.numero}</TableCell>
                    <TableCell>
                      <BadgeSejour statut={s.statut} />
                    </TableCell>
                    <TableCell className="text-right">{formaterFcfa(soldeActuel(s).total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CadreTableau>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Historique des paiements</h2>
        {paiements.length === 0 ? (
          <EtatVide message="Aucun paiement enregistré pour ce client." />
        ) : (
          <CadreTableau>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Chambre</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paiements.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formaterDateHeure(p.datePaiement)}</TableCell>
                    <TableCell>{p.chambre}</TableCell>
                    <TableCell>{LIBELLES_MODES[p.mode]}</TableCell>
                    <TableCell className="text-right">{formaterFcfa(p.montant)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CadreTableau>
        )}
      </section>
    </div>
  );
}
