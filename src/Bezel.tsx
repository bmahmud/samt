import React from 'react';
import Svg, { Circle, Path, Polygon } from 'react-native-svg';
import { C, polar } from './theme';

type Props = {
  size: number;
  /** Signed degrees from the top of the phone to the Qibla; + = clockwise. */
  offset: number | null;
  aligned: boolean;
};

/**
 * Fixed (non-rotating) overlay. Draws the track the Kaaba rides on, the
 * lubber mark at 12 o'clock, and an arc from the lubber to the Kaaba that
 * shrinks to nothing as you turn toward the Qibla.
 */
export default function Bezel({ size, offset, aligned }: Props) {
  const c = size / 2;
  const rTrack = c * 0.88;
  const accent = aligned ? C.turquoise : C.goldBright;

  let arc: React.ReactNode = null;
  if (offset != null && !aligned && Math.abs(offset) > 0.5) {
    const a = polar(c, c, rTrack, 0);
    const b = polar(c, c, rTrack, offset);
    const sweep = offset > 0 ? 1 : 0;
    arc = (
      <Path
        d={`M ${a.x} ${a.y} A ${rTrack} ${rTrack} 0 0 ${sweep} ${b.x} ${b.y}`}
        stroke={C.goldBright}
        strokeOpacity={0.85}
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
      />
    );
  }

  const tipY = c - c * 0.955;
  return (
    <Svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      <Circle cx={c} cy={c} r={rTrack} fill="none" stroke={C.gold} strokeOpacity={0.22} strokeWidth={1} />
      <Circle cx={c} cy={c} r={c * 0.985} fill="none" stroke={C.gold} strokeOpacity={0.18} strokeWidth={0.6} strokeDasharray="1 5" />
      {arc}
      {/* lubber mark: where the top of the phone points */}
      <Polygon
        points={`${c - c * 0.045},${tipY - c * 0.035} ${c + c * 0.045},${tipY - c * 0.035} ${c},${tipY + c * 0.028}`}
        fill={accent}
      />
    </Svg>
  );
}
