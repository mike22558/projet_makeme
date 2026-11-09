"use client";

import { Button } from "@/components/ui/button";

export default function ErreurApplication({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 p-12 text-center">
      <h1 className="text-xl font-semibold">Une erreur est survenue</h1>
      <p className="text-sm text-muted-foreground">
        L&apos;opération n&apos;a pas pu aboutir. Veuillez réessayer.
      </p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}
