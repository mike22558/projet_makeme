import type { Metadata } from "next";

import { FormulaireMotDePasse } from "@/components/auth/formulaire-mot-de-passe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LIBELLES_ROLES } from "@/lib/format";
import { requireUtilisateur } from "@/lib/permissions";

export const metadata: Metadata = { title: "Mon compte" };

export default async function PageMonCompte() {
  const utilisateur = await requireUtilisateur();

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold">Mon compte</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">
        {utilisateur.prenoms} {utilisateur.nom} · {utilisateur.email} ·{" "}
        {LIBELLES_ROLES[utilisateur.role]}
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Changer mon mot de passe</CardTitle>
        </CardHeader>
        <CardContent>
          <FormulaireMotDePasse />
        </CardContent>
      </Card>
    </div>
  );
}
