import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import type { AccountRowVm } from '@/screens/accounts/accounts-view-model';

type AccountCardProps = {
  row: AccountRowVm;
  width: number;
  onPress: () => void;
};

export function AccountCard({ row, width, onPress }: AccountCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={row.name}
      style={[styles.card, { width, backgroundColor: row.color }]}
    >
      <View style={styles.header}>
        <SymbolView
          name={row.kind === 'bank' ? Icons.bank : Icons.cash}
          tintColor={Colors.light.onBrand}
          size={20}
        />
        <Text style={styles.name} numberOfLines={2}>
          {row.name}
        </Text>
      </View>
      <Text style={styles.balance} selectable>
        {row.balanceLabel}
      </Text>
    </Pressable>
  );
}

type AddAccountCardProps = {
  width: number;
  label: string;
  onPress: () => void;
};

export function AddAccountCard({ width, label, onPress }: AddAccountCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.card, styles.addCard, { width }]}
    >
      <Text style={styles.addLabel}>{label}</Text>
      <Text style={styles.addPlus}>+</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 76,
    padding: Spacing.three,
    borderRadius: 16,
    borderCurve: 'continuous',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  name: {
    flex: 1,
    color: Colors.light.onBrand,
    fontSize: 14,
    fontWeight: '600',
  },
  balance: {
    color: Colors.light.onBrand,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  addCard: {
    backgroundColor: Colors.light.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  addLabel: {
    color: '#6B7280',
    fontSize: 14,
  },
  addPlus: {
    fontSize: 22,
    color: '#9CA3AF',
  },
});
