import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  Line,
  LinearGradient,
  Path,
  Pattern,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { archPath, C } from './theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Geometry of the niche inside a region of the given size. */
export function nicheGeometry(width: number, height: number) {
  const margin = 18;
  const x = margin;
  const y = 6;
  const w = width - margin * 2;
  const h = height - y;
  const rise = Math.min(w * 0.52, h * 0.32);
  // Rough arch outline length, padded so the dash always covers the full stroke.
  const curve = Math.hypot(w / 2, rise) * 1.12;
  const length = (2 * (h - rise) + 2 * curve) * 1.08;
  return { x, y, w, h, rise, length };
}

/** Full-screen wall: lapis-black with a faint tiled khatam (8-point star) lattice. */
export function Wall({ width, height }: { width: number; height: number }) {
  const t = 46; // tile
  const m = t / 2;
  const r = t * 0.36;
  const sq = (deg: number) =>
    [0, 90, 180, 270]
      .map((a) => {
        const rad = ((a + deg) * Math.PI) / 180;
        return `${(m + r * Math.sin(rad)).toFixed(2)},${(m - r * Math.cos(rad)).toFixed(2)}`;
      })
      .join(' ');

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.wallHi} />
          <Stop offset="1" stopColor={C.wall} />
        </LinearGradient>
        <RadialGradient id="vignette" cx="50%" cy="45%" r="75%">
          <Stop offset="0.55" stopColor="#000" stopOpacity={0} />
          <Stop offset="1" stopColor="#000" stopOpacity={0.55} />
        </RadialGradient>
        <Pattern id="khatam" patternUnits="userSpaceOnUse" width={t} height={t}>
          <Polygon points={sq(0)} fill="none" stroke={C.gold} strokeOpacity={0.09} strokeWidth={0.8} />
          <Polygon points={sq(45)} fill="none" stroke={C.gold} strokeOpacity={0.09} strokeWidth={0.8} />
          <Line x1={m} y1={0} x2={m} y2={m - r} stroke={C.gold} strokeOpacity={0.07} strokeWidth={0.8} />
          <Line x1={m} y1={t} x2={m} y2={m + r} stroke={C.gold} strokeOpacity={0.07} strokeWidth={0.8} />
          <Line x1={0} y1={m} x2={m - r} y2={m} stroke={C.gold} strokeOpacity={0.07} strokeWidth={0.8} />
          <Line x1={t} y1={m} x2={m + r} y2={m} stroke={C.gold} strokeOpacity={0.07} strokeWidth={0.8} />
        </Pattern>
      </Defs>
      <Rect width={width} height={height} fill="url(#wall)" />
      <Rect width={width} height={height} fill="url(#khatam)" />
      <Rect width={width} height={height} fill="url(#vignette)" />
    </Svg>
  );
}

type NicheProps = {
  width: number;
  height: number;
  /** 0 → 1: the arch draws itself in. */
  draw: Animated.AnimatedInterpolation<number>;
  /** 0 → 1: turquoise "facing the Qibla" glow. */
  glow: Animated.Value;
};

/** The mihrab arch. Its apex is the direction the phone is pointing. */
export function Niche({ width, height, draw, glow }: NicheProps) {
  const g = nicheGeometry(width, height);
  const inset = 9;
  const outer = archPath(g.x, g.y, g.w, g.h, g.rise);
  const outerClosed = archPath(g.x, g.y, g.w, g.h, g.rise, true);
  const inner = archPath(g.x + inset, g.y + inset * 1.6, g.w - inset * 2, g.h - inset * 1.6, g.rise - inset * 0.4);
  const dashOffset = draw.interpolate({ inputRange: [0, 1], outputRange: [g.length, 0] });
  const apexX = g.x + g.w / 2;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="niche" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={C.nicheTop} stopOpacity={0.95} />
            <Stop offset="0.55" stopColor={C.nicheBottom} stopOpacity={0.9} />
            <Stop offset="1" stopColor={C.wall} stopOpacity={0.95} />
          </LinearGradient>
        </Defs>
        <Path d={outerClosed} fill="url(#niche)" />
        <AnimatedPath
          d={outer}
          fill="none"
          stroke={C.gold}
          strokeWidth={1.4}
          strokeDasharray={[g.length, g.length]}
          strokeDashoffset={dashOffset}
        />
        <AnimatedPath
          d={inner}
          fill="none"
          stroke={C.gold}
          strokeOpacity={0.4}
          strokeWidth={0.7}
          strokeDasharray={[g.length, g.length]}
          strokeDashoffset={dashOffset}
        />
        {/* finial above the apex */}
        <Polygon
          points={`${apexX},${g.y - 5} ${apexX + 4},${g.y + 1} ${apexX},${g.y + 7} ${apexX - 4},${g.y + 1}`}
          fill={C.goldBright}
        />
        {/* sill */}
        <Line x1={g.x - 8} y1={height - 1} x2={g.x + g.w + 8} y2={height - 1} stroke={C.gold} strokeWidth={1.2} />
      </Svg>

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: glow }]}>
        <Svg width={width} height={height}>
          <Defs>
            <RadialGradient id="halo" cx="50%" cy="8%" r="80%" fx="50%" fy="4%">
              <Stop offset="0" stopColor={C.turquoise} stopOpacity={0.42} />
              <Stop offset="0.45" stopColor={C.turquoise} stopOpacity={0.12} />
              <Stop offset="1" stopColor={C.turquoise} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Path d={outerClosed} fill="url(#halo)" />
          <Path d={outer} fill="none" stroke={C.turquoise} strokeWidth={1.8} />
          <Path d={inner} fill="none" stroke={C.turquoise} strokeOpacity={0.5} strokeWidth={0.8} />
        </Svg>
      </Animated.View>
    </View>
  );
}
