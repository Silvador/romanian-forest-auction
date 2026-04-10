import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { G, Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { formatCountdown } from '../lib/formatters';

interface Props {
  endTime: number;
  startTime: number;
  size?: number;
  segments?: number;
}

/**
 * Three-phase animated burn ring.
 *
 * Phase 1 — BURN (>33% remaining): green segments, white flash on the
 *   leading segment when it burns (600ms timeout, JS state).
 *
 * Phase 2 — SHIMMER (10–33%): amber segments, a bright shimmer sweeps
 *   clockwise across all lit segments every 3 s. The burn edge breathes
 *   (opacity oscillates 0.5→1 via JS interval at ~33fps).
 *
 * Phase 3 — HEARTBEAT (<10%): red segments, Animated.View scale pulse
 *   1.0→1.05 on a 0.8 s cycle.
 *
 * All Animated values use useNativeDriver:false (web compat).
 * SVG stroke/opacity driven by regular JS state (not Animated.Value)
 * because react-native-svg elements don't accept Animated.Value props.
 */
export function SegmentedBurnRing({
  endTime,
  startTime,
  size = 220,
  segments = 24,
}: Props) {
  const [now, setNow] = useState(Date.now());

  // JS-driven shimmer position (0..segments) updated at ~30 fps
  const [shimmerPos, setShimmerPos] = useState(0);

  // JS-driven burn-edge flash (true = white, false = base color)
  const [burnEdgeFlash, setBurnEdgeFlash] = useState(false);

  // JS-driven breath opacity for shimmer burn edge (0.5..1)
  const [breathOpacity, setBreathOpacity] = useState(1);
  const breathDirRef  = useRef<1 | -1>(-1);
  const breathValRef  = useRef(1);

  // Animated.Value for heartbeat scale — lives on an Animated.View
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // 1-second tick for countdown
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const total          = Math.max(1, endTime - startTime);
  const remaining      = Math.max(0, endTime - now);
  const remainingRatio = remaining / total;

  const litCount  = Math.max(0, Math.min(segments, Math.ceil(remainingRatio * segments)));
  const isExpired = remaining <= 0;

  // Phase detection
  const phase: 'burn' | 'shimmer' | 'heartbeat' | 'expired' =
    isExpired
      ? 'expired'
      : remainingRatio > 0.33
        ? 'burn'
        : remainingRatio > 0.10
          ? 'shimmer'
          : 'heartbeat';

  // ── Haptics on phase transition ───────────────────────────────────────
  const prevPhaseRef = useRef(phase);
  useEffect(() => {
    if (prevPhaseRef.current === phase) return;
    prevPhaseRef.current = phase;
    if (phase === 'shimmer') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (phase === 'heartbeat') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 400);
    }
  }, [phase]);

  // ── Phase 1: burn-edge flash ──────────────────────────────────────────
  const prevLitRef = useRef(litCount);
  useEffect(() => {
    if (phase !== 'burn') {
      setBurnEdgeFlash(false);
      prevLitRef.current = litCount;
      return;
    }
    if (litCount < prevLitRef.current) {
      setBurnEdgeFlash(true);
      const timer = setTimeout(() => setBurnEdgeFlash(false), 600);
      prevLitRef.current = litCount;
      return () => clearTimeout(timer);
    }
    prevLitRef.current = litCount;
  }, [litCount, phase]);

  // ── Phase 2: shimmer sweep + breath ──────────────────────────────────
  useEffect(() => {
    if (phase !== 'shimmer') {
      setShimmerPos(0);
      setBreathOpacity(1);
      breathValRef.current  = 1;
      breathDirRef.current  = -1;
      return;
    }
    // Shimmer: move position every ~125ms for a 3 s full lap
    const shimmerInterval = setInterval(() => {
      setShimmerPos((p) => (p + 1) % segments);
    }, Math.round(3000 / segments));

    // Breath: oscillate opacity 0.5↔1 at ~33fps (600ms per half-cycle)
    const BREATH_STEP = 0.033;
    const breathInterval = setInterval(() => {
      breathValRef.current += breathDirRef.current * BREATH_STEP;
      if (breathValRef.current <= 0.5) {
        breathValRef.current = 0.5;
        breathDirRef.current = 1;
      }
      if (breathValRef.current >= 1) {
        breathValRef.current = 1;
        breathDirRef.current = -1;
      }
      setBreathOpacity(breathValRef.current);
    }, 30);

    return () => {
      clearInterval(shimmerInterval);
      clearInterval(breathInterval);
    };
  }, [phase, segments]);

  // ── Phase 3: heartbeat pulse ──────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'heartbeat') {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 400, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 400, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => { loop.stop(); pulseAnim.setValue(1); };
  }, [phase]);

  // ── Geometry ──────────────────────────────────────────────────────────
  const center = size / 2;
  const outerR = size / 2 - 8;
  const innerR = outerR - 20;

  // Base colors per phase
  const litBase =
    isExpired             ? Colors.textMuted :
    phase === 'burn'      ? Colors.success :
    phase === 'shimmer'   ? '#F59E0B' :   // amber
    /* heartbeat */         Colors.error;

  const dimColor = 'rgba(255,255,255,0.10)';

  // Build segment descriptors
  const segmentData = Array.from({ length: segments }, (_, i) => {
    const angleDeg   = -90 + (360 / segments) * i;
    const rad        = (angleDeg * Math.PI) / 180;
    const x1         = center + Math.cos(rad) * innerR;
    const y1         = center + Math.sin(rad) * innerR;
    const x2         = center + Math.cos(rad) * outerR;
    const y2         = center + Math.sin(rad) * outerR;
    const isLit      = i < litCount;
    const isBurnEdge = i === litCount - 1;

    // Shimmer: circular distance from shimmerPos
    const shimmerDist = isLit
      ? Math.min(
          Math.abs(i - shimmerPos),
          Math.abs(i - shimmerPos + segments),
          Math.abs(i - shimmerPos - segments)
        )
      : 999;

    return { x1, y1, x2, y2, isLit, isBurnEdge, shimmerDist };
  });

  const countdownText = isExpired ? 'Expirat' : formatCountdown(endTime);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Heartbeat: scale entire ring via Animated.View */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          phase === 'heartbeat' && { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <Svg width={size} height={size}>
          <G>
            {segmentData.map((seg, i) => {
              // Unlit segment
              if (!seg.isLit) {
                return (
                  <Line
                    key={i}
                    x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
                    stroke={dimColor}
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                );
              }

              // Determine color + width for lit segments
              let color   = litBase;
              let width   = 4;
              let opacity = 1;

              if (phase === 'shimmer') {
                // Shimmer sweep colors
                if (seg.shimmerDist === 0) {
                  color = '#FFFFFF';    // peak — white flash
                  width = 5;
                } else if (seg.shimmerDist === 1) {
                  color = '#FCD34D';    // bright yellow halo
                  width = 4.5;
                } else if (seg.shimmerDist === 2) {
                  color = '#F59E0B';    // normal amber
                  width = 4;
                }
                // Burn edge breathes
                if (seg.isBurnEdge) {
                  opacity = breathOpacity;
                }
              } else if (phase === 'burn' && seg.isBurnEdge) {
                // Flash white when a segment just burned, then snap back to green
                color = burnEdgeFlash ? '#FFFFFF' : litBase;
                width = burnEdgeFlash ? 5 : 4;
              }

              return (
                <Line
                  key={i}
                  x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
                  stroke={color}
                  strokeWidth={width}
                  strokeLinecap="round"
                  opacity={opacity}
                />
              );
            })}
          </G>
        </Svg>
      </Animated.View>

      {/* Center text */}
      <View style={styles.center}>
        <Text style={[styles.countdown, isExpired && { color: Colors.textMuted }]}>
          {countdownText}
        </Text>
        <Text style={styles.fraction}>
          {litCount} / {segments}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdown: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.03 * 28,
  },
  fraction: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 4,
    letterSpacing: 0.5,
  },
});
