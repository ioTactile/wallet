import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import type { AccountRowVm } from '@/screens/accounts/accounts-view-model';

type Props = {
  row: AccountRowVm;
  onPress: () => void;
  archivedLabel?: string;
};

export function AccountRow({ row, onPress, archivedLabel }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={row.name}
      style={styles.row}
    >
      <View style={[styles.swatch, { backgroundColor: row.color }]} />
      <View style={styles.meta}>
        <Text style={styles.name} numberOfLines={1}>
          {row.name}
        </Text>
        {row.subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {row.subtitle}
          </Text>
        ) : null}
        {row.archived && archivedLabel ? (
          <Text style={styles.archived}>{archivedLabel}</Text>
        ) : null}
      </View>
      <Text style={styles.balance} selectable>
        {row.balanceLabel}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  meta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  archived: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  balance: {
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
});
