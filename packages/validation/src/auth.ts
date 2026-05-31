import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email().toLowerCase().trim().max(255),
  handle: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-z0-9_]+$/, 'Tylko a-z, 0-9, _'),
  password: z
    .string()
    .min(12)
    .max(128)
    .regex(/[A-Z]/, 'Musi zawierać wielką literę')
    .regex(/[0-9]/, 'Musi zawierać cyfrę')
    .regex(/[^A-Za-z0-9]/, 'Musi zawierać znak specjalny'),
  acceptTerms: z.literal(true),
  acceptPrivacy: z.literal(true),
  inviteCode: z.string().optional(),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;

export const WaitlistSchema = z.object({
  email: z.string().email().toLowerCase().trim().max(255),
  handle: z.string().min(2).max(24).optional(),
  obsessions: z.array(z.string()).max(5).optional(),
});
export type WaitlistInput = z.infer<typeof WaitlistSchema>;

export const InviteRequestSchema = z.object({
  email: z.string().email().toLowerCase().trim().max(255),
  handle: z.string().min(2).max(24).regex(/^[a-z0-9_]+$/).optional(),
  whyYou: z.string().max(500).optional(),
});
export type InviteRequestInput = z.infer<typeof InviteRequestSchema>;
