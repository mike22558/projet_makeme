import {
  BedDouble,
  CalendarDays,
  ChartColumn,
  DoorOpen,
  History,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";

import type { Permission } from "@/lib/permissions";

export interface EntreeMenu {
  href: string;
  libelle: string;
  icone: LucideIcon;
  /** Droit de lecture du module, le même que celui contrôlé par la page. */
  permission: Permission;
}

export const MENU: readonly EntreeMenu[] = [
  { href: "/dashboard", libelle: "Tableau de bord", icone: LayoutDashboard, permission: "dashboard.lire" },
  { href: "/reservations", libelle: "Réservations", icone: CalendarDays, permission: "reservations.lire" },
  { href: "/sejours", libelle: "Séjours", icone: DoorOpen, permission: "sejours.lire" },
  { href: "/clients", libelle: "Clients", icone: Users, permission: "clients.lire" },
  { href: "/chambres", libelle: "Chambres", icone: BedDouble, permission: "chambres.lire" },
  { href: "/paiements", libelle: "Paiements", icone: Wallet, permission: "paiements.lire" },
  { href: "/rapports", libelle: "Rapports", icone: ChartColumn, permission: "rapports.financiers" },
  { href: "/journal", libelle: "Journal d'activité", icone: History, permission: "journal.lire" },
  { href: "/utilisateurs", libelle: "Utilisateurs", icone: UserCog, permission: "utilisateurs.gerer" },
  { href: "/parametres", libelle: "Paramètres", icone: Settings, permission: "parametres.gerer" },
];
