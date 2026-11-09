import { ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireUtilisateur } from "@/lib/permissions";

export const metadata: Metadata = { title: "Accès refusé" };

export default async function PageAccesRefuse() {
  await requireUtilisateur();

  return (
    <div className="flex flex-col items-center gap-4 p-12 text-center">
      <ShieldAlert className="size-10 text-destructive" aria-hidden />
      <h1 className="text-xl font-semibold">Accès refusé</h1>
      <p className="text-sm text-muted-foreground">
        Votre rôle ne vous permet pas d&apos;accéder à cette page.
      </p>
      <Button asChild>
        <Link href="/dashboard">Retour au tableau de bord</Link>
      </Button>
    </div>
  );
}
