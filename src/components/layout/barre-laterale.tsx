import { Hotel, KeyRound, LogOut } from "lucide-react";

import { deconnecter } from "@/actions/auth";
import { LienNavigation } from "@/components/layout/lien-navigation";
import { LIBELLES_ROLES } from "@/lib/format";
import { MENU } from "@/lib/navigation";
import { aPermission, type UtilisateurCourant } from "@/lib/permissions";

interface Proprietes {
  utilisateur: UtilisateurCourant;
  nomHotel: string;
}

/** Barre latérale : réduite aux icônes sur tablette, complète sur grand écran. */
export function BarreLaterale({ utilisateur, nomHotel }: Proprietes) {
  const entrees = MENU.filter((entree) => aPermission(utilisateur.role, entree.permission));

  return (
    <aside className="sticky top-0 flex h-dvh w-16 shrink-0 flex-col bg-sidebar p-3 text-sidebar-foreground print:hidden lg:w-64">
      <div className="mb-6 flex h-10 items-center justify-center gap-3 lg:justify-start lg:px-2">
        <Hotel className="size-6 shrink-0" aria-hidden />
        <span className="sr-only truncate font-semibold lg:not-sr-only">{nomHotel}</span>
      </div>

      <nav aria-label="Navigation principale" className="flex-1 space-y-1 overflow-y-auto">
        {entrees.map(({ href, libelle, icone: Icone }) => (
          <LienNavigation key={href} href={href} libelle={libelle}>
            <Icone className="size-5 shrink-0" aria-hidden />
          </LienNavigation>
        ))}
      </nav>

      <div className="mt-3 space-y-1 border-t border-sidebar-accent pt-3">
        <div className="hidden px-3 pb-2 lg:block">
          <p className="truncate text-sm font-medium">
            {utilisateur.prenoms} {utilisateur.nom}
          </p>
          <p className="text-xs text-sidebar-muted">{LIBELLES_ROLES[utilisateur.role]}</p>
        </div>
        <LienNavigation href="/mon-compte" libelle="Mon compte">
          <KeyRound className="size-5 shrink-0" aria-hidden />
        </LienNavigation>
        <form action={deconnecter}>
          <button
            type="submit"
            title="Se déconnecter"
            className="flex h-10 w-full items-center justify-center gap-3 rounded-md text-sm text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground lg:justify-start lg:px-3"
          >
            <LogOut className="size-5 shrink-0" aria-hidden />
            <span className="sr-only lg:not-sr-only">Se déconnecter</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
