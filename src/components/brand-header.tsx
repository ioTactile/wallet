import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';

type Props = {
  title: string;
  onLeftPress?: () => void;
  leftIcon?: 'line.3.horizontal' | 'chevron.left';
  rightIcon?: 'bell' | 'checkmark';
  onRightPress?: () => void;
};

export function BrandHeader({ title, onLeftPress, leftIcon, rightIcon, onRightPress }: Props) {
  const insets = useSafeAreaInsets();
  const colors = Colors.light;

  return (
    <View style={[styles.bar, { paddingTop: insets.top + Spacing.two, backgroundColor: colors.brand }]}>
      <Pressable onPress={onLeftPress} style={styles.iconButton} disabled={!onLeftPress}>
        {leftIcon ? (
          <SymbolView name={leftIcon} tintColor={colors.onBrand} size={22} />
        ) : (
          <View style={styles.iconButton} />
        )}
      </Pressable>
      <Text style={[styles.title, { color: colors.onBrand }]}>{title}</Text>
      <Pressable onPress={onRightPress} style={styles.iconButton} disabled={!onRightPress}>
        {rightIcon ? (
          <SymbolView name={rightIcon} tintColor={colors.onBrand} size={22} />
        ) : (
          <View style={styles.iconButton} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
