import { z } from 'zod';

export const CreateCircleSchema = z.object({
  name: z.string().min(2).max(60),
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Tylko a-z, 0-9, -'),
  description: z.string().max(300).optional(),
  isInviteOnly: z.boolean().default(true),
});
export type CreateCircleInput = z.infer<typeof CreateCircleSchema>;
