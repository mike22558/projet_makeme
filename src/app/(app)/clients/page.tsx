import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import {
  BarreFiltres,
  CadreTableau,
  EnTetePage,
  EtatVide,
  FiltreTexte,
  Pagination,
} from "@/components/commun/elements";
import { Chargement } from "@/components/layout/chargement";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LIBELLES_PIECES, nomComplet } from "@/lib/format";
import { aPermission, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { filtreRechercheClient } from "@/lib/requetes/clients";
import { fenetre, numeroPage, type ParametresBruts, type ParametresRecherche, texte } from "@/lib/url";

export const metadata: Metadata = { title: "Clients" };

async function ListeClients({ parametres }: { parametres: ParametresBruts }) {
  const page = numeroPage(parametres);
  const where = filtreRechercheClient(texte(parametres, "q"));
  const [clients, total] = await Promise.all([
    prisma.client.findMany({ where, orderBy: [{ nom: "asc" }, { prenoms: "asc" }], ...fenetre(page) }),
    prisma.client.count({ where }),
  ]);

  if (clients.length === 0) return <EtatVide message="Aucun client trouvé." />;

  return (
    <>
      <CadreTableau>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Pièce d&apos;identité</TableHead>
              <TableHead>Nationalité</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/clients/${c.id}`} className="font-medium hover:underline">
                    {nomComplet(c)}
                  </Link>
                </TableCell>
                <TableCell>{c.telephone}</TableCell>
                <TableCell>
                  {LIBELLES_PIECES[c.typePiece]} · {c.numeroPiece}
                </TableCell>
                <TableCell>{c.nationalite}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CadreTableau>
      <Pagination chemin="/clients" parametres={parametres} page={page} total={total} />
    </>
  );
}

export default async function PageClients({ searchParams }: { searchParams: ParametresRecherche }) {
  const utilisateur = await requirePermission("clients.lire");
  const parametres = await searchParams;

  return (
    <div>
      <EnTetePage titre="Clients">
        {aPermission(utilisateur.role, "clients.ecrire") && (
          <Button asChild>
            <Link href="/clients/nouveau">
              <Plus aria-hidden /> Nouveau client
            </Link>
          </Button>
        )}
      </EnTetePage>
      <BarreFiltres chemin="/clients">
        <FiltreTexte nom="q" libelle="Recherche" valeur={texte(parametres, "q")} placeholder="Nom, téléphone, n° de pièce" />
      </BarreFiltres>
      <Suspense key={JSON.stringify(parametres)} fallback={<Chargement />}>
        <ListeClients parametres={parametres} />
      </Suspense>
    </div>
  );
}
