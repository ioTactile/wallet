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

export type StartBankConnectionBody = z.infer<typeof startBankConnectionBodySchema>;
export type StartBankConnectionResponse = z.infer<typeof startBankConnectionResponseSchema>;
export type SyncBankAccountResponse = z.infer<typeof syncBankAccountResponseSchema>;
export type SandboxAuthorizeQuery = z.infer<typeof sandboxAuthorizeQuerySchema>;
