import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Gestion hôtelière", template: "%s | Gestion hôtelière" },
  description: "Gestion des réservations, chambres, clients, séjours et paiements",
};

export default function DispositionRacine({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
