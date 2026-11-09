import type { Prisma, Role } from "@prisma/client";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import {
  BadgeActif,
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
import { formaterDateHeure, LIBELLES_ROLES, nomComplet, options } from "@/lib/format";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { fenetre, numeroPage, type ParametresBruts, type ParametresRecherche, texte } from "@/lib/url";

export const metadata: Metadata = { title: "Utilisateurs" };

async function ListeUtilisateurs({ parametres }: { parametres: ParametresBruts }) {
  const page = numeroPage(parametres);
  const q = texte(parametres, "q");
  const role = texte(parametres, "role");
  const where: Prisma.UtilisateurWhereInput = {
    role: role in LIBELLES_ROLES ? (role as Role) : undefined,
    OR: q ? [{ nom: { contains: q } }, { prenoms: { contains: q } }, { email: { contains: q } }] : undefined,
  };
  const [utilisateurs, total] = await Promise.all([
    prisma.utilisateur.findMany({
      where,
      orderBy: { nom: "asc" },
      ...fenetre(page),
      // Liste explicite : le mot de passe n'est jamais lu.
      select: { id: true, nom: true, prenoms: true, email: true, role: true, actif: true, derniereConnexion: true },
    }),
    prisma.utilisateur.count({ where }),
  ]);

  if (utilisateurs.length === 0) return <EtatVide message="Aucun utilisateur trouvé." />;

  return (
    <>
      <CadreTableau>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>État</TableHead>
              <TableHead>Dernière connexion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {utilisateurs.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <Link href={`/utilisateurs/${u.id}`} className="font-medium hover:underline">
                    {nomComplet(u)}
                  </Link>
                </TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{LIBELLES_ROLES[u.role]}</TableCell>
                <TableCell>
                  <BadgeActif actif={u.actif} />
                </TableCell>
                <TableCell>{u.derniereConnexion ? formaterDateHeure(u.derniereConnexion) : "Jamais"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CadreTableau>
      <Pagination chemin="/utilisateurs" parametres={parametres} page={page} total={total} />
    </>
  );
}

export default async function PageUtilisateurs({ searchParams }: { searchParams: ParametresRecherche }) {
  await requirePermission("utilisateurs.gerer");
  const parametres = await searchParams;

  return (
    <div>
      <EnTetePage titre="Utilisateurs" description="Comptes du personnel. Un compte se désactive, il ne se supprime pas.">
        <Button asChild>
          <Link href="/utilisateurs/nouveau">
            <Plus aria-hidden /> Nouvel utilisateur
          </Link>
        </Button>
      </EnTetePage>
      <BarreFiltres chemin="/utilisateurs">
        <FiltreTexte nom="q" libelle="Recherche" valeur={texte(parametres, "q")} placeholder="Nom ou e-mail" />
        <FiltreSelect nom="role" libelle="Rôle" valeur={texte(parametres, "role")} options={options(LIBELLES_ROLES)} />
      </BarreFiltres>
      <Suspense key={JSON.stringify(parametres)} fallback={<Chargement />}>
        <ListeUtilisateurs parametres={parametres} />
      </Suspense>
    </div>
  );
}
