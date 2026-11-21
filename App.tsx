import { Amiri_400Regular, Amiri_700Bold } from '@expo-google-fonts/amiri';
import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import { Marcellus_400Regular } from '@expo-google-fonts/marcellus';
import { useFonts } from 'expo-font';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Bezel from './src/Bezel';
import CompassDial from './src/CompassDial';
import { Niche, nicheGeometry, Wall } from './src/Mihrab';
import { angleDiff, distanceToKaaba, norm360, qiblaBearing } from './src/qibla';
import { C, F } from './src/theme';

const ALIGN_TOLERANCE = 3; // degrees

type Status = 'loading' | 'denied' | 'ready' | 'error';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Marcellus_400Regular,
    Amiri_400Regular,
    Amiri_700Bold,
    DMMono_400Regular,
    DMMono_500Medium,
  });

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {fontsLoaded || fontError ? <QiblaScreen /> : <View style={styles.root} />}
    </SafeAreaProvider>
  );
}

function QiblaScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [status, setStatus] = useState<Status>('loading');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [place, setPlace] = useState<string>('Locating…');
  const [heading, setHeading] = useState<number>(0);
  const [region, setRegion] = useState<{ w: number; h: number } | null>(null);

  // Cumulative rotation so the dial never spins the long way round at 359→0.
  const rotation = useRef(new Animated.Value(0)).current;
  const cumulative = useRef(0);
  const lastHeading = useRef(0);
  const wasAligned = useRef(false);

  // Choreography: one orchestrated entrance, one glow for alignment.
  const intro = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    Animated.timing(intro, {
      toValue: 1,
      duration: 1700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // drives SVG strokeDashoffset
    }).start();
  }, [intro]);

  useEffect(() => {
    let headingSub: Location.LocationSubscription | undefined;
    let cancelled = false;

    (async () => {
      try {
        const { status: perm } = await Location.requestForegroundPermissionsAsync();
        if (perm !== 'granted') {
          setStatus('denied');
          return;
        }

        const pos =
          (await Location.getLastKnownPositionAsync()) ??
          (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
        if (cancelled) return;
        const { latitude: lat, longitude: lon } = pos.coords;
        setCoords({ lat, lon });
        setStatus('ready');

        Location.reverseGeocodeAsync({ latitude: lat, longitude: lon })
          .then(([p]) => {
            if (!cancelled && p) setPlace([p.city ?? p.subregion, p.region].filter(Boolean).join(', '));
          })
          .catch(() => setPlace(`${lat.toFixed(3)}, ${lon.toFixed(3)}`));

        const sub = await Location.watchHeadingAsync((h) => {
          // trueHeading is -1 until the OS has a location fix; fall back to magnetic.
          const raw = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
          const next = norm360(raw);
          cumulative.current += angleDiff(lastHeading.current, next);
          lastHeading.current = next;
          setHeading(next);
          Animated.timing(rotation, {
            toValue: -cumulative.current,
            duration: 120,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }).start();
        });
        if (cancelled) sub.remove();
        else headingSub = sub;
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      headingSub?.remove();
    };
  }, [rotation]);

  const qibla = coords ? qiblaBearing(coords.lat, coords.lon) : null;
  const offset = qibla == null ? null : angleDiff(heading, qibla); // + = turn right
  const aligned = offset != null && Math.abs(offset) <= ALIGN_TOLERANCE;

  useEffect(() => {
    if (aligned && !wasAligned.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    wasAligned.current = aligned;

    glowAnim.current?.stop();
    glowAnim.current = aligned
      ? Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.loop(
            Animated.sequence([
              Animated.timing(glow, { toValue: 0.62, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
              Animated.timing(glow, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ]),
          ),
        ])
      : Animated.timing(glow, { toValue: 0, duration: 300, useNativeDriver: true });
    glowAnim.current.start();
  }, [aligned, glow]);

  const spin = rotation.interpolate({
    inputRange: [-360, 360],
    outputRange: ['-360deg', '360deg'],
    extrapolate: 'extend',
  });

  // Staggered reveal slices of the single intro timeline. Memoized: this
  // component re-renders on every heading tick.
  const anim = useMemo(() => {
    const reveal = (from: number, to: number, rise = 10) => ({
      opacity: intro.interpolate({ inputRange: [from, to], outputRange: [0, 1], extrapolate: 'clamp' }),
      transform: [
        { translateY: intro.interpolate({ inputRange: [from, to], outputRange: [rise, 0], extrapolate: 'clamp' }) },
      ],
    });
    return {
      header: reveal(0, 0.3, -8),
      readout: reveal(0.3, 0.6),
      instruments: reveal(0.6, 0.9, 6),
      footer: reveal(0.7, 1, 8),
      draw: intro.interpolate({ inputRange: [0.05, 0.7], outputRange: [0, 1], extrapolate: 'clamp' }),
      dial: {
        opacity: intro.interpolate({ inputRange: [0.35, 0.8], outputRange: [0, 1], extrapolate: 'clamp' }),
        transform: [{ scale: intro.interpolate({ inputRange: [0.35, 1], outputRange: [0.9, 1], extrapolate: 'clamp' }) }],
      },
    };
  }, [intro]);

  const onRegionLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (!region || region.w !== w || region.h !== h) setRegion({ w, h });
  };

  // Layout inside the niche
  let layout: null | { readoutTop: number; dialTop: number; dialSize: number } = null;
  if (region) {
    const g = nicheGeometry(region.w, region.h);
    const readoutTop = g.y + g.rise * 0.4;
    const readoutH = 100;
    const bottomReserve = 48;
    const avail = region.h - (readoutTop + readoutH) - bottomReserve;
    const dialSize = Math.max(160, Math.min(g.w - 26, avail));
    const dialTop = readoutTop + readoutH + Math.max(0, (avail - dialSize) / 2);
    layout = { readoutTop, dialTop, dialSize };
  }

  const showCompass = status === 'loading' || status === 'ready';
  const turnDeg = offset == null ? 0 : Math.abs(Math.round(offset));
  const label =
    qibla == null ? 'LOCATING' : aligned ? 'FACING THE QIBLA' : offset! > 0 ? 'TURN RIGHT  ›' : '‹  TURN LEFT';
  const a11y =
    qibla == null
      ? 'Finding your location'
      : aligned
        ? 'You are facing the Qibla'
        : `Turn ${turnDeg} degrees ${offset! > 0 ? 'right' : 'left'}`;

  return (
    <View style={styles.root}>
      <Wall width={width} height={height} />

      <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Animated.View style={[styles.header, anim.header]}>
          <Text style={styles.wordmark}>SAMT</Text>
          <View style={styles.headerRule} />
          <Text style={styles.wordmarkAr}>سمت</Text>
        </Animated.View>

        <View style={styles.region} onLayout={onRegionLayout}>
          {region && layout && (
            <>
              <Niche width={region.w} height={region.h} draw={anim.draw} glow={glow} />

              {showCompass ? (
                <>
                  <Animated.View
                    style={[styles.readout, { top: layout.readoutTop }, anim.readout]}
                    accessible
                    accessibilityRole="header"
                    accessibilityLabel={a11y}
                  >
                    <Text style={[styles.label, aligned && { color: C.turquoise }]}>{label}</Text>
                    {aligned ? (
                      <Text style={[styles.heroArabic]}>القبلة</Text>
                    ) : (
                      <Text style={styles.hero}>{qibla == null ? '—' : `${turnDeg}°`}</Text>
                    )}
                  </Animated.View>

                  <Animated.View
                    style={[
                      styles.dialWrap,
                      { top: layout.dialTop, width: layout.dialSize, height: layout.dialSize, marginLeft: -layout.dialSize / 2 },
                      anim.dial,
                    ]}
                  >
                    <Animated.View style={{ transform: [{ rotate: spin }] }}>
                      <CompassDial size={layout.dialSize} qibla={qibla} aligned={aligned} />
                    </Animated.View>
                    <Bezel size={layout.dialSize} offset={offset} aligned={aligned} />
                    <View pointerEvents="none" style={styles.medallion}>
                      <Text
                        style={[
                          styles.allah,
                          { fontSize: layout.dialSize * 0.072, lineHeight: layout.dialSize * 0.13 },
                          aligned && { color: C.turquoise },
                        ]}
                      >
                        الله
                      </Text>
                    </View>
                  </Animated.View>

                  <Animated.View style={[styles.instruments, anim.instruments]}>
                    <Text style={styles.inst}>
                      <Text style={styles.instKey}>HDG </Text>
                      {String(Math.round(heading) % 360).padStart(3, '0')}°
                    </Text>
                    <Text style={styles.inst}>
                      <Text style={styles.instKey}>QIBLA </Text>
                      {qibla == null ? '———' : `${qibla.toFixed(1).padStart(5, '0')}°`}
                    </Text>
                  </Animated.View>
                </>
              ) : (
                <Animated.View style={[styles.message, { top: layout.readoutTop }, anim.readout]}>
                  <Text style={styles.messageAr}>سمت</Text>
                  <Text style={styles.messageText}>
                    {status === 'denied'
                      ? 'Samt needs your location to calculate the direction of the Qibla.'
                      : "Couldn't read location or compass on this device."}
                  </Text>
                  {status === 'denied' && (
                    <Pressable
                      onPress={() => Linking.openSettings()}
                      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                      accessibilityRole="button"
                    >
                      <Text style={styles.buttonText}>OPEN SETTINGS</Text>
                    </Pressable>
                  )}
                </Animated.View>
              )}
            </>
          )}
        </View>

        <Animated.View style={[styles.footer, anim.footer]}>
          {showCompass && (
            <>
              <Text style={styles.place} numberOfLines={1}>
                {place}
              </Text>
              {coords && (
                <Text style={styles.meta}>
                  {Math.round(distanceToKaaba(coords.lat, coords.lon)).toLocaleString()} KM TO MAKKAH
                </Text>
              )}
              <Text style={styles.calib}>HOLD FLAT · AWAY FROM METAL · FIGURE-8 TO CALIBRATE</Text>
            </>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.wall },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 26,
    paddingTop: 10,
    paddingBottom: 12,
  },
  wordmark: { fontFamily: F.display, color: C.bone, fontSize: 15, letterSpacing: 8 },
  headerRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: C.goldDim, marginHorizontal: 14 },
  wordmarkAr: { fontFamily: F.arabic, color: C.gold, fontSize: 22, lineHeight: 34 },

  region: { flex: 1 },

  readout: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  label: { fontFamily: F.monoMedium, color: C.gold, fontSize: 11, letterSpacing: 2.6 },
  hero: {
    fontFamily: F.display,
    color: C.bone,
    fontSize: 68,
    lineHeight: 82,
    marginTop: 2,
    includeFontPadding: false,
  },
  heroArabic: {
    fontFamily: F.arabicBold,
    color: C.turquoise,
    fontSize: 48,
    lineHeight: 82,
    marginTop: 2,
  },

  dialWrap: { position: 'absolute', left: '50%' },
  medallion: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  allah: { fontFamily: F.arabicBold, color: C.goldBright, textAlign: 'center' },

  instruments: {
    position: 'absolute',
    left: 44,
    right: 44,
    bottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inst: { fontFamily: F.mono, color: C.bone, fontSize: 11, letterSpacing: 1.4 },
  instKey: { color: C.ash },

  footer: { alignItems: 'center', paddingHorizontal: 28, paddingTop: 16, paddingBottom: 14, minHeight: 92 },
  place: { fontFamily: F.display, color: C.bone, fontSize: 21, letterSpacing: 0.5 },
  meta: { fontFamily: F.mono, color: C.gold, fontSize: 11, letterSpacing: 2, marginTop: 6 },
  calib: { fontFamily: F.mono, color: C.ash, fontSize: 9, letterSpacing: 1.2, marginTop: 10, textAlign: 'center' },

  message: { position: 'absolute', left: 48, right: 48, alignItems: 'center' },
  messageAr: { fontFamily: F.arabicBold, color: C.gold, fontSize: 44, lineHeight: 80 },
  messageText: { fontFamily: F.display, color: C.bone, fontSize: 18, lineHeight: 27, textAlign: 'center', marginTop: 8 },
  button: {
    marginTop: 28,
    borderWidth: 1,
    borderColor: C.gold,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  buttonPressed: { backgroundColor: 'rgba(198,161,90,0.14)' },
  buttonText: { fontFamily: F.monoMedium, color: C.goldBright, fontSize: 12, letterSpacing: 2.4 },
});
