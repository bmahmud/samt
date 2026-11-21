/**
 * Samt visual language: a mihrab niche at night.
 * Lapis-black wall, burnished-gold engraving, bone parchment type,
 * and a single Iznik-turquoise accent reserved for "facing the Qibla".
 */
export const C = {
  wall: '#071117',
  wallHi: '#0c1c24',
  nicheTop: '#123140',
  nicheBottom: '#081419',
  face: '#0c1d24',
  faceEdge: '#08151a',
  gold: '#c6a15a',
  goldBright: '#ebcd86',
  goldDim: 'rgba(198,161,90,0.32)',
  bone: '#efe6d2',
  boneMuted: '#a8a493',
  ash: '#6f7a76',
  vermilion: '#d5683f',
  turquoise: '#4fd1bd',
  kaaba: '#0a0a0a',
} as const;

export const F = {
  display: 'Marcellus_400Regular',
  arabic: 'Amiri_400Regular',
  arabicBold: 'Amiri_700Bold',
  mono: 'DMMono_400Regular',
  monoMedium: 'DMMono_500Medium',
} as const;

/** Point on a circle; `deg` is clockwise from 12 o'clock. */
export function polar(cx: number, cy: number, r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
}

/**
 * A Persian-style pointed arch. Open at the bottom unless `closed`.
 * (x, y) is the apex bounding-box corner; `rise` is apex height above the springline.
 */
export function archPath(x: number, y: number, w: number, h: number, rise: number, closed = false) {
  const mid = x + w / 2;
  const spring = y + rise;
  const d = [
    `M ${x} ${y + h}`,
    `L ${x} ${spring}`,
    `C ${x} ${y + rise * 0.38} ${mid - w * 0.1} ${y + rise * 0.16} ${mid} ${y}`,
    `C ${mid + w * 0.1} ${y + rise * 0.16} ${x + w} ${y + rise * 0.38} ${x + w} ${spring}`,
    `L ${x + w} ${y + h}`,
  ];
  if (closed) d.push('Z');
  return d.join(' ');
}
