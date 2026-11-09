import { type Prisma, StatutSejour } from "@prisma/client";
import { DoorOpen, LogOut, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import {
  BadgeSejour,
  BarreFiltres,
  CadreTableau,
  EnTetePage,
  EtatVide,
  FiltreSelect,
  FiltreTexte,
  Pagination,
} from "@/components/commun/elements";
import { Chargement } from "@/components/layout/chargement";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { aujourdhui, versDateIso } from "@/lib/dates";
import { formaterDate, formaterFcfa, LIBELLES_STATUTS_SEJOUR, nomComplet, options } from "@/lib/format";
import { aPermission, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { filtreRechercheSejour, INCLUSION_SEJOUR, soldeActuel } from "@/lib/requetes/sejours";
import {
  dateUrl,
  enumUrl,
  fenetre,
  numeroPage,
  type ParametresBruts,
  type ParametresRecherche,
  texte,
} from "@/lib/url";

export const metadata: Metadata = { title: "Séjours" };

async function ListeSejours({ parametres }: { parametres: ParametresBruts }) {
  const page = numeroPage(parametres);
  const where: Prisma.SejourWhereInput = {
    ...filtreRechercheSejour(texte(parametres, "q")),
    statut: enumUrl(parametres, "statut", StatutSejour),
    dateDepartPrevue: dateUrl(parametres, "depart"),
  };
  const [sejours, total] = await Promise.all([
    prisma.sejour.findMany({
      where,
      include: INCLUSION_SEJOUR,
      orderBy: { dateArriveeEffective: "desc" },
      ...fenetre(page),
    }),
    prisma.sejour.count({ where }),
  ]);

  if (sejours.length === 0) return <EtatVide message="Aucun séjour sur ces critères." />;

  return (
    <>
      <CadreTableau>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Chambre</TableHead>
              <TableHead>Arrivée</TableHead>
              <TableHead>Départ</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Reste à payer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sejours.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <Link href={`/sejours/${s.id}`} className="font-medium hover:underline">
                    {nomComplet(s.client)}
                  </Link>
                </TableCell>
                <TableCell>{s.chambre.numero}</TableCell>
                <TableCell>{formaterDate(s.dateArriveeEffective)}</TableCell>
                <TableCell>{formaterDate(s.dateDepartEffective ?? s.dateDepartPrevue)}</TableCell>
                <TableCell>
                  <BadgeSejour statut={s.statut} />
                </TableCell>
                <TableCell className="text-right">{formaterFcfa(soldeActuel(s).reste)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CadreTableau>
      <Pagination chemin="/sejours" parametres={parametres} page={page} total={total} />
    </>
  );
}

export default async function PageSejours({ searchParams }: { searchParams: ParametresRecherche }) {
  const utilisateur = await requirePermission("sejours.lire");
  const parametres = await searchParams;
  const jour = versDateIso(aujourdhui());

  return (
    <div>
      <EnTetePage titre="Séjours">
        <Button variant="outline" asChild>
          <Link href="/sejours?statut=EN_COURS">
            <DoorOpen aria-hidden /> En cours
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/sejours?statut=EN_COURS&depart=${jour}`}>
            <LogOut aria-hidden /> Départs du jour
          </Link>
        </Button>
        {aPermission(utilisateur.role, "sejours.ecrire") && (
          <Button asChild>
            <Link href="/sejours/nouveau">
              <Plus aria-hidden /> Arrivée sans réservation
            </Link>
          </Button>
        )}
      </EnTetePage>
      <BarreFiltres chemin="/sejours">
        <FiltreTexte nom="q" libelle="Recherche" valeur={texte(parametres, "q")} placeholder="Client ou chambre" />
        <FiltreSelect nom="statut" libelle="Statut" valeur={texte(parametres, "statut")} options={options(LIBELLES_STATUTS_SEJOUR)} />
      </BarreFiltres>
      <Suspense key={JSON.stringify(parametres)} fallback={<Chargement />}>
        <ListeSejours parametres={parametres} />
      </Suspense>
    </div>
  );
}
