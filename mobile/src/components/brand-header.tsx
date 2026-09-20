import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icons, type HeaderLeftIcon, type HeaderRightIcon } from '@/constants/icons';
import { Colors, Spacing } from '@/constants/theme';

type Props = {
  title: string;
  onLeftPress?: () => void;
  leftIcon?: HeaderLeftIcon;
  rightIcon?: HeaderRightIcon;
  onRightPress?: () => void;
};

export function BrandHeader({ title, onLeftPress, leftIcon, rightIcon, onRightPress }: Props) {
  const insets = useSafeAreaInsets();
  const colors = Colors.light;

  return (
    <View
      style={[styles.bar, { paddingTop: insets.top + Spacing.two, backgroundColor: colors.brand }]}
    >
      <View style={styles.leading}>
        <Pressable onPress={onLeftPress} style={styles.iconButton} disabled={!onLeftPress}>
          {leftIcon ? (
            <SymbolView name={Icons[leftIcon]} tintColor={colors.onBrand} size={22} />
          ) : null}
        </Pressable>
        <Text style={[styles.title, { color: colors.onBrand }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <Pressable onPress={onRightPress} style={styles.iconButton} disabled={!onRightPress}>
        {rightIcon ? (
          <SymbolView name={Icons[rightIcon]} tintColor={colors.onBrand} size={22} />
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
    gap: Spacing.two,
  },
  leading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minWidth: 0,
  },
  title: {
    flexShrink: 1,
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
