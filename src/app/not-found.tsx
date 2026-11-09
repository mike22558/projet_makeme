import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function PageIntrouvable() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-sm font-medium text-muted-foreground">Erreur 404</p>
      <h1 className="text-2xl font-semibold">Cette page n&apos;existe pas</h1>
      <Button asChild>
        <Link href="/dashboard">Retour au tableau de bord</Link>
      </Button>
    </main>
  );
}
