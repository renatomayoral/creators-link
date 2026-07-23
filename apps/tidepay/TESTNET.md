# Tidepay — testnet dry-run

Roteiro para validar o ciclo de cobrança (`runChargeCycle`) contra uma blockchain real, sem
arriscar fundos. Usa **Base Sepolia** (chainId `84532`) — já está no catálogo
(`src/lib/crypto-coins.ts`, `src/lib/chains.ts`) como uma entrada de teste separada da Base
mainnet, então este roteiro é executável literalmente como escrito, sem código adicional.

## 1. Preparar as wallets

Gere **duas** wallets de teste dedicadas (nunca reaproveite uma wallet com fundos reais):

- **Wallet operadora** — vira `OPERATOR_PRIVATE_KEY`. Executa os pulls e os transfers.
- **Wallet subscriber** — a que vai dar `approve` e ser cobrada. Use uma extensão de browser
  (MetaMask) para poder assinar o `approve` na página `/subscribe/[id]`.

Use duas wallets diferentes para não confundir "saldo da operadora" com "allowance concedida
pelo subscriber".

## 2. Fundear com ETH de teste (gás)

Ambas as wallets precisam de ETH de Base Sepolia para pagar gás (`approve`, `transferFrom`,
`transfer`):

- Faucet: https://www.alchemy.com/faucets/base-sepolia (ou o faucet oficial do Coinbase
  Developer Platform)

## 3. Fundear a wallet subscriber com USDC de teste

- Faucet Circle: https://faucet.circle.com — selecione **Base Sepolia**, cole o endereço da
  wallet subscriber. O contrato usado é `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (já é o
  endereço configurado em `crypto-coins.ts` para `usdc-base-sepolia`).

## 4. Subir o app localmente com a chave da operadora de teste

```bash
cd apps/tidepay
OPERATOR_PRIVATE_KEY=0x<chave-da-wallet-operadora-de-teste> \
PLATFORM_WALLET_ADDRESS=0x<qualquer-endereco-de-teste-para-receber-a-taxa> \
CRON_SECRET=test-cron-secret \
TIDEPAY_APP_URL=http://localhost:3001 \
pnpm dev
```

(Opcional: `RPC_URL_BASE_SEPOLIA=...` se quiser um RPC dedicado em vez do público do viem.)

## 5. Criar merchant, plano e assinatura

1. Registre-se no dashboard (`/login`) → onboarding cria o merchant e mostra a API key.
2. Crie um plano (`/dashboard/plans`) com `tokenKey = usdc-base-sepolia`, um valor baixo (ex.
   `"1.00"`), `intervalDay` pequeno para testar mais de um ciclo rápido (ex. `1`), e
   `merchantDestinationWallet` = um terceiro endereço de teste (pode ser qualquer wallet sua).
3. Crie uma assinatura via `POST /api/v1/subscriptions` (curl, com a API key) para esse plano.
4. Abra o `subscribeUrl` retornado no browser, conecte a wallet subscriber (MetaMask, rede Base
   Sepolia) e confirme o `approve`.

## 6. Disparar o ciclo de cobrança

```bash
curl -H "Authorization: Bearer test-cron-secret" http://localhost:3001/api/cron/charge-due
```

## 7. Verificar o resultado

- `tidepay_charge` da assinatura deve chegar a `settled`, com `pullTxHash`,
  `merchantTransferTxHash` e `platformTransferTxHash` preenchidos.
- Confira os 3 hashes em https://sepolia.basescan.org — a wallet subscriber deve ter sido
  debitada do valor bruto; a wallet merchant e a wallet plataforma devem ter recebido as frações
  corretas (bruto − taxa, e a taxa, respectivamente).
- `tidepay_subscription.status` deve virar `active`, com `currentPeriodEnd` avançado por
  `intervalDay`.
- Se `webhookUrl` estiver configurada (ex. um endpoint temporário do https://webhook.site),
  confira que o evento `payment.succeeded` chegou com `X-Tidepay-Signature` válido.

## 8. Testar o caminho de falha

1. Antes do 2º ciclo, esgote o saldo de USDC de teste da wallet subscriber (transfira para outra
   conta, por exemplo).
2. Dispare o cron de novo.
3. Confirme: o charge fica `failed` com `failureReason = 'insufficient_balance'`, a assinatura
   vira `past_due`, o webhook `payment.failed` é enviado — e **nenhuma transação on-chain nova**
   é criada (a checagem de saldo acontece antes do `transferFrom`, então nenhum gás é gasto numa
   cobrança que sabemos que vai falhar).

## Critério de sucesso

O roteiro está validado quando o passo 7 completa com os 3 hashes confirmados no Basescan Sepolia
e o passo 8 confirma o caminho de falha sem gastar gás à toa. A partir daí, o algoritmo
`runChargeCycle` pode ser considerado testado contra uma chain real (ainda que testnet) — o maior
risco não verificado do produto até este ponto.
