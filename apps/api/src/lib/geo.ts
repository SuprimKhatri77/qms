// Geometry for "shops near me", kept deliberately simple: no PostGIS, just
// latitude/longitude columns and a little trigonometry.

export const EARTH_RADIUS_KM = 6371;

// One degree of latitude is about 111 km everywhere on Earth.
const KM_PER_DEGREE_LAT = 111.32;

export type BoundingBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

/**
 * The square around a point that contains every spot within `radiusKm`.
 *
 * Used as a cheap first filter ("lat BETWEEN … AND lng BETWEEN …") so the
 * exact Haversine distance only has to be worked out for shops that could
 * possibly be close enough. The square's corners reach a little further than
 * the circle, which is fine: the exact distance check removes those.
 *
 * Degrees of longitude get narrower towards the poles (by cos(latitude)), so
 * the box is wider in degrees there. Values are clamped to the valid range;
 * a search that crosses the 180° line isn't wrapped around (not a concern
 * for shops in Nepal).
 */
export function boundingBox(
  lat: number,
  lng: number,
  radiusKm: number,
): BoundingBox {
  const latDelta = radiusKm / KM_PER_DEGREE_LAT;
  // cos() is 0 at the poles; the floor keeps the division finite.
  const kmPerDegreeLng = Math.max(
    KM_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180),
    0.0001,
  );
  const lngDelta = radiusKm / kmPerDegreeLng;

  return {
    minLat: Math.max(lat - latDelta, -90),
    maxLat: Math.min(lat + latDelta, 90),
    minLng: Math.max(lng - lngDelta, -180),
    maxLng: Math.min(lng + lngDelta, 180),
  };
}
