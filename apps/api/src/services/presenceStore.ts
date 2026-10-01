export interface PresenceEntry {
  lat: number;
  lng: number;
}

// In-process store — ephemeral per instance, same trade-off as socket presence throttle.
// Keyed by explorerId. Populated on presence:enable, cleared on presence:disable/disconnect.
export const presenceStore = new Map<string, PresenceEntry>();
