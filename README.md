# sinutre-back

Backend do **SiNutre — Sistema de Ingestão de Macronutrientes**.

Stack: **TypeScript + Express + Prisma + SQLite**.

## Funcionalidades

- Login via GitHub OAuth e autenticação por JWT;
- CRUD de alimentos (a exclusão é bloqueada quando há refeições vinculadas);
- Cadastro e consulta de refeições;
- Perfil nutricional: meta calórica, altura, peso e nível de atividade;
- Dashboard de calorias consumidas no dia e alerta de meta ultrapassada;
- Métricas: IMC, faixa de classificação e média calórica dos últimos sete dias.

## Rotas protegidas

Envie `Authorization: Bearer <token>` nas rotas abaixo.

| Método | Rota | Finalidade |
| --- | --- | --- |
| GET / POST | `/foods` | Lista e cadastra alimentos |
| PATCH / DELETE | `/foods/:id` | Altera e exclui um alimento |
| GET / POST | `/meals` | Lista e cadastra refeições |
| GET / PUT | `/auth/profile` | Consulta e salva dados complementares |
| GET | `/metrics/dashboard` | Meta e consumo calórico do dia |
| GET | `/metrics` | IMC e média calórica dos últimos sete dias |

Estrutura mínima: apenas **rotas** e **controllers** (sem testes).

## Setup

```bash
npm install
cp .env.example .env          # preencha GITHUB_CLIENT_ID/SECRET e JWT_SECRET
npx prisma migrate dev        # cria prisma/dev.db e aplica as tabelas
npm run dev
```

O banco é um único arquivo em `prisma/dev.db` (ignorado pelo git). Para zerar,
basta apagar o arquivo e rodar `npx prisma migrate dev` de novo.
