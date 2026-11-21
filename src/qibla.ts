// Kaaba, Masjid al-Haram, Makkah
export const KAABA = { lat: 21.422487, lon: 39.826206 };

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Normalize any angle to [0, 360). */
export const norm360 = (d: number) => ((d % 360) + 360) % 360;

/** Signed shortest difference from `from` to `to`, in (-180, 180]. */
export const angleDiff = (from: number, to: number) => {
  const d = norm360(to - from);
  return d > 180 ? d - 360 : d;
};

/**
 * Great-circle initial bearing (degrees from true north, clockwise)
 * from the given point to the Kaaba.
 */
export function qiblaBearing(lat: number, lon: number): number {
  const φ1 = toRad(lat);
  const φ2 = toRad(KAABA.lat);
  const Δλ = toRad(KAABA.lon - lon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return norm360(toDeg(Math.atan2(y, x)));
}

/** Great-circle distance to the Kaaba in kilometres. */
export function distanceToKaaba(lat: number, lon: number): number {
  const R = 6371;
  const dφ = toRad(KAABA.lat - lat);
  const dλ = toRad(KAABA.lon - lon);
  const a =
    Math.sin(dφ / 2) ** 2 +
    Math.cos(toRad(lat)) * Math.cos(toRad(KAABA.lat)) * Math.sin(dλ / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
