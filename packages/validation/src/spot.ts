import { z } from 'zod';

export const SpotCategoryEnum = z.enum([
  'ABANDONED',
  'CAFE',
  'BEACH',
  'ROUTE',
  'UNDERGROUND',
  'VIEWPOINT',
  'CAMP',
]);

export const AccessLevelEnum = z.enum([
  'PUBLIC',
  'TRUSTED',
  'CIRCLE_ONLY',
  'SECRET_DROP',
]);

export const CreateSpotSchema = z.object({
  title: z.string().min(3).max(120),
  story: z.string().max(2000).optional(),
  category: SpotCategoryEnum,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accessLevel: AccessLevelEnum.default('PUBLIC'),
  circleId: z.string().cuid().optional(),
  dropExpiresAt: z.string().datetime().optional(),
});
export type CreateSpotInput = z.infer<typeof CreateSpotSchema>;

export const UpdateSpotSchema = CreateSpotSchema.partial().omit({
  lat: true,
  lng: true,
});
export type UpdateSpotInput = z.infer<typeof UpdateSpotSchema>;

export const SpotQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(0.1).max(500).default(10),
  category: SpotCategoryEnum.optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
});
export type SpotQueryInput = z.infer<typeof SpotQuerySchema>;
