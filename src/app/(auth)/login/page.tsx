import { Hotel } from "lucide-react";
import type { Metadata } from "next";

import { FormulaireConnexion } from "@/components/auth/formulaire-connexion";
import { lireNomHotel } from "@/lib/parametres";

export const metadata: Metadata = { title: "Connexion" };

const MESSAGES: Record<string, string> = {
  compte_desactive: "Ce compte est désactivé. Contactez l'administrateur.",
};

export default async function PageConnexion({
  searchParams,
}: {
  searchParams: Promise<{ raison?: string }>;
}) {
  const [{ raison }, nomHotel] = await Promise.all([searchParams, lireNomHotel()]);

  return (
    <main className="grid min-h-dvh md:grid-cols-2">
      <section className="flex flex-col justify-between gap-8 bg-sidebar p-8 text-sidebar-foreground md:p-12">
        <div className="flex items-center gap-3">
          <Hotel className="size-7" aria-hidden />
          <p className="text-lg font-semibold">{nomHotel}</p>
        </div>
        <div className="max-w-md">
          <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
            Réservations, séjours et paiements, au même endroit.
          </h1>
        </div>
        <p className="text-sm text-sidebar-muted">Espace réservé au personnel de l&apos;hôtel</p>
      </section>

      <section className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold">Connexion</h2>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">
            Saisissez vos identifiants pour accéder à l&apos;application.
          </p>
          <FormulaireConnexion messageInitial={raison ? MESSAGES[raison] : undefined} />
        </div>
      </section>
    </main>
  );
}
