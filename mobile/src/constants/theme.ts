/**
 * Theme tokens for the app. Prefer this over a second styling system.
 */

export const Colors = {
  light: {
    text: '#000000', // black
    background: '#ffffff', // white
    brand: '#00C853', // green
    action: '#3B82F6', // blue
    danger: '#FF5A6A', // red
    onBrand: '#FFFFFF', // white
  },
  dark: {
    text: '#ffffff', // white
    background: '#000000', // black
    brand: '#00C853', // green
    action: '#3B82F6', // blue
    danger: '#FF5A6A', // red
    onBrand: '#FFFFFF', // white
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
