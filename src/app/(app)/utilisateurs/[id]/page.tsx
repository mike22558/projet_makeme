import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  basculerActivation,
  modifierUtilisateur,
  reinitialiserMotDePasse,
} from "@/actions/utilisateurs";
import { BadgeActif, EnTetePage, LienRetour } from "@/components/commun/elements";
import { DialogueAction } from "@/components/commun/dialogue-action";
import { BoutonEnvoi, Champ, FormulaireAction } from "@/components/commun/formulaire-action";
import { ChampsUtilisateur } from "@/components/utilisateurs/champs-utilisateur";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { nomComplet } from "@/lib/format";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { idDeRoute } from "@/lib/url";

export const metadata: Metadata = { title: "Modifier un utilisateur" };

export default async function PageUtilisateur({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission("utilisateurs.gerer");
  const id = await idDeRoute(params);
  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id },
    select: { id: true, nom: true, prenoms: true, email: true, telephone: true, role: true, actif: true },
  });
  if (!utilisateur) notFound();

  const basculer = async () => {
    "use server";
    return basculerActivation(id);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <LienRetour href="/utilisateurs" libelle="Utilisateurs" />
        <EnTetePage titre={nomComplet(utilisateur)} description={<BadgeActif actif={utilisateur.actif} />}>
          {id !== admin.id && (
            <DialogueAction
              action={basculer}
              declencheur={<Button variant="outline">{utilisateur.actif ? "Désactiver" : "Activer"}</Button>}
              titre={utilisateur.actif ? "Désactiver ce compte ?" : "Activer ce compte ?"}
              description={
                utilisateur.actif
                  ? "L'utilisateur sera déconnecté et ne pourra plus accéder à l'application."
                  : "L'utilisateur pourra de nouveau se connecter."
              }
              libelleConfirmation={utilisateur.actif ? "Désactiver" : "Activer"}
              variante={utilisateur.actif ? "destructive" : "default"}
            />
          )}
        </EnTetePage>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent>
          <FormulaireAction action={modifierUtilisateur.bind(null, id)} className="space-y-4">
            <ChampsUtilisateur valeurs={utilisateur} />
            <BoutonEnvoi>Enregistrer</BoutonEnvoi>
          </FormulaireAction>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Réinitialiser le mot de passe</CardTitle>
        </CardHeader>
        <CardContent>
          <FormulaireAction action={reinitialiserMotDePasse.bind(null, id)} reinitialiser className="space-y-4">
            <Champ
              nom="motDePasse"
              libelle="Nouveau mot de passe"
              type="password"
              autoComplete="new-password"
              aide="Au moins 8 caractères, avec une minuscule, une majuscule et un chiffre."
              required
            />
            <BoutonEnvoi variant="secondary">Réinitialiser</BoutonEnvoi>
          </FormulaireAction>
        </CardContent>
      </Card>
    </div>
  );
}
