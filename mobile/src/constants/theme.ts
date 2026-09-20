/**
 * Theme tokens for the app. Prefer this over a second styling system.
 */

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    brand: '#00C853',
    action: '#3B82F6',
    danger: '#FF5A6A',
    onBrand: '#FFFFFF',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    brand: '#00C853',
    action: '#3B82F6',
    danger: '#FF5A6A',
    onBrand: '#FFFFFF',
  },
} as const;

export const Spacing = {
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;
