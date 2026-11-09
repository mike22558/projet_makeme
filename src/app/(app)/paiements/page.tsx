import { ModePaiement, type Prisma } from "@prisma/client";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import {
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
import { ajouterJours } from "@/lib/dates";
import { formaterDateHeure, formaterFcfa, LIBELLES_MODES, nomComplet, options } from "@/lib/format";
import { aPermission, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  dateUrl,
  enumUrl,
  fenetre,
  numeroPage,
  type ParametresBruts,
  type ParametresRecherche,
  texte,
} from "@/lib/url";

export const metadata: Metadata = { title: "Paiements" };

function construireFiltre(parametres: ParametresBruts): Prisma.PaiementWhereInput {
  const au = dateUrl(parametres, "au");
  return {
    mode: enumUrl(parametres, "mode", ModePaiement),
    datePaiement: { gte: dateUrl(parametres, "du"), lt: au ? ajouterJours(au, 1) : undefined },
  };
}

async function ListePaiements({ parametres }: { parametres: ParametresBruts }) {
  const page = numeroPage(parametres);
  const where = construireFiltre(parametres);
  const [paiements, total, somme] = await Promise.all([
    prisma.paiement.findMany({
      where,
      include: { sejour: { include: { client: true, chambre: true } } },
      orderBy: { datePaiement: "desc" },
      ...fenetre(page),
    }),
    prisma.paiement.count({ where }),
    prisma.paiement.aggregate({ where, _sum: { montant: true } }),
  ]);

  if (paiements.length === 0) return <EtatVide message="Aucun paiement sur ces critères." />;

  return (
    <>
      <p className="mb-3 text-sm">
        Total encaissé sur la sélection : <strong>{formaterFcfa(somme._sum.montant ?? 0)}</strong>
      </p>
      <CadreTableau>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Chambre</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="text-right">Reçu</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paiements.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{formaterDateHeure(p.datePaiement)}</TableCell>
                <TableCell>
                  <Link href={`/sejours/${p.sejourId}`} className="font-medium hover:underline">
                    {nomComplet(p.sejour.client)}
                  </Link>
                </TableCell>
                <TableCell>{p.sejour.chambre.numero}</TableCell>
                <TableCell>{LIBELLES_MODES[p.mode]}</TableCell>
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
      <Pagination chemin="/paiements" parametres={parametres} page={page} total={total} />
    </>
  );
}

export default async function PagePaiements({ searchParams }: { searchParams: ParametresRecherche }) {
  const utilisateur = await requirePermission("paiements.lire");
  const parametres = await searchParams;

  return (
    <div>
      <EnTetePage titre="Paiements">
        {aPermission(utilisateur.role, "paiements.ecrire") && (
          <Button asChild>
            <Link href="/paiements/nouveau">
              <Plus aria-hidden /> Enregistrer un paiement
            </Link>
          </Button>
        )}
      </EnTetePage>
      <BarreFiltres chemin="/paiements">
        <FiltreTexte nom="du" libelle="Du" type="date" valeur={texte(parametres, "du")} />
        <FiltreTexte nom="au" libelle="Au" type="date" valeur={texte(parametres, "au")} />
        <FiltreSelect nom="mode" libelle="Mode" valeur={texte(parametres, "mode")} options={options(LIBELLES_MODES)} />
      </BarreFiltres>
      <Suspense key={JSON.stringify(parametres)} fallback={<Chargement />}>
        <ListePaiements parametres={parametres} />
      </Suspense>
    </div>
  );
}
