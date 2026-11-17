# Sistema de Controle Financeiro

Aplicativo de controle financeiro pessoal que vai além do registro de despesas: ajuda a pessoa a entender **quanto pode gastar**, **o que precisa pagar** e como chegar ao fim do mês sem surpresas.

> **Status:** em desenvolvimento. Etapa atual: **1. Cadastro e autenticação** (backend pronto; telas no front-end ainda pendentes).

## Ideia do produto

1. **A pessoa conversa com o aplicativo.** Ex.: "Recebi R$ 3.500. Tenho R$ 900 de aluguel, R$ 450 de cartão e R$ 300 de parcelas."
2. **O sistema organiza tudo.** Calcula compromissos, gastos recorrentes, vencimentos e saldo disponível, identificando despesas que ainda precisam ser confirmadas.
3. **O sistema antecipa problemas.** Avisa quando as despesas previstas estão perto de ultrapassar o dinheiro disponível e mostra quais contas vencem antes do próximo salário.
4. **A pessoa recebe orientações práticas.** Ex.: "Considerando os lançamentos cadastrados, você tem R$ 420 disponíveis para gastos variáveis até o próximo pagamento."

## Roadmap

- [ ] 1. Cadastro e autenticação (backend concluído, falta o front-end)
- [ ] 2. Receitas, despesas e categorias
- [ ] 3. Contas a pagar e parcelas
- [ ] 4. Painel com saldo atual e projeção até o próximo recebimento
- [ ] 5. Assistente conversacional que consulte os dados registrados
- [ ] 6. Notificações de vencimentos e orçamento

## Stack

| Camada | Tecnologias |
|---|---|
| Front-end (`FrontEnd/`) | React 19, Vite, TypeScript |
| Back-end (`back/`) | Node.js, Fastify 5, TypeScript (executado com `tsx`) |
| Banco de dados | MySQL, acessado com Prisma ORM 7 (adapter MariaDB) |
| Autenticação | JWT (`@fastify/jwt`), senhas com Argon2 |
| Validação | Zod |

## Estrutura do projeto

```
.
├── FrontEnd/                 # aplicação React (Vite)
└── back/
    ├── prisma/
    │   ├── schema.prisma     # modelo de dados (fonte da verdade do banco)
    │   └── migrations/       # histórico de migrations
    ├── prisma.config.ts      # configuração do Prisma CLI (lê DATABASE_URL)
    └── src/
        ├── server.ts         # criação do app e registro de plugins/rotas
        ├── plugins/
        │   ├── prisma.ts     # conexão com o MySQL (decorator app.prisma)
        │   └── jwt.ts        # JWT + decorator app.authenticate
        ├── modules/
        │   └── auth/
        │       ├── auth.schemas.ts   # validações Zod
        │       └── auth.routes.ts    # rotas /auth
        └── generated/prisma/ # client gerado pelo Prisma (não versionado)
```

## Pré-requisitos

- Node.js (versão LTS recente)
- MySQL rodando localmente (porta padrão `3306`)
- Um banco criado e vazio, por exemplo `financeiro`

## Como rodar o back-end

```bash
cd back
npm install
```

### 1. Variáveis de ambiente

Crie o arquivo `back/.env` (ele está no `.gitignore`, **nunca** o envie para o repositório):

```env
# Usada pelo Prisma CLI (migrate, studio)
DATABASE_URL="mysql://USUARIO:SENHA@localhost:3306/financeiro"

# Usadas pela API em tempo de execução (adapter MariaDB)
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=USUARIO
DATABASE_PASSWORD=SENHA
DATABASE_NAME=financeiro

# Segredo para assinar os tokens JWT (string longa e aleatória)
JWT_SECRET=troque_por_uma_string_aleatoria_longa
```

Para gerar um `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 2. Banco de dados

```bash
npx prisma migrate dev     # aplica as migrations e cria as tabelas
npx prisma generate        # gera o client em src/generated/prisma
```

> O client gerado **não é versionado**. Depois de clonar o projeto (ou trocar de máquina), rode `npx prisma generate` antes de iniciar a API.

### 3. Iniciar a API

```bash
npm run dev
```

A API sobe em `http://localhost:3333`. Teste com `GET /`, que deve responder `{ "message": "API funcionando!" }`.

### Scripts disponíveis

| Script | O que faz |
|---|---|
| `npm run dev` | Inicia a API com recarga automática (`tsx watch`) |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:generate` | `prisma generate` |
| `npm run db:studio` | Abre o Prisma Studio para ver os dados |

## Modelo de dados

### `users`

| Coluna | Tipo | Observações |
|---|---|---|
| `id` | `VARCHAR` (UUID) | Chave primária, gerado automaticamente |
| `name` | `VARCHAR(100)` | Nome do usuário |
| `email` | `VARCHAR(255)` | **Único**; usado como login (salvo em minúsculas) |
| `passwordHash` | `VARCHAR(255)` | Hash Argon2 da senha. A senha em texto puro nunca é salva |
| `createdAt` | `DATETIME` | Data de criação |
| `updatedAt` | `DATETIME` | Atualizado automaticamente |

Decisões de modelagem:

- **Salário/renda não fica em `users`.** Receitas serão modeladas na etapa 2, pois podem variar por mês e ter várias fontes.
- **CPF não é coletado.** O app não precisa dele para autenticar nem para controlar finanças, e é um dado pessoal sensível (LGPD). Só será adicionado se surgir uma necessidade real.

## API de autenticação

Base URL local: `http://localhost:3333`

### `POST /auth/register`: cadastrar usuário

Body (JSON):

```json
{
  "name": "Matheus",
  "email": "teste@email.com",
  "password": "senha1234"
}
```

Regras: `name` de 2 a 100 caracteres; `email` válido (até 255); `password` de 8 a 128 caracteres.

| Status | Significado |
|---|---|
| `201` | Criado. Retorna `{ user: { id, name, email, createdAt }, token }` |
| `400` | Dados inválidos. Retorna `{ message, errors: [{ field, message }] }` |
| `409` | E-mail já cadastrado |

### `POST /auth/login`: autenticar

Body (JSON):

```json
{
  "email": "teste@email.com",
  "password": "senha1234"
}
```

| Status | Significado |
|---|---|
| `200` | Sucesso. Retorna `{ user: { id, name, email }, token }` |
| `400` | Dados inválidos |
| `401` | E-mail ou senha inválidos (mesma mensagem para os dois casos, de propósito) |

### `GET /auth/me`: dados do usuário logado

Requer o header:

```
Authorization: Bearer <token>
```

| Status | Significado |
|---|---|
| `200` | Retorna `{ id, name, email, createdAt }` |
| `401` | Token ausente, inválido ou expirado |
| `404` | Usuário do token não existe mais |

### Como a autenticação funciona

- A senha é transformada em hash com **Argon2** antes de ir para o banco.
- No cadastro e no login, a API devolve um **JWT** com validade de **7 dias**. O `sub` do token é o `id` do usuário.
- O front-end envia o token no header `Authorization: Bearer <token>` nas rotas protegidas.
- Para proteger uma nova rota, use `{ preHandler: [app.authenticate] }` e leia o id do usuário em `req.user.sub`:

```ts
app.get("/exemplo", { preHandler: [app.authenticate] }, async (req) => {
  const userId = req.user.sub;
  // ...
});
```

- O CORS aceita apenas `http://localhost:5173` (porta padrão do Vite). Ajuste em `src/server.ts` ao publicar.

## Como rodar o front-end

```bash
cd FrontEnd
npm install
npm run dev
```

Abre em `http://localhost:5173`. As telas de cadastro e login ainda serão implementadas.

## Problemas comuns

**`We need to reset the MySQL database` ao rodar `prisma migrate dev`**
O banco já tem tabelas que o Prisma não conhece (sem histórico de migrations). Use um banco vazio ou rode `npx prisma migrate reset` (**apaga todos os dados** do banco) e depois `npx prisma migrate dev`.

**`The decorator 'prisma' has already been added!`**
O `prismaPlugin` está registrado duas vezes em `src/server.ts`. Mantenha apenas um `app.register(prismaPlugin)`.

**O TypeScript diz que `email` (ou outro campo) não existe em `User`**
O client gerado está desatualizado. Rode `npx prisma generate` e reinicie o TS server do VS Code.

**`JWT_SECRET não definido no .env`**
Adicione a variável `JWT_SECRET` ao `back/.env` e reinicie a API.

## Próximos passos

- Telas de cadastro e login no React, guardando o token e chamando `/auth/me`.
- Rate limit nas rotas de login e cadastro.
- Receitas, despesas e categorias (etapa 2).
