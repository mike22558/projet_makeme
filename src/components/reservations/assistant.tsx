import { Check } from "lucide-react";
import Form from "next/form";
import Link from "next/link";

import { ChampsClient } from "@/components/clients/champs-client";
import { CadreTableau, EtatVide, FiltreTexte } from "@/components/commun/elements";
import { BoutonEnvoi, FormulaireAction } from "@/components/commun/formulaire-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ActionFormulaire } from "@/lib/actions";
import { formaterFcfa, nomComplet } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { filtreRechercheClient } from "@/lib/requetes/clients";

const NB_CLIENTS_PROPOSES = 8;

/** Fil d'étapes des assistants de réservation et d'arrivée sans réservation. */
export function EtapesAssistant({ etapes, courante }: { etapes: readonly string[]; courante: number }) {
  return (
    <ol className="mb-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
      {etapes.map((etape, index) => {
        const terminee = index < courante;
        const active = index === courante;
        return (
          <li key={etape} className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
            <span
              className={`flex size-6 items-center justify-center rounded-full text-xs font-medium ${
                active || terminee ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {terminee ? <Check className="size-3.5" aria-hidden /> : index + 1}
            </span>
            <span className={active ? "font-medium" : "text-muted-foreground"}>{etape}</span>
          </li>
        );
      })}
    </ol>
  );
}

interface ChambreProposee {
  id: number;
  numero: string;
  etage: number;
  type: { libelle: string; capacite: number; tarifNuit: number };
}

/** Étape 2 : liste des chambres disponibles, chacune menant à l'étape suivante. */
export function ChoixChambre({
  chambres,
  lien,
}: {
  chambres: readonly ChambreProposee[];
  lien: (chambreId: number) => string;
}) {
  if (chambres.length === 0) return <EtatVide message="Aucune chambre disponible pour cette demande." />;
  return (
    <CadreTableau>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Numéro</TableHead>
            <TableHead>Étage</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Capacité</TableHead>
            <TableHead>Tarif par nuit</TableHead>
            <TableHead className="text-right">Choix</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {chambres.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.numero}</TableCell>
              <TableCell>{c.etage}</TableCell>
              <TableCell>{c.type.libelle}</TableCell>
              <TableCell>{c.type.capacite}</TableCell>
              <TableCell>{formaterFcfa(c.type.tarifNuit)}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" asChild>
                  <Link href={lien(c.id)}>Choisir</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CadreTableau>
  );
}

interface ProprietesChoixClient {
  chemin: string;
  /** Paramètres de l'assistant à conserver lors de la recherche. */
  conserves: Record<string, string>;
  q: string;
  lierClientExistant: (clientId: number) => ActionFormulaire;
  actionNouveauClient: ActionFormulaire;
  libelleValider: string;
}

/** Dernière étape : client existant (recherche) ou nouveau client. */
export async function ChoixClient({
  chemin,
  conserves,
  q,
  lierClientExistant,
  actionNouveauClient,
  libelleValider,
}: ProprietesChoixClient) {
  const clients = await prisma.client.findMany({
    where: filtreRechercheClient(q),
    orderBy: q ? { nom: "asc" } : { creeLe: "desc" },
    take: NB_CLIENTS_PROPOSES,
  });

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Client existant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Form action={chemin} className="flex items-end gap-2">
            {Object.entries(conserves).map(([cle, valeur]) => (
              <input key={cle} type="hidden" name={cle} value={valeur} />
            ))}
            <FiltreTexte nom="q" libelle="Recherche" valeur={q} placeholder="Nom, téléphone, n° de pièce" />
            <Button type="submit" variant="secondary">
              Rechercher
            </Button>
          </Form>
          {clients.length === 0 ? (
            <EtatVide message="Aucun client trouvé." />
          ) : (
            <ul className="divide-y">
              {clients.map((client) => (
                <li key={client.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{nomComplet(client)}</p>
                    <p className="text-xs text-muted-foreground">
                      {client.telephone} · {client.numeroPiece}
                    </p>
                  </div>
                  <FormulaireAction action={lierClientExistant(client.id)}>
                    <BoutonEnvoi size="sm">{libelleValider}</BoutonEnvoi>
                  </FormulaireAction>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nouveau client</CardTitle>
        </CardHeader>
        <CardContent>
          <FormulaireAction action={actionNouveauClient} className="space-y-4">
            <ChampsClient />
            <BoutonEnvoi>Enregistrer le client et valider</BoutonEnvoi>
          </FormulaireAction>
        </CardContent>
      </Card>
    </div>
  );
}
