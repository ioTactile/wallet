import type { RecordKind } from '@wallet/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandHeader } from '@/components/brand-header';
import { Colors, Spacing } from '@/constants/theme';
import { RecordApiError } from '@/domain/ports';
import { useAccountList } from '@/screens/accounts/use-account-queries';
import { recordsListHref } from '@/screens/records/records-navigation';
import {
  appendCalculatorKey,
  calculatorCents,
  calculatorDisplay,
  canSubmitCalculator,
  cashAccounts,
  defaultCategoryId,
} from '@/screens/records/records-view-model';
import { useCreateRecord } from '@/screens/records/use-record-queries';

const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', ',', '0', 'backspace'] as const;

export function NewRecordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors.light;
  const params = useLocalSearchParams<{ kind?: string; categoryId?: string }>();
  const [kind, setKind] = useState<RecordKind>(
    params.kind === 'income' || params.kind === 'transfer' ? params.kind : 'expense',
  );
  const [buffer, setBuffer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const accountsQuery = useAccountList();
  const accounts = accountsQuery.data ?? [];
  const cash = cashAccounts(accounts);
  const defaultAccountId = cash[0]?.id ?? '';
  const defaultFromAccountId = cash[0]?.id ?? accounts[0]?.id ?? '';
  const defaultToAccountId =
    accounts.find((account) => account.id !== defaultFromAccountId && account.archivedAt == null)
      ?.id ?? '';
  const [accountId, setAccountId] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const selectedAccountId = accountId || defaultAccountId;
  const selectedFromAccountId = fromAccountId || defaultFromAccountId;
  const selectedToAccountId = toAccountId || defaultToAccountId;
  const categoryId = params.categoryId ?? defaultCategoryId(kind);
  const create = useCreateRecord();
  const pending = create.isPending;
  const canSubmit = canSubmitCalculator(buffer) && !pending;

  const categoryLabel = useMemo(() => {
    if (kind === 'transfer' || !categoryId) {
      return t('record.category');
    }
    return t(categoryId, { ns: 'category' });
  }, [categoryId, kind, t]);

  async function submit() {
    if (!canSubmit) {
      return;
    }
    const amountCents = calculatorCents(buffer);
    setError(null);
    try {
      if (kind === 'transfer') {
        await create.mutateAsync({
          kind: 'transfer',
          fromAccountId: selectedFromAccountId,
          toAccountId: selectedToAccountId,
          amountCents,
        });
      } else {
        if (!categoryId || !selectedAccountId) {
          return;
        }
        await create.mutateAsync({
          kind,
          accountId: selectedAccountId,
          categoryId,
          amountCents,
        });
      }
      router.dismissTo(recordsListHref());
    } catch (cause) {
      setError(cause instanceof RecordApiError ? t('record.createError') : t('record.createError'));
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.action }]}>
      <BrandHeader
        title={kind === 'transfer' ? t('record.newTransfer') : t('record.new')}
        leftIcon="close"
        rightIcon="checkmark"
        color={colors.action}
        onLeftPress={() => router.dismissTo(recordsListHref())}
        onRightPress={() => {
          void submit();
        }}
      />
      <View style={styles.tabs}>
        {(['income', 'expense', 'transfer'] as const).map((item) => (
          <Pressable
            key={item}
            onPress={() => setKind(item)}
            style={[styles.tab, kind === item && styles.tabActive]}
          >
            <Text style={[styles.tabLabel, kind === item && styles.tabLabelActive]}>
              {t(`record.${item}`).toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.amount}>{calculatorDisplay(buffer).replace(' €', '')} EUR</Text>
      {kind === 'transfer' ? (
        <View style={styles.meta}>
          <Pressable
            onPress={() =>
              cycleAccount(
                accounts.map((account) => account.id),
                selectedFromAccountId,
                setFromAccountId,
              )
            }
          >
            <Text style={styles.metaLabel}>{t('record.fromAccount')}</Text>
            <Text style={styles.metaValue}>
              {accounts.find((account) => account.id === selectedFromAccountId)?.name}
            </Text>
          </Pressable>
          <Pressable
            onPress={() =>
              cycleAccount(
                accounts.map((account) => account.id),
                selectedToAccountId,
                setToAccountId,
              )
            }
          >
            <Text style={styles.metaLabel}>{t('record.toAccount')}</Text>
            <Text style={styles.metaValue}>
              {accounts.find((account) => account.id === selectedToAccountId)?.name}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.meta}>
          <Pressable
            onPress={() =>
              cycleAccount(
                cash.map((account) => account.id),
                selectedAccountId,
                setAccountId,
              )
            }
          >
            <Text style={styles.metaLabel}>{t('record.account')}</Text>
            <Text style={styles.metaValue}>
              {accounts.find((account) => account.id === selectedAccountId)?.name}
            </Text>
          </Pressable>
          <Pressable onPress={() => router.push(`/records/category?kind=${kind}`)}>
            <Text style={styles.metaLabel}>{t('record.category')}</Text>
            <Text style={styles.metaValue}>{categoryLabel}</Text>
          </Pressable>
        </View>
      )}
      {error ? (
        <Text style={styles.error} selectable>
          {error}
        </Text>
      ) : null}
      <View style={[styles.keys, { paddingBottom: insets.bottom + Spacing.two }]}>
        {KEYS.map((key) => (
          <Pressable
            key={key}
            onPress={() => setBuffer((current) => appendCalculatorKey(current, key))}
            style={styles.key}
          >
            <Text style={styles.keyLabel}>{key === 'backspace' ? '←' : key}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function cycleAccount(ids: string[], current: string, set: (id: string) => void) {
  if (ids.length === 0) {
    return;
  }
  const index = ids.indexOf(current);
  set(ids[(index + 1) % ids.length] ?? ids[0]!);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabs: { flexDirection: 'row', paddingHorizontal: Spacing.two, gap: Spacing.one },
  tab: { flex: 1, paddingVertical: Spacing.two, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabLabel: { color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: 12 },
  tabLabelActive: { color: Colors.light.onBrand },
  amount: {
    color: Colors.light.onBrand,
    fontSize: 48,
    fontWeight: '200',
    textAlign: 'right',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    fontVariant: ['tabular-nums'],
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: Spacing.three,
  },
  metaLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'center' },
  metaValue: { color: Colors.light.onBrand, fontWeight: '700', textAlign: 'center' },
  error: { color: Colors.light.onBrand, textAlign: 'center', padding: Spacing.two },
  keys: {
    flex: 1,
    backgroundColor: Colors.light.background,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  key: {
    width: '33.33%',
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyLabel: { fontSize: 28, color: '#374151' },
});
