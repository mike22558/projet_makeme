import type { Prisma } from "@prisma/client";
import type { Metadata } from "next";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ajouterJours } from "@/lib/dates";
import { formaterDateHeure, nomComplet, options } from "@/lib/format";
import { ACTIONS_JOURNAL } from "@/lib/journal";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  dateUrl,
  entierUrl,
  fenetre,
  numeroPage,
  type ParametresBruts,
  type ParametresRecherche,
  texte,
} from "@/lib/url";

export const metadata: Metadata = { title: "Journal d'activité" };

function libelleAction(action: string): string {
  return ACTIONS_JOURNAL[action as keyof typeof ACTIONS_JOURNAL] ?? action;
}

/** Présente les détails JSON sous la forme « clé : valeur ». */
function resumerDetails(details: Prisma.JsonValue): string {
  if (!details || typeof details !== "object" || Array.isArray(details)) return "";
  return Object.entries(details)
    .map(([cle, valeur]) => `${cle} : ${String(valeur)}`)
    .join(" · ");
}

async function ListeJournal({ parametres }: { parametres: ParametresBruts }) {
  const page = numeroPage(parametres);
  const du = dateUrl(parametres, "du");
  const au = dateUrl(parametres, "au");
  const where: Prisma.JournalActiviteWhereInput = {
    action: texte(parametres, "action") || undefined,
    utilisateurId: entierUrl(parametres, "utilisateur"),
    date: { gte: du, lt: au ? ajouterJours(au, 1) : undefined },
  };
  const [entrees, total] = await Promise.all([
    prisma.journalActivite.findMany({
      where,
      orderBy: { date: "desc" },
      include: { utilisateur: { select: { nom: true, prenoms: true } } },
      ...fenetre(page),
    }),
    prisma.journalActivite.count({ where }),
  ]);

  if (entrees.length === 0) return <EtatVide message="Aucune activité sur ces critères." />;

  return (
    <>
      <CadreTableau>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Détails</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entrees.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{formaterDateHeure(e.date)}</TableCell>
                <TableCell>{nomComplet(e.utilisateur)}</TableCell>
                <TableCell>{libelleAction(e.action)}</TableCell>
                <TableCell className="max-w-md truncate text-muted-foreground">
                  {resumerDetails(e.details)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CadreTableau>
      <Pagination chemin="/journal" parametres={parametres} page={page} total={total} />
    </>
  );
}

export default async function PageJournal({ searchParams }: { searchParams: ParametresRecherche }) {
  await requirePermission("journal.lire");
  const parametres = await searchParams;
  const utilisateurs = await prisma.utilisateur.findMany({
    orderBy: { nom: "asc" },
    select: { id: true, nom: true, prenoms: true },
  });

  return (
    <div>
      <EnTetePage titre="Journal d'activité" description="Trace des actions sensibles effectuées dans l'application." />
      <BarreFiltres chemin="/journal">
        <FiltreSelect nom="action" libelle="Action" valeur={texte(parametres, "action")} options={options(ACTIONS_JOURNAL)} />
        <FiltreSelect
          nom="utilisateur"
          libelle="Utilisateur"
          valeur={texte(parametres, "utilisateur")}
          options={utilisateurs.map((u) => ({ valeur: String(u.id), libelle: nomComplet(u) }))}
        />
        <FiltreTexte nom="du" libelle="Du" type="date" valeur={texte(parametres, "du")} />
        <FiltreTexte nom="au" libelle="Au" type="date" valeur={texte(parametres, "au")} />
      </BarreFiltres>
      <Suspense key={JSON.stringify(parametres)} fallback={<Chargement />}>
        <ListeJournal parametres={parametres} />
      </Suspense>
    </div>
  );
}
