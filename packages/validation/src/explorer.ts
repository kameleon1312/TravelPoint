import { z } from 'zod';

export const HomeBaseSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type HomeBaseInput = z.infer<typeof HomeBaseSchema>;

export const ProfileUpdateSchema = z.object({
  displayName:     z.string().min(1).max(60).optional(),
  bio:             z.string().max(500).optional(),
  archetype:       z.enum(['WANDERER', 'URBEXER', 'NOMAD', 'HUNTER', 'PILGRIM']).optional(),
  obsessions:      z.array(z.string().min(1).max(40)).max(10).optional(),
  territories:     z.array(z.string().min(1).max(60)).max(20).optional(),
  locationConsent: z.boolean().optional(),
  presenceConsent: z.boolean().optional(),
}).strict();

export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;
