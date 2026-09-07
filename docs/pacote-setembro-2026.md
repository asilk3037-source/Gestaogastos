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

## O que ficou fora do escopo (por decisão do próprio pacote)

Conforme a seção 18 do documento original: a importação completa do extrato do
cartão 0283 com reconciliação automática por transação (UT-009/UT-010) é uma
melhoria separada — exigiria uma entidade dedicada de "linhas de fatura" e um
motor de casamento transação↔parcelamento, isso ainda não está implementado
para não arriscar duplicar valores já cobertos pelo módulo Parcelamentos.
