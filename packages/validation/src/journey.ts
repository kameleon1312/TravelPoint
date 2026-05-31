import { z } from 'zod';

export const CreateJourneySchema = z.object({
  title: z.string().min(2).max(120),
  mood: z.string().max(60).optional(),
  soundtrack: z.string().url().max(500).optional(),
  isPrivate: z.boolean().default(true),
});
export type CreateJourneyInput = z.infer<typeof CreateJourneySchema>;

export const UpdateJourneySchema = CreateJourneySchema.partial();
export type UpdateJourneyInput = z.infer<typeof UpdateJourneySchema>;
