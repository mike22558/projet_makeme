import { PrismaClient } from "@prisma/client";

// En développement, le rechargement à chaud réévalue les modules. Conserver le
// client dans l'objet global évite d'ouvrir une nouvelle connexion à chaque fois.
const stockageGlobal = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = stockageGlobal.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  stockageGlobal.prisma = prisma;
}
