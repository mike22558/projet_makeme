import type { ReactNode } from "react";

import { BoutonImprimer } from "@/components/commun/bouton-imprimer";
import type { ParametresHotel } from "@/lib/parametres";

interface Proprietes {
  hotel: ParametresHotel;
  titre: string;
  numero: string;
  date: string;
  children: ReactNode;
}

/** Mise en page commune du reçu, de la facture : l'en-tête reprend les paramètres. */
export function DocumentImprimable({ hotel, titre, numero, date, children }: Proprietes) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex justify-end print:hidden">
        <BoutonImprimer />
      </div>
      <article className="rounded-lg border bg-card p-8 print:rounded-none print:border-0 print:p-0">
        <header className="flex items-start justify-between gap-6 border-b pb-5">
          <div>
            <p className="text-lg font-semibold">{hotel.nom_hotel}</p>
            <p className="text-sm text-muted-foreground">{hotel.adresse}</p>
            <p className="text-sm text-muted-foreground">Tél. : {hotel.telephone}</p>
          </div>
          <div className="text-right">
            <h1 className="text-xl font-semibold">{titre}</h1>
            <p className="text-sm">{numero}</p>
            <p className="text-sm text-muted-foreground">{date}</p>
          </div>
        </header>
        <div className="mt-5 space-y-5">{children}</div>
      </article>
    </div>
  );
}
