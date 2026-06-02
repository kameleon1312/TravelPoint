import { z } from 'zod';

export const CreateJourneySchema = z.object({
  title:      z.string().min(2).max(120),
  mood:       z.string().max(60).optional(),
  soundtrack: z.string().url().max(500).optional(),
  isPrivate:  z.boolean().default(true),
});
export type CreateJourneyInput = z.infer<typeof CreateJourneySchema>;

// GeoJSON FeatureCollection with a single LineString feature.
// Used when saving a recorded GPS route to a journey.
const RouteGeoJsonSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(
    z.object({
      type:     z.literal('Feature'),
      geometry: z.object({
        type:        z.literal('LineString'),
        coordinates: z.array(z.tuple([z.number(), z.number()])),
      }),
      properties: z.record(z.unknown()).nullable(),
    }),
  ),
});
export type RouteGeoJson = z.infer<typeof RouteGeoJsonSchema>;

export const UpdateJourneySchema = CreateJourneySchema
  .partial()
  .extend({ routeGeoJson: RouteGeoJsonSchema.optional() });
export type UpdateJourneyInput = z.infer<typeof UpdateJourneySchema>;
