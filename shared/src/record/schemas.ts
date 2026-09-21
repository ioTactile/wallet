import { z } from 'zod';

import { DEFAULT_ACCOUNT_CURRENCY } from '../account.js';
import { getCategory } from '../category/catalog.js';
import { RECORD_CLEARING, RECORD_KINDS, type RecordKind } from '../record.js';

export const RECORD_NOTE_MAX_LENGTH = 500;

const centsSchema = z.int().positive();
const noteSchema = z
  .string()
  .max(RECORD_NOTE_MAX_LENGTH)
  .transform((value) => value.trim());

const clearingSchema = z.enum(RECORD_CLEARING);

function categoryMatchesKind(categoryId: string, kind: Exclude<RecordKind, 'transfer'>): boolean {
  const category = getCategory(categoryId);
  return category != null && category.kind === kind;
}

const recordBaseFields = {
  id: z.uuid(),
  userId: z.uuid(),
  amountCents: centsSchema,
  currency: z.literal(DEFAULT_ACCOUNT_CURRENCY),
  bookedAt: z.iso.datetime(),
  clearing: clearingSchema,
  note: noteSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
};

const expenseRecordSchema = z.object({
  ...recordBaseFields,
  kind: z.literal('expense'),
  accountId: z.uuid(),
  categoryId: z.string().min(1),
});

const incomeRecordSchema = z.object({
  ...recordBaseFields,
  kind: z.literal('income'),
  accountId: z.uuid(),
  categoryId: z.string().min(1),
});

const transferRecordSchema = z.object({
  ...recordBaseFields,
  kind: z.literal('transfer'),
  fromAccountId: z.uuid(),
  toAccountId: z.uuid(),
});

export const recordSchema = z.discriminatedUnion('kind', [
  expenseRecordSchema,
  incomeRecordSchema,
  transferRecordSchema,
]);

const createLedgerBodySchema = z
  .object({
    kind: z.enum(['expense', 'income']),
    accountId: z.uuid(),
    categoryId: z.string().min(1),
    amountCents: centsSchema,
    bookedAt: z.iso.datetime().optional(),
    clearing: clearingSchema.optional(),
    note: noteSchema.optional(),
  })
  .strict()
  .refine((value) => categoryMatchesKind(value.categoryId, value.kind), {
    message: 'categoryId does not match kind',
    path: ['categoryId'],
  });

const createTransferBodySchema = z
  .object({
    kind: z.literal('transfer'),
    fromAccountId: z.uuid(),
    toAccountId: z.uuid(),
    amountCents: centsSchema,
    bookedAt: z.iso.datetime().optional(),
    clearing: clearingSchema.optional(),
    note: noteSchema.optional(),
  })
  .strict()
  .refine((value) => value.fromAccountId !== value.toAccountId, {
    message: 'fromAccountId must differ from toAccountId',
    path: ['toAccountId'],
  });

export const createRecordBodySchema = z.discriminatedUnion('kind', [
  createLedgerBodySchema,
  createTransferBodySchema,
]);

export const updateRecordBodySchema = z
  .object({
    kind: z.enum(RECORD_KINDS).optional(),
    accountId: z.uuid().optional(),
    categoryId: z.string().min(1).optional(),
    fromAccountId: z.uuid().optional(),
    toAccountId: z.uuid().optional(),
    amountCents: centsSchema.optional(),
    bookedAt: z.iso.datetime().optional(),
    clearing: clearingSchema.optional(),
    note: noteSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'empty update' })
  .superRefine((value, ctx) => {
    if (value.kind === 'transfer') {
      if (value.categoryId != null) {
        ctx.addIssue({
          code: 'custom',
          message: 'Transfers have no category',
          path: ['categoryId'],
        });
      }
      if (value.accountId != null) {
        ctx.addIssue({
          code: 'custom',
          message: 'Transfers have from/to accounts',
          path: ['accountId'],
        });
      }
    }
    if (value.kind === 'expense' || value.kind === 'income') {
      if (value.fromAccountId != null || value.toAccountId != null) {
        ctx.addIssue({
          code: 'custom',
          message: 'Expense and income have a single account',
          path: value.fromAccountId != null ? ['fromAccountId'] : ['toAccountId'],
        });
      }
      if (value.categoryId != null && !categoryMatchesKind(value.categoryId, value.kind)) {
        ctx.addIssue({
          code: 'custom',
          message: 'categoryId does not match kind',
          path: ['categoryId'],
        });
      }
    }
    if (
      value.fromAccountId != null &&
      value.toAccountId != null &&
      value.fromAccountId === value.toAccountId
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'fromAccountId must differ from toAccountId',
        path: ['toAccountId'],
      });
    }
  });

function splitAccountIds(value: string | undefined): string[] | undefined {
  if (value == null || value.trim() === '') {
    return undefined;
  }
  const ids = value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return ids.length === 0 ? undefined : ids;
}

export const listRecordsQuerySchema = z
  .object({
    from: z.iso.datetime(),
    to: z.iso.datetime(),
    accountIds: z.string().optional().transform(splitAccountIds).pipe(z.array(z.uuid()).optional()),
  })
  .refine((value) => value.from <= value.to, {
    message: 'from must be before or equal to to',
    path: ['from'],
  });

export const recordsResponseSchema = z.object({
  records: z.array(recordSchema),
  openingBalanceCents: z.int(),
  periodNetCents: z.int(),
});

export type Record = z.infer<typeof recordSchema>;
export type ExpenseRecord = z.infer<typeof expenseRecordSchema>;
export type IncomeRecord = z.infer<typeof incomeRecordSchema>;
export type TransferRecord = z.infer<typeof transferRecordSchema>;
export type CreateRecordBody = z.infer<typeof createRecordBodySchema>;
export type UpdateRecordBody = z.infer<typeof updateRecordBodySchema>;
export type ListRecordsQuery = z.infer<typeof listRecordsQuerySchema>;
export type RecordsResponse = z.infer<typeof recordsResponseSchema>;
export type { RecordKind };
