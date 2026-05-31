// Why: precise public coordinates can physically endanger a traveler.
// We jitter within a radius and round to reduce re-identification.
// The jitter seed rotates per session so a static offset cannot be reverse-engineered.
const EARTH_R = 6371000;

export function fuzzCoordinates(
  lat: number,
  lng: number,
  radiusMeters = 500,
  sessionSeed: number,
): { lat: number; lng: number } {
  const rng = mulberry32(sessionSeed);
  const angle = rng() * 2 * Math.PI;
  const dist = Math.sqrt(rng()) * radiusMeters;
  const dLat = (dist * Math.cos(angle)) / EARTH_R;
  const dLng =
    (dist * Math.sin(angle)) / (EARTH_R * Math.cos((lat * Math.PI) / 180));
  return {
    lat: +(lat + (dLat * 180) / Math.PI).toFixed(4), // ~11 m grid
    lng: +(lng + (dLng * 180) / Math.PI).toFixed(4),
  };
}

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateSessionSeed(): number {
  return Math.floor(Math.random() * 2 ** 32);
}
