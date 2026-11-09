import type { ReactNode } from "react";

import { BarreLaterale } from "@/components/layout/barre-laterale";
import { lireNomHotel } from "@/lib/parametres";
import { requireUtilisateur } from "@/lib/permissions";

/** Cadre commun des pages connectées. Chaque page contrôle aussi ses propres droits. */
export default async function DispositionApplication({ children }: { children: ReactNode }) {
  const [utilisateur, nomHotel] = await Promise.all([requireUtilisateur(), lireNomHotel()]);

  return (
    <div className="flex min-h-dvh">
      <BarreLaterale utilisateur={utilisateur} nomHotel={nomHotel} />
      <main className="min-w-0 flex-1 p-4 md:p-8 print:p-0">{children}</main>
    </div>
  );
}
