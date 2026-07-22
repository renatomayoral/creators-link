import { z } from 'zod'
import { EVM_TOKENS } from './crypto-coins'

const tokenKeys = EVM_TOKENS.map((t) => t.key) as [string, ...string[]]

export const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid EVM address')
  .transform((v) => v.toLowerCase())

export const decimalAmountSchema = z
  .string()
  .regex(/^\d+(\.\d+)?$/, 'Must be a positive decimal string')
  .refine((v) => Number(v) > 0, 'Amount must be greater than 0')

export const tokenKeySchema = z.enum(tokenKeys)

export const createPlanSchema = z.object({
  name: z.string().min(1).max(200),
  amount: decimalAmountSchema,
  tokenKey: tokenKeySchema,
  intervalDay: z.number().int().min(1).max(365),
  merchantDestinationWallet: addressSchema,
})

export const createSubscriptionSchema = z.object({
  planId: z.string().min(1),
  subscriberWallet: addressSchema.optional(),
  merchantReferenceId: z.string().max(200).optional(),
})
