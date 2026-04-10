import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '../constants/colors';
import { formatCountdown } from '../lib/formatters';

interface Props {
  endTime: number;
  startTime: number;
  size?: number;
  strokeWidth?: number;
}

function getTimerColor(progress: number): string {
  if (progress > 0.33) return Colors.success;
  if (progress > 0.10) return Colors.warning;
  return Colors.error;
}

export function CountdownTimer({ endTime, startTime, size = 44, strokeWidth = 3 }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const totalDuration = endTime - startTime;
  const remaining = Math.max(0, endTime - now);
  const progress = totalDuration > 0 ? remaining / totalDuration : 0;
  const isExpired = remaining <= 0;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  const color = isExpired ? Colors.textMuted : getTimerColor(progress);

  const displayText = isExpired ? '--' : formatCountdown(endTime);
  // For the small ring, shorten to just the most significant unit
  const shortText = size <= 44
    ? displayText.split(' ').slice(0, 2).join(' ')
    : displayText;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.border}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress */}
        {!isExpired && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      <View style={styles.textOverlay}>
        <Text
          style={[
            styles.text,
            { color, fontSize: size <= 44 ? 9 : 18 },
          ]}
          numberOfLines={1}
        >
          {shortText}
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
  textOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
