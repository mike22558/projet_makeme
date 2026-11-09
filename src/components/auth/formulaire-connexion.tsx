"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";

import { connecter, type EtatConnexion } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ETAT_INITIAL: EtatConnexion = {};

export function FormulaireConnexion({ messageInitial }: { messageInitial?: string }) {
  const [etat, action, enCours] = useActionState(connecter, ETAT_INITIAL);
  const erreur = etat.erreur ?? messageInitial;

  return (
    <form action={action} className="space-y-5">
      {erreur && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {erreur}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Adresse e-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          defaultValue={etat.email}
          required
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="motDePasse">Mot de passe</Label>
        <Input
          id="motDePasse"
          name="motDePasse"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={enCours}>
        {enCours && <LoaderCircle className="animate-spin" aria-hidden />}
        {enCours ? "Connexion en cours…" : "Se connecter"}
      </Button>
    </form>
  );
}
