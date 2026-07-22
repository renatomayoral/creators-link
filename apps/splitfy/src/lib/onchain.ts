import { erc20Abi, type Address, type Hash } from 'viem'
import { getPublicClient, getOperatorWalletClient, getOperatorAddress } from './operator'
import { getConfirmations } from './chains'

export async function readAllowance(chainId: number, tokenAddress: Address, owner: Address): Promise<bigint> {
  const client = getPublicClient(chainId)
  return client.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [owner, getOperatorAddress()],
  })
}

export async function readBalance(chainId: number, tokenAddress: Address, account: Address): Promise<bigint> {
  const client = getPublicClient(chainId)
  return client.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account],
  })
}

export async function readOperatorNativeBalance(chainId: number): Promise<bigint> {
  const client = getPublicClient(chainId)
  return client.getBalance({ address: getOperatorAddress() })
}

export type TxResult = { hash: Hash; reverted: boolean }

async function waitConfirmed(chainId: number, hash: Hash): Promise<TxResult> {
  const client = getPublicClient(chainId)
  const receipt = await client.waitForTransactionReceipt({
    hash,
    confirmations: getConfirmations(chainId),
  })
  return { hash, reverted: receipt.status === 'reverted' }
}

/** Leg 1: pulls `amount` from `from` into the operator wallet. Requires prior allowance. */
export async function pullFromSubscriber(
  chainId: number,
  tokenAddress: Address,
  from: Address,
  amount: bigint,
): Promise<TxResult> {
  const wallet = getOperatorWalletClient(chainId)
  const hash = await wallet.writeContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'transferFrom',
    args: [from, getOperatorAddress(), amount],
  })
  return waitConfirmed(chainId, hash)
}

/** Legs 2/3: forwards `amount` from the operator wallet to `to`. */
export async function transferFromOperator(chainId: number, tokenAddress: Address, to: Address, amount: bigint): Promise<TxResult> {
  const wallet = getOperatorWalletClient(chainId)
  const hash = await wallet.writeContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'transfer',
    args: [to, amount],
  })
  return waitConfirmed(chainId, hash)
}
