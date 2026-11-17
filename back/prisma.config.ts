import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// configuração que aponta onde o prisma tem que buscar a URL do banco (no caso dentro do .env)

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_URL") },
});


