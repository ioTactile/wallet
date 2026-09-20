import { z } from 'zod';

export const emailSchema = z.string().trim().min(1).max(255).toLowerCase().pipe(z.email());

export const passwordSchema = z.string().min(8).max(128);

export const registerBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const loginBodySchema = registerBodySchema;

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1),
});

export const logoutBodySchema = refreshBodySchema;

export const personNameSchema = z.string().trim().max(100);

export const authUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  firstName: personNameSchema.default(''),
  lastName: personNameSchema.default(''),
});

export const updateProfileBodySchema = z.object({
  firstName: personNameSchema,
  lastName: personNameSchema,
});

export const sessionResponseSchema = z.object({
  user: authUserSchema,
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type RefreshBody = z.infer<typeof refreshBodySchema>;
export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
