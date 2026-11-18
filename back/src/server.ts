import "dotenv/config";
import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";
import { Prisma } from "./generated/prisma/client.js";
import { HttpError } from "./shared/http-error.js";
import prismaPlugin from "./plugins/prisma.js";
import jwtPlugin from "./plugins/jwt.js";
import authRoutes from "./modules/auth/auth.routes.js";
import categoriesRoutes from "./modules/categories/categories.routes.js";
import incomesRoutes from "./modules/incomes/incomes.routes.js";
import expensesRoutes from "./modules/expenses/expenses.routes.js";
import summaryRoutes from "./modules/summary/summary.routes.js";

const app = Fastify({ logger: true });

// Tratamento central de erros: as rotas só fazem `schema.parse(...)` ou `throw new HttpError(...)`
app.setErrorHandler((error: FastifyError | Error, req, reply) => {
  if (error instanceof ZodError) {
    return reply.code(400).send({
      message: "Dados inválidos",
      errors: error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
  }

  if (error instanceof HttpError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return reply.code(409).send({ message: "Já existe um registro com esses dados" });
  }

  const statusCode = "statusCode" in error && error.statusCode ? error.statusCode : 500;
  if (statusCode >= 500) req.log.error(error);
  return reply
    .code(statusCode)
    .send({ message: statusCode >= 500 ? "Erro interno do servidor" : error.message });
});

app.register(cors, {
  origin: "http://localhost:5173", // porta padrão do Vite
  methods: ["GET", "POST", "PATCH", "DELETE"],
});
app.register(prismaPlugin);
app.register(jwtPlugin);

app.get("/", async () => ({ message: "API funcionando!" }));

app.register(authRoutes, { prefix: "/auth" });
app.register(categoriesRoutes, { prefix: "/categories" });
app.register(incomesRoutes, { prefix: "/incomes" });
app.register(expensesRoutes, { prefix: "/expenses" });
app.register(summaryRoutes, { prefix: "/summary" });

const start = async () => {
  try {
    await app.listen({ port: 3333, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
