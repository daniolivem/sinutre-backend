# sinutre-back

Backend do **SiNutre — Sistema de Ingestão de Macronutrientes**.

Stack: **TypeScript + Express + Prisma + SQLite**.

## Requisitos do MVP implementados neste backend

| Ref. | Funcionalidade | Implementação |
| --- | --- | --- |
| 01 | Alterar alimento cadastrado | `PATCH /foods/:id`, restrito ao usuário autenticado. |
| 02 | Excluir alimento cadastrado | `DELETE /foods/:id`; bloqueia a exclusão quando o alimento faz parte de uma refeição, preservando o histórico. |
| 03 | Validar alimento | Valida nome obrigatório e macronutrientes numéricos, finitos e maiores ou iguais a zero. |
| 04 | Cadastrar dados complementares | `PUT /auth/profile` salva meta calórica, altura, peso e nível de atividade. |
| 05 | Alterar dados complementares | A mesma rota atualiza os dados e mantém o histórico de peso. |
| 06 | Exibir meta no dashboard | `GET /metrics/dashboard` retorna a meta calórica persistida. |
| 07 | Sinalizar meta ultrapassada | O dashboard retorna `goalExceeded`, consumo e calorias restantes. |
| 08 | Dados para página de métricas | `GET /metrics` fornece IMC e média calórica. |
| 09 | IMC e faixa | A API retorna o IMC atual e sua classificação. |
| 10 | Média calórica dos últimos sete dias | A API calcula a média, compara com a meta e informa o período. |

### Funcionalidades extras

- Autenticação via GitHub OAuth e JWT;
- Edição, exclusão e validação completa de refeições;
- Histórico de peso e IMC em `GET /auth/weight-history`, pronto para gráficos de evolução;
- Valores nutricionais da refeição são preservados mesmo se o alimento for alterado posteriormente.

> Os requisitos 11 (logout), 12 (cores da interface), página de métricas e apresentação dos dados são responsabilidades do frontend. O README do repositório do frontend deve relacionar todos os requisitos concluídos e conter os links publicados no Vercel e Railway.

## Rotas protegidas

Envie `Authorization: Bearer <token>` nas rotas abaixo.

| Método | Rota | Finalidade |
| --- | --- | --- |
| GET / POST | `/foods` | Lista e cadastra alimentos |
| PATCH / DELETE | `/foods/:id` | Altera e exclui um alimento |
| GET / POST | `/meals` | Lista e cadastra refeições |
| PATCH / DELETE | `/meals/:id` | Altera e exclui uma refeição |
| GET / PUT | `/auth/profile` | Consulta e salva dados complementares |
| GET | `/auth/weight-history` | Histórico de peso e IMC |
| GET | `/metrics/dashboard` | Meta e consumo calórico do dia |
| GET | `/metrics` | IMC e média calórica dos últimos sete dias |

## Setup

```bash
npm install
npx prisma migrate dev
npm run dev
```

Crie um arquivo `.env` na raiz antes de iniciar:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="uma-chave-segura"
GITHUB_CLIENT_ID="seu-client-id"
GITHUB_CLIENT_SECRET="seu-client-secret"
GITHUB_CALLBACK_URL="http://localhost:3333/auth/github/callback"
FRONTEND_URL="http://localhost:5173"
```

O banco local é o arquivo `prisma/dev.db`. Em produção no Railway, configure um Volume montado em `/data` e use `DATABASE_URL=file:/data/sinutre.db` para manter os dados entre deploys.
