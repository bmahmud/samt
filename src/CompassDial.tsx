import React, { memo } from 'react';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { C, F, polar } from './theme';

type Props = {
  size: number;
  qibla: number | null; // bearing in degrees from true north
  aligned: boolean;
};

/** Points of an n-pointed star polygon, alternating outer/inner radius. */
function starPoints(cx: number, cy: number, n: number, rOut: number, rIn: number, phase = 0) {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const p = polar(cx, cy, i % 2 === 0 ? rOut : rIn, phase + (i * 180) / n);
    pts.push(`${p.x.toFixed(2)},${p.y.toFixed(2)}`);
  }
  return pts.join(' ');
}

/** Square centred on (cx, cy) with circumradius r, rotated by `deg`. */
function squarePoints(cx: number, cy: number, r: number, deg: number) {
  return [0, 90, 180, 270]
    .map((a) => polar(cx, cy, r, a + deg))
    .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ');
}

/**
 * The rotating dial, engraved like an astrolabe plate. 0° is drawn at the top;
 * the parent rotates the whole dial by -heading so 0° tracks true north.
 * The Kaaba rides the outer track at the Qibla bearing, with an alidade needle
 * pointing at it from the centre.
 */
function CompassDialBase({ size, qibla, aligned }: Props) {
  const c = size / 2;
  const R = {
    track: c * 0.88, // Kaaba rides here (fixed bezel draws the turn arc on it)
    face: c * 0.8,
    tickIn: c * 0.72,
    numerals: c * 0.635,
    cardinals: c * 0.515,
    starOut: c * 0.4,
    starIn: c * 0.31,
    hub: c * 0.155,
  };
  const accent = aligned ? C.turquoise : C.gold;

  const ticks = [];
  for (let d = 0; d < 360; d += 2) {
    const major30 = d % 30 === 0;
    const major10 = d % 10 === 0;
    const len = major30 ? c * 0.075 : major10 ? c * 0.05 : c * 0.025;
    const a = polar(c, c, R.face - 1.5, d);
    const b = polar(c, c, R.face - 1.5 - len, d);
    ticks.push(
      <Line
        key={`t${d}`}
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={major30 ? C.goldBright : C.gold}
        strokeOpacity={major10 ? 1 : 0.55}
        strokeWidth={major30 ? 1.6 : major10 ? 1.1 : 0.7}
      />,
    );
  }

  const numFs = Math.max(8, c * 0.068);
  const numerals = [];
  for (let d = 30; d < 360; d += 30) {
    if (d % 90 === 0) continue; // cardinals take these
    numerals.push(
      <G key={`n${d}`} transform={`rotate(${d} ${c} ${c})`}>
        <SvgText
          x={c}
          y={c - R.numerals + numFs * 0.35}
          fill={C.boneMuted}
          fontFamily={F.mono}
          fontSize={numFs}
          letterSpacing={0.5}
          textAnchor="middle"
        >
          {String(d).padStart(3, '0')}
        </SvgText>
      </G>,
    );
  }

  const cardFs = c * 0.13;
  const cardinals = ['N', 'E', 'S', 'W'].map((l, i) => (
    <G key={l} transform={`rotate(${i * 90} ${c} ${c})`}>
      <SvgText
        x={c}
        y={c - R.cardinals + cardFs * 0.36}
        fill={l === 'N' ? C.vermilion : C.bone}
        fontFamily={F.display}
        fontSize={cardFs}
        textAnchor="middle"
      >
        {l}
      </SvgText>
    </G>
  ));

  // North pip on the face rim
  const nTip = polar(c, c, R.face + c * 0.005, 0);
  const north = (
    <Polygon
      points={`${nTip.x - c * 0.035},${nTip.y - c * 0.045} ${nTip.x + c * 0.035},${nTip.y - c * 0.045} ${nTip.x},${nTip.y + c * 0.01}`}
      fill={C.vermilion}
    />
  );

  // Alidade needle + Kaaba on the outer track
  const k = c * 0.085;
  const kaaba =
    qibla == null ? null : (
      <G transform={`rotate(${qibla} ${c} ${c})`}>
        <Line x1={c} y1={c - R.hub - 3} x2={c} y2={c - R.face + c * 0.1} stroke={accent} strokeWidth={1.4} />
        <Polygon
          points={`${c - c * 0.032},${c - R.face + c * 0.11} ${c + c * 0.032},${c - R.face + c * 0.11} ${c},${c - R.face + c * 0.02}`}
          fill={accent}
        />
        {/* counterweight */}
        <Polygon
          points={`${c},${c + R.hub + 3} ${c + c * 0.03},${c + R.hub + c * 0.08} ${c},${c + R.hub + c * 0.14} ${c - c * 0.03},${c + R.hub + c * 0.08}`}
          fill="none"
          stroke={accent}
          strokeWidth={1}
        />
        {/* the cube */}
        <Rect
          x={c - k / 2}
          y={c - R.track - k / 2}
          width={k}
          height={k}
          rx={1}
          fill={C.kaaba}
          stroke={aligned ? C.turquoise : C.goldBright}
          strokeWidth={aligned ? 1.8 : 0.9}
        />
        <Rect x={c - k / 2} y={c - R.track - k * 0.22} width={k} height={k * 0.13} fill={C.goldBright} />
      </G>
    );

  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id="face" cx="50%" cy="42%" r="60%">
          <Stop offset="0%" stopColor="#163541" />
          <Stop offset="70%" stopColor={C.face} />
          <Stop offset="100%" stopColor={C.faceEdge} />
        </RadialGradient>
      </Defs>

      {/* plate */}
      <Circle cx={c} cy={c} r={R.face} fill="url(#face)" stroke={C.gold} strokeWidth={1.2} />
      <Circle cx={c} cy={c} r={R.face - 4} fill="none" stroke={C.gold} strokeOpacity={0.35} strokeWidth={0.6} />
      <Circle cx={c} cy={c} r={R.tickIn - c * 0.03} fill="none" stroke={C.gold} strokeOpacity={0.25} strokeWidth={0.6} />
      {ticks}
      {numerals}

      {/* girih rosette */}
      <Polygon points={starPoints(c, c, 16, R.starOut, R.starIn)} fill="none" stroke={C.gold} strokeOpacity={0.55} strokeWidth={0.8} />
      <Polygon points={squarePoints(c, c, R.starIn * 0.95, 0)} fill="none" stroke={C.gold} strokeOpacity={0.35} strokeWidth={0.7} />
      <Polygon points={squarePoints(c, c, R.starIn * 0.95, 45)} fill="none" stroke={C.gold} strokeOpacity={0.35} strokeWidth={0.7} />
      <Polygon points={starPoints(c, c, 8, R.starIn * 0.62, R.hub * 1.15, 22.5)} fill="none" stroke={C.gold} strokeOpacity={0.25} strokeWidth={0.6} />

      {cardinals}
      {north}
      {kaaba}

      {/* hub (the upright medallion text is layered above by the parent) */}
      <Circle cx={c} cy={c} r={R.hub} fill={C.faceEdge} stroke={C.gold} strokeWidth={1} />
      <Circle cx={c} cy={c} r={R.hub - 3} fill="none" stroke={C.gold} strokeOpacity={0.4} strokeWidth={0.5} />
    </Svg>
  );
}

export default memo(CompassDialBase);
