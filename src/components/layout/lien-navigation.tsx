"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "cn";

interface Proprietes {
  href: string;
  libelle: string;
  children: ReactNode;
}

/** Lien de la barre latérale, mis en évidence lorsque le module est ouvert. */
export function LienNavigation({ href, libelle, children }: Proprietes) {
  const cheminCourant = usePathname();
  const actif = cheminCourant === href || cheminCourant.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      title={libelle}
      aria-current={actif ? "page" : undefined}
      className={cn(
        "flex h-10 items-center justify-center gap-3 rounded-md text-sm transition-colors lg:justify-start lg:px-3",
        "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground",
        actif && "bg-sidebar-accent font-medium text-sidebar-foreground",
      )}
    >
      {children}
      <span className="sr-only lg:not-sr-only">{libelle}</span>
    </Link>
  );
}
