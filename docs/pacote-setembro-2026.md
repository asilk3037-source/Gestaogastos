# Pacote de Atualização e Importação — Setembro/2026

Implementação do documento `Line Finance - Pacote de Atualização e Importação v1.0`
(implantação/conciliação de Setembro/2026: saldo inicial, empréstimo recebido,
ajustes pontuais e acerto com Isabel).

## O que foi adicionado

| Necessidade do pacote | Onde foi implementado |
|---|---|
| Saldo inicial não é receita (CA-S02) | Model `OpeningBalance` + tela **Caixa** |
| Empréstimo recebido não é renda (CA-S01/CA-S02) | Model `CashEntry` (`countsAsIncome` default `false`) + tela **Caixa** |
| Ajustes pontuais de Setembro (Empréstimo Amanda, Viagem) | Model `Adjustment` — soma em `totalComprometido`/`gastoTotalMes` **só do mês** em que foram lançados (nunca recorrente) |
| Acerto com Isabel, modelo líquido (CA-S03) | Model `PersonBalance` + tela **Acertos**; `lib/finance.ts#computePersonSettlement` |
| Importação idempotente (CA-S07) | Model `ImportRecord` (`importId` único) + `lib/finance.ts#shouldApplyImport` |
| Trilha de auditoria | Model `AuditLog`, gravado em import, exclusões e fechar/reabrir mês |
| Arredondar só na exibição (UT-011) | `sumSharedAmountsCents`/`computePersonSettlement` somam em décimos de centavo e arredondam uma única vez no final |
| Teto de gastos não avaliado numa competência de implantação | Campo `Month.skipCeilingTracking` — Dashboard e Planejamento não aplicam cor de alerta (atenção/atingido/excedido) nas barras de progresso quando ativo |
| Aluguel integral (não os 50% da despesa fixa recorrente) numa competência de implantação | `Adjustment` pontual — a divisão com a Isabel continua sendo cobrada via **Acertos**, não pela despesa fixa `Aluguel` (que só passa a valer a partir de outubro/2026, já dividida 50/50) |

## Como rodar a importação

```bash
npm run db:import-set2026
```

Aplica, uma única vez (idempotente via `ImportRecord.importId = "setembro-2026-implantacao-v1"`):

- Saldo inicial: R$ 3.276,89
- Empréstimo recebido (`loan_proceeds`, não conta como renda): R$ 1.441,01
- Ajustes pontuais de Setembro: Empréstimo Amanda R$ 150,00, Viagem R$ 100,00
- Acerto Isabel (líquido): R$ 18,11 a pagar (bruto: R$ 707,95 a pagar, R$ 689,845 a receber — não arredondado)

Reexecutar o comando não duplica nada — ele confirma que o import já foi aplicado e sai.

## Conciliação manual do extrato 0283 (dados, não código)

Depois do import acima, o extrato completo do cartão 0283 de Setembro/2026 (66
linhas da planilha original) foi conciliado manualmente contra produção via SQL
(`ImportRecord.importId = "setembro-2026-extrato-0283-v1"`):

- 55 compras variáveis avulsas (R$ 2.030,70) que só existiam na planilha, categorizadas
  e lançadas como `Transaction`.
- 2 parcelamentos que faltavam por completo ("Supermercados Bh" 2x, "Cobasi Bh Castelo"
  3x, ambos 50% Isabel), como `Installment`.

E, como essa competência reflete um extrato retroativo (não gasto novo sob orçamento),
mais dois ajustes manuais (`ImportRecord.importId = "setembro-2026-aluguel-integral-v1"`):

- `Month.skipCeilingTracking = true` — o teto por categoria deixa de mostrar alertas
  de "atenção"/"excedido" nesta competência.
- Aluguel de Setembro lançado como `Adjustment` pelo valor **integral** (R$ 700,00),
  não os R$ 350,00 (50%) que a despesa fixa `Aluguel` cobraria a partir de outubro/2026
  — a metade da Isabel já está embutida no acerto de R$ 18,11 (`PersonBalance`).

## O que ficou fora do escopo (por decisão do próprio pacote)

Conforme a seção 18 do documento original: a importação completa do extrato do
cartão 0283 com reconciliação automática por transação (UT-009/UT-010) é uma
melhoria separada — exigiria uma entidade dedicada de "linhas de fatura" e um
motor de casamento transação↔parcelamento, isso ainda não está implementado
para não arriscar duplicar valores já cobertos pelo módulo Parcelamentos.
