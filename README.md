# Line Finance — Sistema de Gestão Financeira Pessoal

Aplicação web de planejamento e controle financeiro mensal, construída a partir da
especificação funcional e técnica v1.0 (`Documentacao_Sistema_Gestao_Financeira_Aline_v1.0.docx`)
e semeada com os dados reais de outubro–dezembro/2026 da planilha
`Sistema_Financeiro_Aline_Outubro_a_Dezembro_2026.xlsx`.

O sistema **não é uma cópia estática da planilha**: parcelamentos e despesas fixas são
entidades reais que o sistema projeta mês a mês (X/Y, encerramento automático), tetos por
categoria são configuráveis por competência, e qualquer mês futuro — inclusive além de
dezembro/2026 — é criado sob demanda ao ser aberto, com tetos padrão herdados do mês
anterior/categoria.

## Visual

Interface inspirada num app nativo de macOS: janela com cantos arredondados, barra de
título com os três botões (fechar/minimizar/maximizar), sidebar clara ao estilo
Finder/Ajustes do Sistema (com um "ícone de app" colorido por seção) e paleta de sistema —
cinza claro de fundo, cartões brancos, azul de sistema como cor de destaque e acentos vivos
(verde, laranja, roxo, rosa, teal) para categorias e status. No mobile, a barra de janela
some e a navegação inferior vira uma **Dock** flutuante e translúcida. Todos os tokens de
cor ficam centralizados em `tailwind.config.ts` (`base`, `brand`, `slate`, `good`/`warn`/`bad`/`info`,
`traffic`) — trocar o tema é editar um arquivo só.

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **Prisma** + **SQLite** (arquivo local `prisma/dev.db`) — troque `DATABASE_URL` no `.env`
  para apontar a um Postgres (ex.: Supabase) sem alterar o schema, se preferir persistência
  em nuvem
- **Recharts** para os gráficos do dashboard, **lucide-react** para ícones
- **Vitest** para os testes das regras de cálculo
- Mutações via **Server Actions** do Next.js (formulários HTML nativos, sem API REST
  intermediária); leituras via funções server-only em `lib/queries.ts`

## Instalação

```bash
npm install
cp .env.example .env        # DATABASE_URL="file:./dev.db"
npm run db:push             # cria o schema no SQLite
npm run db:seed             # popula com os dados iniciais (out–dez/2026)
```

## Execução

```bash
npm run dev       # http://localhost:3000
```

Build de produção:

```bash
npm run build
npm start
```

## Testes

As regras de cálculo (`lib/finance.ts`) são funções puras, testadas isoladamente contra os
oito critérios de aceite da especificação (seção 15, CA-01 a CA-08):

```bash
npm test
```

## Arquitetura

```
app/                    Rotas (App Router) — uma pasta por tela, todas em português
  page.tsx              Dashboard
  lancamentos/           Lançamentos (lista + formulário)
  planejamento/           Renda, meta de reserva, tetos por categoria, compromissos
  parcelamentos/          Compras parceladas (X/Y por competência)
  despesas-fixas/         Aluguel, empréstimo e outras despesas recorrentes
  metas/                  Meta de reserva do mês + roadmap
  relatorios/             Comparativo planejado x realizado, mês a mês
  categorias/             Categorias e tetos padrão
  contas/                 Formas de pagamento (cartões, Pix, dinheiro...)
  perfil/                 Dados da conta + exportação (backup em JSON)
  api/export/route.ts     Endpoint de backup/exportação (JSON)

lib/
  finance.ts             Núcleo de regras de negócio (funções puras, sem I/O)
  db.ts                  Cliente Prisma (singleton)
  queries.ts              Leituras (Server Components) — inclui a "virada de mês"
  actions.ts              Mutações ("use server") — formulários chamam estas funções direto
  format.ts               Conversão reais <-> centavos, formatação BRL
  nav.ts / params.ts       Navegação e parsing de querystring (?y=&m=)

components/               UI: shell (sidebar desktop / navegação inferior mobile), cards,
                          gráficos, ícones de categoria, confirmação de exclusão

prisma/
  schema.prisma           Modelo de dados (ver seção abaixo)
  seed.ts                 Dados iniciais reais (outubro–dezembro/2026)

tests/
  finance.test.ts          Testes unitários dos critérios de aceite CA-01 a CA-08
```

### Por que Server Actions em vez de uma API REST?

O app é de uso pessoal (mono-usuário, conforme escopo da spec) e todas as telas são Server
Components. Formulários HTML chamam as funções de `lib/actions.ts` diretamente
(`<form action={createTransaction}>`), o que elimina uma camada de API sem sacrificar
capacidade de evoluir: qualquer action pode virar uma rota `app/api/**/route.ts` depois, se o
sistema ganhar um app mobile nativo ou multiusuário.

## Banco de dados

Modelo relacional (SQLite via Prisma) — nomes conforme sugerido na seção 10 da spec:

| Entidade | Papel |
|---|---|
| `User` | Usuária do sistema (mono-usuário nesta versão) |
| `Month` | Uma competência (ano+mês). Criada sob demanda; guarda renda líquida, meta de reserva e status (aberto/fechado) |
| `Category` | Categoria de gasto variável, com teto padrão |
| `MonthlyLimit` | Teto de uma categoria **numa competência específica** — editar o teto de um mês nunca afeta outro |
| `PaymentMethod` | Cartões, Pix, débito, dinheiro... O cartão inicial (0283) é apenas o primeiro cadastro, não uma regra fixa no código |
| `Transaction` | Lançamento variável (data, categoria, valor, forma de pagamento, necessário?, observação) |
| `Installment` | Compra parcelada — descrição, valor da parcela, nº total, competência inicial, **percentual pessoal** (para despesas compartilhadas, ex. Casas Bahia = 50%) |
| `FixedExpense` | Despesa fixa/recorrente (aluguel, empréstimo...), com duração opcional em meses e percentual pessoal |

**Nenhum valor de teto, cartão ou percentual de divisão está hardcoded na interface** — os
valores iniciais (R$150 Transporte, cartão 0283, Casas Bahia 50% etc.) são **dados no banco**,
carregados pelo seed, e editáveis nas telas de Categorias, Contas e Planejamento.

### Como X/Y é calculado

`lib/finance.ts` calcula, para qualquer parcelamento e qualquer competência, a parcela atual
por diferença de meses entre a competência informada e a competência inicial cadastrada — não
existe um campo "parcela atual" armazenado. Ao ultrapassar o número total de parcelas, o
parcelamento simplesmente deixa de aparecer no planejamento daquele mês (encerramento
automático). O mesmo princípio vale para despesas fixas com duração definida (ex.: empréstimo
de 4 meses).

## Dados iniciais (seed)

- **Categorias e tetos**: Transporte R$150, Alimentação/delivery R$150, Assinaturas R$100,
  Lazer R$100, Pet R$50, Outros R$50 (teto total R$600/mês)
- **Despesas fixas**: Aluguel (R$700 total, 50% pessoal = R$350/mês, recorrência indefinida) e
  Empréstimo (R$386,74/mês por 4 meses a partir de outubro/2026)
- **10 parcelamentos ativos**, incluindo a compra na Casas Bahia (cartão 3764, 50%
  compartilhado com "Isabel")
- **Meses**: outubro, novembro e dezembro/2026 pré-criados (o sistema cria qualquer mês
  seguinte automaticamente ao ser aberto — inclusive janeiro/2027 em diante)
- **Renda líquida propositalmente não preenchida** — a planilha original não define esse
  valor; a usuária deve informá-lo em Planejamento para ver a sobra prevista e o saldo do mês

Para reimportar os dados iniciais do zero: `npm run db:reset` (apaga e recria o banco).

## Critérios de aceite (spec §15)

Todos os 8 critérios (CA-01 a CA-08) têm teste automatizado em `tests/finance.test.ts` e foram
validados manualmente na aplicação rodando (ex.: informar renda de R$3.000 em
outubro/2026 resulta em sobra prevista de R$293,78, exatamente como no CA-01).

## Manutenção

- **Novas categorias/tetos**: tela Categorias (define o valor padrão usado ao abrir um mês
  novo) ou Planejamento (ajusta apenas o mês selecionado).
- **Novo cartão/conta**: tela Contas. Nenhuma automação assume um cartão específico — uma
  forma de pagamento só entra no planejamento se um lançamento, parcelamento ou despesa fixa
  apontar para ela.
- **Fechar um mês**: em Planejamento → "Fechar mês". Um mês fechado continua consultável e
  pode ser reaberto a qualquer momento (a reabertura fica registrada em `status`/`closedAt`).
- **Backup**: Perfil → "Exportar dados (JSON)", ou `GET /api/export`.
- **Alterar o schema**: edite `prisma/schema.prisma` e rode `npm run db:push` (ambiente local,
  sem migrations versionadas) — para produção, migre para `prisma migrate` quando o projeto
  amadurecer.

## Fora do escopo desta versão

Conforme seção 2.2 da especificação: integração bancária/Open Finance, pagamento de contas
pelo sistema, controle contábil/fiscal e multiusuário. A seção 16 (melhorias futuras) está
listada na tela Metas como roadmap.
