import type { FastifyInstance } from "fastify";
import argon2 from "argon2";
import { registerSchema, loginSchema } from "./auth.schemas.js";
import { DEFAULT_CATEGORIES } from "../categories/categories.service.js";

export default async function authRoutes(app: FastifyInstance) {
  app.post("/register", async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message: "Dados inválidos",
        errors: parsed.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      });
    }

    const { name, email, password } = parsed.data;

    const exists = await app.prisma.user.findUnique({ where: { email } });
    if (exists) {
      return reply.code(409).send({ message: "E-mail já cadastrado" });
    }

    const passwordHash = await argon2.hash(password);

    const user = await app.prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        categories: { create: DEFAULT_CATEGORIES },
      },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    const token = app.jwt.sign({ sub: user.id });
    return reply.code(201).send({ user, token });
  });

  app.post("/login", async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Dados inválidos" });
    }

    const { email, password } = parsed.data;

    const user = await app.prisma.user.findUnique({ where: { email } });
    const valid = user && (await argon2.verify(user.passwordHash, password));

    if (!user || !valid) {
      // mesma mensagem para e-mail inexistente e senha errada
      return reply.code(401).send({ message: "E-mail ou senha inválidos" });
    }

    const token = app.jwt.sign({ sub: user.id });
    return {
      user: { id: user.id, name: user.name, email: user.email },
      token,
    };
  });

  app.get("/me", { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = await app.prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    if (!user) return reply.code(404).send({ message: "Usuário não encontrado" });
    return user;
  });
}