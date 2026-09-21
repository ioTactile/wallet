import { z } from 'zod';

export const startBankConnectionBodySchema = z
  .object({
    redirectUri: z.string().trim().min(1).max(2000),
  })
  .strict();

export const startBankConnectionResponseSchema = z
  .object({
    id: z.uuid(),
    authorizationUrl: z.url(),
  })
  .strict();

export const syncBankAccountResponseSchema = z
  .object({
    importedCount: z.int().min(0),
  })
  .strict();

export const sandboxAuthorizeQuerySchema = z.object({
  connectionId: z.string().trim().min(1).max(128),
  redirect_uri: z.string().trim().min(1).max(2000),
});

export const gocardlessReturnQuerySchema = z
  .object({
    connectionId: z.string().trim().min(1).max(128).optional(),
    ref: z.string().trim().min(1).max(128).optional(),
    redirect_uri: z.string().trim().min(1).max(2000),
  })
  .refine((query) => (query.connectionId ?? query.ref) != null, {
    message: 'connectionId or ref is required',
  })
  .transform((query) => ({
    connectionId: query.connectionId ?? query.ref!,
    redirect_uri: query.redirect_uri,
  }));

export const enableBankingReturnQuerySchema = z.object({
  code: z.string().trim().min(1).max(4000).optional(),
  state: z.string().trim().min(1).max(4000),
  error: z.string().trim().min(1).max(200).optional(),
});

export type StartBankConnectionBody = z.infer<typeof startBankConnectionBodySchema>;
export type StartBankConnectionResponse = z.infer<typeof startBankConnectionResponseSchema>;
export type SyncBankAccountResponse = z.infer<typeof syncBankAccountResponseSchema>;
export type SandboxAuthorizeQuery = z.infer<typeof sandboxAuthorizeQuerySchema>;
export type GocardlessReturnQuery = z.infer<typeof gocardlessReturnQuerySchema>;
export type EnableBankingReturnQuery = z.infer<typeof enableBankingReturnQuerySchema>;
