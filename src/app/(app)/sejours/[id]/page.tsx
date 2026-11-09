import { FileText, LogOut, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { enregistrerDepart } from "@/actions/sejours";
import { DialogueAction } from "@/components/commun/dialogue-action";
import { BadgeSejour, CadreTableau, EnTetePage, EtatVide, LienRetour, LigneInfo } from "@/components/commun/elements";
import { RecapitulatifSolde } from "@/components/sejours/recapitulatif";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { soldeSejour } from "@/lib/calculs";
import { formaterDate, formaterDateHeure, formaterFcfa, LIBELLES_MODES, nomComplet } from "@/lib/format";
import { aPermission, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { INCLUSION_SEJOUR, soldeActuel } from "@/lib/requetes/sejours";
import { idDeRoute } from "@/lib/url";

export const metadata: Metadata = { title: "Séjour" };

export default async function PageSejour({ params }: { params: Promise<{ id: string }> }) {
  const utilisateur = await requirePermission("sejours.lire");
  const id = await idDeRoute(params);
  const sejour = await prisma.sejour.findUnique({
    where: { id },
    include: { ...INCLUSION_SEJOUR, reservation: { select: { id: true, code: true } } },
  });
  if (!sejour) notFound();

  const enCours = sejour.statut === "EN_COURS";
  const solde = soldeActuel(sejour);
  // Au départ, seules les nuits réellement passées sont dues.
  const soldeDepart = soldeSejour(sejour, new Date());
  const peutPartir = enCours && aPermission(utilisateur.role, "sejours.ecrire");
  const peutPayer = enCours && solde.reste > 0 && aPermission(utilisateur.role, "paiements.ecrire");

  const partir = async () => {
    "use server";
    return enregistrerDepart(id);
  };

  return (
    <div className="space-y-6">
      <div>
        <LienRetour href="/sejours" libelle="Séjours" />
        <EnTetePage titre={`Séjour · ${nomComplet(sejour.client)}`} description={<BadgeSejour statut={sejour.statut} />}>
          <Button variant="outline" asChild>
            <Link href={`/sejours/${id}/facture`}>
              <FileText aria-hidden /> Facture
            </Link>
          </Button>
          {peutPayer && (
            <Button asChild>
              <Link href={`/paiements/nouveau?sejour=${id}`}>
                <Plus aria-hidden /> Enregistrer un paiement
              </Link>
            </Button>
          )}
          {peutPartir && (
            <DialogueAction
              action={partir}
              declencheur={
                <Button>
                  <LogOut aria-hidden /> Enregistrer le départ
                </Button>
              }
              titre="Enregistrer le départ ?"
              description={`La chambre ${sejour.chambre.numero} passera à l'état « Nettoyage ».`}
              libelleConfirmation="Confirmer le départ"
              confirmationDesactivee={soldeDepart.reste > 0}
            >
              <RecapitulatifSolde solde={soldeDepart} tarif={sejour.tarifNuitApplique} />
              {soldeDepart.reste > 0 && (
                <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Le départ est impossible tant que le reste à payer n&apos;est pas réglé.
                </p>
              )}
            </DialogueAction>
          )}
        </EnTetePage>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Séjour</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              <LigneInfo libelle="Client">
                <Link href={`/clients/${sejour.clientId}`} className="hover:underline">
                  {nomComplet(sejour.client)}
                </Link>
              </LigneInfo>
              <LigneInfo libelle="Chambre">
                {sejour.chambre.numero} · {sejour.chambre.type.libelle}
              </LigneInfo>
              <LigneInfo libelle="Arrivée">{formaterDateHeure(sejour.dateArriveeEffective)}</LigneInfo>
              <LigneInfo libelle="Départ prévu">{formaterDate(sejour.dateDepartPrevue)}</LigneInfo>
              {sejour.dateDepartEffective && (
                <LigneInfo libelle="Départ effectif">{formaterDateHeure(sejour.dateDepartEffective)}</LigneInfo>
              )}
              <LigneInfo libelle="Origine">
                {sejour.reservation ? (
                  <Link href={`/reservations/${sejour.reservation.id}`} className="hover:underline">
                    {sejour.reservation.code}
                  </Link>
                ) : (
                  "Sans réservation"
                )}
              </LigneInfo>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{enCours ? "Situation estimée au départ prévu" : "Situation finale"}</CardTitle>
          </CardHeader>
          <CardContent>
            <RecapitulatifSolde solde={solde} tarif={sejour.tarifNuitApplique} />
          </CardContent>
        </Card>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Paiements</h2>
        {sejour.paiements.length === 0 ? (
          <EtatVide message="Aucun paiement enregistré pour ce séjour." />
        ) : (
          <CadreTableau>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">Reçu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sejour.paiements.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formaterDateHeure(p.datePaiement)}</TableCell>
                    <TableCell>{LIBELLES_MODES[p.mode]}</TableCell>
                    <TableCell>{p.reference ?? "—"}</TableCell>
                    <TableCell className="text-right">{formaterFcfa(p.montant)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/paiements/${p.id}/recu`} className="hover:underline">
                        Voir
                      </Link>
                    </TableCell>
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
