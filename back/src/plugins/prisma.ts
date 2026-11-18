import fp from "fastify-plugin";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client.js";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(async (app) => {
  const adapter = new PrismaMariaDb({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    connectionLimit: 5,
    // falha em 5s com erro claro de conexão, em vez do timeout genérico do Fastify (10s)
    connectTimeout: 5000,
    acquireTimeout: 5000,
    allowPublicKeyRetrieval: true, // necessário em alguns setups com MySQL 8
  });

  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();

  app.decorate("prisma", prisma);
  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
});