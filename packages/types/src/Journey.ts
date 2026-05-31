export interface JourneyWaypoint {
  lat: number;
  lng: number;
  timestamp: string;
  label?: string;
}

export interface Journey {
  id: string;
  explorerId: string;
  title: string;
  mood?: string;
  soundtrack?: string;
  routeGeoJson?: GeoJSON;
  isPrivate: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Minimal GeoJSON for route linestring
export interface GeoJSON {
  type: 'LineString' | 'FeatureCollection';
  coordinates?: [number, number][];
  features?: unknown[];
}
