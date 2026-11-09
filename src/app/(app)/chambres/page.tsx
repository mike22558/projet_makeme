import { EtatChambre, type Prisma } from "@prisma/client";
import { CalendarSearch, Plus, Tags } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BoutonsEtat } from "@/components/chambres/boutons-etat";
import {
  BadgeEtat,
  BarreFiltres,
  CadreTableau,
  EnTetePage,
  EtatVide,
  FiltreSelect,
  Pagination,
} from "@/components/commun/elements";
import { Chargement } from "@/components/layout/chargement";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formaterFcfa, LIBELLES_ETATS, options } from "@/lib/format";
import { aPermission, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { lireOptionsTypes } from "@/lib/requetes/chambres";
import {
  entierUrl,
  enumUrl,
  fenetre,
  numeroPage,
  type ParametresBruts,
  type ParametresRecherche,
  texte,
} from "@/lib/url";

export const metadata: Metadata = { title: "Chambres" };

interface ProprietesListe {
  parametres: ParametresBruts;
  peutEditer: boolean;
  peutChangerEtat: boolean;
}

async function ListeChambres({ parametres, peutEditer, peutChangerEtat }: ProprietesListe) {
  const page = numeroPage(parametres);
  const etage = texte(parametres, "etage");
  const where: Prisma.ChambreWhereInput = {
    etat: enumUrl(parametres, "etat", EtatChambre),
    typeId: entierUrl(parametres, "type"),
    etage: /^\d+$/.test(etage) ? Number(etage) : undefined,
  };
  const [chambres, total] = await Promise.all([
    prisma.chambre.findMany({ where, include: { type: true }, orderBy: { numero: "asc" }, ...fenetre(page) }),
    prisma.chambre.count({ where }),
  ]);

  if (chambres.length === 0) return <EtatVide message="Aucune chambre ne correspond à ces critères." />;

  return (
    <>
      <CadreTableau>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numéro</TableHead>
              <TableHead>Étage</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Capacité</TableHead>
              <TableHead>Tarif par nuit</TableHead>
              <TableHead>État</TableHead>
              {peutChangerEtat && <TableHead className="text-right">Passer à</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {chambres.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  {peutEditer ? (
                    <Link href={`/chambres/${c.id}`} className="hover:underline">
                      {c.numero}
                    </Link>
                  ) : (
                    c.numero
                  )}
                </TableCell>
                <TableCell>{c.etage}</TableCell>
                <TableCell>{c.type.libelle}</TableCell>
                <TableCell>{c.type.capacite}</TableCell>
                <TableCell>{formaterFcfa(c.type.tarifNuit)}</TableCell>
                <TableCell>
                  <BadgeEtat etat={c.etat} />
                </TableCell>
                {peutChangerEtat && (
                  <TableCell>
                    <BoutonsEtat id={c.id} etat={c.etat} />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CadreTableau>
      <Pagination chemin="/chambres" parametres={parametres} page={page} total={total} />
    </>
  );
}

export default async function PageChambres({ searchParams }: { searchParams: ParametresRecherche }) {
  const utilisateur = await requirePermission("chambres.lire");
  const parametres = await searchParams;
  const types = await lireOptionsTypes();
  const peutEditer = aPermission(utilisateur.role, "chambres.ecrire");
  const peutChangerEtat = aPermission(utilisateur.role, "chambres.changerEtat");

  return (
    <div>
      <EnTetePage titre="Chambres">
        <Button variant="outline" asChild>
          <Link href="/chambres/disponibles">
            <CalendarSearch aria-hidden /> Disponibilités
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/chambres/types">
            <Tags aria-hidden /> Types
          </Link>
        </Button>
        {peutEditer && (
          <Button asChild>
            <Link href="/chambres/nouvelle">
              <Plus aria-hidden /> Nouvelle chambre
            </Link>
          </Button>
        )}
      </EnTetePage>
      <BarreFiltres chemin="/chambres">
        <FiltreSelect nom="etat" libelle="État" valeur={texte(parametres, "etat")} options={options(LIBELLES_ETATS)} />
        <FiltreSelect nom="type" libelle="Type" valeur={texte(parametres, "type")} options={types} />
        <FiltreSelect
          nom="etage"
          libelle="Étage"
          valeur={texte(parametres, "etage")}
          options={[1, 2, 3].map((n) => ({ valeur: String(n), libelle: `Étage ${n}` }))}
        />
      </BarreFiltres>
      <Suspense key={JSON.stringify(parametres)} fallback={<Chargement />}>
        <ListeChambres parametres={parametres} peutEditer={peutEditer} peutChangerEtat={peutChangerEtat} />
      </Suspense>
    </div>
  );
}
