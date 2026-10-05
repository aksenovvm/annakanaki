import { createPrismaClient } from "@barbershop/db";
import { env } from "./env";

/** Один Prisma Client на весь сервер */
export const prisma = createPrismaClient(env.DATABASE_URL);
