import { z } from 'zod';

import {
  ACCOUNT_KINDS,
  DEFAULT_ACCOUNT_COLOR,
  DEFAULT_ACCOUNT_CURRENCY,
  HEX_COLOR_PATTERN,
} from '../account.js';

const MIN_LESS_THAN_MAX = 'minBalanceCents must be less than maxBalanceCents';

export const accountKindSchema = z.enum(ACCOUNT_KINDS);

export const accountNameSchema = z.string().trim().min(1).max(100);

export const hexColorSchema = z
  .string()
  .trim()
  .regex(HEX_COLOR_PATTERN)
  .transform((value) => value.toUpperCase());

export const ibanSchema = z.string().trim().max(34);

export const institutionNameSchema = z.string().trim().max(100);

const centsSchema = z.int();

function hasOrderedBalanceAlerts(value: {
  minBalanceCents?: number | null;
  maxBalanceCents?: number | null;
}): boolean {
  if (value.minBalanceCents == null || value.maxBalanceCents == null) {
    return true;
  }
  return value.minBalanceCents < value.maxBalanceCents;
}

const accountBaseFields = {
  id: z.uuid(),
  userId: z.uuid(),
  name: accountNameSchema,
  currency: z.literal(DEFAULT_ACCOUNT_CURRENCY),
  color: hexColorSchema,
  excludeFromStats: z.boolean(),
  archivedAt: z.iso.datetime().nullable(),
  position: z.int().min(0),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  minBalanceCents: centsSchema.nullable(),
  maxBalanceCents: centsSchema.nullable(),
  balanceCents: centsSchema,
};

export const cashAccountSchema = z.object({
  ...accountBaseFields,
  kind: z.literal('cash'),
});

export const bankAccountSchema = z.object({
  ...accountBaseFields,
  kind: z.literal('bank'),
  iban: ibanSchema.nullable(),
  institutionName: institutionNameSchema.nullable(),
});

export const accountSchema = z.discriminatedUnion('kind', [cashAccountSchema, bankAccountSchema]);

const createAccountBaseFields = {
  name: accountNameSchema,
  currency: z.literal(DEFAULT_ACCOUNT_CURRENCY).default(DEFAULT_ACCOUNT_CURRENCY),
  color: hexColorSchema.default(DEFAULT_ACCOUNT_COLOR),
  excludeFromStats: z.boolean().default(false),
  minBalanceCents: centsSchema.nullable().optional(),
  maxBalanceCents: centsSchema.nullable().optional(),
};

const createCashAccountBodySchema = z
  .object({
    ...createAccountBaseFields,
    kind: z.literal('cash'),
  })
  .strict();

const createBankAccountBodySchema = z
  .object({
    ...createAccountBaseFields,
    kind: z.literal('bank'),
    iban: ibanSchema.nullable().optional(),
    institutionName: institutionNameSchema.nullable().optional(),
  })
  .strict();

export const createAccountBodySchema = z
  .discriminatedUnion('kind', [createCashAccountBodySchema, createBankAccountBodySchema])
  .refine(hasOrderedBalanceAlerts, { message: MIN_LESS_THAN_MAX, path: ['minBalanceCents'] });

export const updateAccountBodySchema = z
  .object({
    name: accountNameSchema.optional(),
    color: hexColorSchema.optional(),
    excludeFromStats: z.boolean().optional(),
    minBalanceCents: centsSchema.nullable().optional(),
    maxBalanceCents: centsSchema.nullable().optional(),
    iban: ibanSchema.nullable().optional(),
    institutionName: institutionNameSchema.nullable().optional(),
  })
  .strict()
  .refine(hasOrderedBalanceAlerts, { message: MIN_LESS_THAN_MAX, path: ['minBalanceCents'] });

export const archiveAccountBodySchema = z
  .object({
    archived: z.boolean(),
  })
  .strict();

export const listAccountsQuerySchema = z.object({
  includeArchived: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export const accountsResponseSchema = z.object({
  accounts: z.array(accountSchema),
});

export type Account = z.infer<typeof accountSchema>;
export type CashAccount = z.infer<typeof cashAccountSchema>;
export type BankAccount = z.infer<typeof bankAccountSchema>;
export type CreateAccountBody = z.infer<typeof createAccountBodySchema>;
export type UpdateAccountBody = z.infer<typeof updateAccountBodySchema>;
export type ArchiveAccountBody = z.infer<typeof archiveAccountBodySchema>;
export type ListAccountsQuery = z.infer<typeof listAccountsQuerySchema>;
export type AccountsResponse = z.infer<typeof accountsResponseSchema>;
