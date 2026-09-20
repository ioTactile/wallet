import { Pressable, StyleSheet, View } from 'react-native';
import { ACCOUNT_COLORS } from '@wallet/shared';

import { Spacing } from '@/constants/theme';

type Props = {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
};

export function AccountColorPicker({ value, onChange, disabled }: Props) {
  return (
    <View style={styles.row}>
      {ACCOUNT_COLORS.map((color) => {
        const selected = color.toUpperCase() === value.toUpperCase();
        return (
          <Pressable
            key={color}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled: Boolean(disabled) }}
            disabled={disabled}
            onPress={() => onChange(color)}
            style={[
              styles.swatch,
              { backgroundColor: color, borderWidth: selected ? 3 : 0, borderColor: '#111827' },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});
