import { LoaderCircle } from "lucide-react";

/**
 * Indicateur de chargement, à utiliser comme `fallback` d'un <Suspense>.
 *
 * Le <Suspense> doit être placé dans la page APRÈS l'appel à requirePermission().
 * Un fichier loading.tsx global ferait partir la réponse avant le contrôle des
 * droits : le refus d'accès ne serait plus une véritable redirection HTTP.
 */
export function Chargement() {
  return (
    <div role="status" className="flex h-64 items-center justify-center gap-3 text-muted-foreground">
      <LoaderCircle className="size-5 animate-spin" aria-hidden />
      <span className="text-sm">Chargement…</span>
    </div>
  );
}
