// ROForest Design System — Typography
// Fonts: Space Grotesk (headings) + Plus Jakarta Sans (body)

import { TextStyle } from 'react-native';

export const FontFamily = {
  heading: 'SpaceGrotesk-Bold',
  body: 'PlusJakartaSans-Regular',
  bodyMedium: 'PlusJakartaSans-Medium',
  bodySemiBold: 'PlusJakartaSans-SemiBold',
  bodyBold: 'PlusJakartaSans-Bold',
} as const;

// Type scale matching mobile-design-system.md
export const Typography: Record<string, TextStyle> = {
  display: {
    fontFamily: FontFamily.heading,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 32 * 1.05,
    letterSpacing: -0.05 * 32,
  },
  h1: {
    fontFamily: FontFamily.heading,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 24 * 1.05,
    letterSpacing: -0.05 * 24,
  },
  h2: {
    fontFamily: FontFamily.heading,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 20 * 1.1,
    letterSpacing: -0.04 * 20,
  },
  h3: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 17 * 1.2,
    letterSpacing: -0.02 * 17,
  },
  body: {
    fontFamily: FontFamily.body,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 15 * 1.5,
    letterSpacing: 0,
  },
  bodySmall: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 13 * 1.4,
    letterSpacing: 0,
  },
  label: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 13 * 1.3,
    letterSpacing: 0.02 * 13,
  },
  caption: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 11 * 1.3,
    letterSpacing: 0.01 * 11,
  },
  overline: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 11 * 1.2,
    letterSpacing: 0.14 * 11,
    textTransform: 'uppercase',
  },
  stat: {
    fontFamily: FontFamily.heading,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 28 * 1.1,
    letterSpacing: -0.05 * 28,
  },
  price: {
    fontFamily: FontFamily.heading,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 22 * 1.1,
    letterSpacing: -0.03 * 22,
  },
};
