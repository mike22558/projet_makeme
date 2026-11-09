import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CadreTableau, EnTetePage, EtatVide, LienRetour } from "@/components/commun/elements";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formaterFcfa } from "@/lib/format";
import { aPermission, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Types de chambres" };

export default async function PageTypes() {
  const utilisateur = await requirePermission("chambres.lire");
  const peutEditer = aPermission(utilisateur.role, "chambres.ecrire");
  const types = await prisma.typeChambre.findMany({
    orderBy: { tarifNuit: "asc" },
    include: { _count: { select: { chambres: true } } },
  });

  return (
    <div>
      <LienRetour href="/chambres" libelle="Chambres" />
      <EnTetePage titre="Types de chambres">
        {peutEditer && (
          <Button asChild>
            <Link href="/chambres/types/nouveau">
              <Plus aria-hidden /> Nouveau type
            </Link>
          </Button>
        )}
      </EnTetePage>
      {types.length === 0 ? (
        <EtatVide message="Aucun type de chambre enregistré." />
      ) : (
        <CadreTableau>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Libellé</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Capacité</TableHead>
                <TableHead>Tarif par nuit</TableHead>
                <TableHead>Chambres</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">
                    {peutEditer ? (
                      <Link href={`/chambres/types/${t.id}`} className="hover:underline">
                        {t.libelle}
                      </Link>
                    ) : (
                      t.libelle
                    )}
                  </TableCell>
                  <TableCell className="max-w-sm truncate">{t.description}</TableCell>
                  <TableCell>{t.capacite}</TableCell>
                  <TableCell>{formaterFcfa(t.tarifNuit)}</TableCell>
                  <TableCell>{t._count.chambres}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CadreTableau>
      )}
    </div>
  );
}
