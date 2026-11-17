import "dotenv/config";
import Fastify from "fastify";
import prismaPlugin from "./plugins/prisma.js";
import cors from "@fastify/cors";
import jwtPlugin from "./plugins/jwt.js";
import authRoutes from "./modules/auth/auth.routes.js";

const app = Fastify({ logger: true });

app.register(prismaPlugin);

app.get("/", async () => ({ message: "API funcionando!" }));

app.register(cors, { origin: "http://localhost:5173" }); // porta padrão do Vite
app.register(jwtPlugin);
app.register(authRoutes, { prefix: "/auth" });

const start = async () => {
  try {
    await app.listen({ port: 3333, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();