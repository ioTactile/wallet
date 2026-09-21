import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BrandHeader } from '@/components/brand-header';
import { ConfirmSheet, useConfirmSheet } from '@/components/confirm-sheet';
import { NativeSwitch } from '@/components/native-switch';
import { Colors, Spacing } from '@/constants/theme';
import { formatMoney } from '@/domain/money';
import { RecordApiError } from '@/domain/ports';
import { detailScreenStatus } from '@/screens/accounts/accounts-view-model';
import { useAccountList } from '@/screens/accounts/use-account-queries';
import { useDeleteRecord, useRecord, useUpdateRecord } from '@/screens/records/use-record-queries';

type FormValues = {
  note: string;
  uncleared: boolean;
};

export function RecordDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const recordId = typeof id === 'string' ? id : '';
  const query = useRecord(recordId);
  const accountsQuery = useAccountList();
  const update = useUpdateRecord();
  const remove = useDeleteRecord();
  const [error, setError] = useState<string | null>(null);
  const record = query.data;
  const status = detailScreenStatus({ data: record, error: query.error });
  const colors = Colors.light;
  const { control, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { note: '', uncleared: false },
  });

  useEffect(() => {
    if (record) {
      reset({ note: record.note, uncleared: record.clearing === 'uncleared' });
    }
  }, [record, reset]);

  const confirm = useConfirmSheet({
    copy: () => ({
      title: t('record.deleteConfirmTitle'),
      message: t('record.deleteConfirmMessage'),
      cancelLabel: t('account.cancel'),
      confirmLabel: t('record.delete'),
    }),
    onConfirm: async () => {
      await remove.mutateAsync(recordId);
      router.back();
    },
  });

  async function save(values: FormValues) {
    setError(null);
    try {
      await update.mutateAsync({
        id: recordId,
        body: { note: values.note, clearing: values.uncleared ? 'uncleared' : 'cleared' },
      });
      router.back();
    } catch (cause) {
      setError(cause instanceof RecordApiError ? t('record.saveError') : t('record.saveError'));
    }
  }

  const accountName =
    record == null
      ? ''
      : record.kind === 'transfer'
        ? `${accountsQuery.data?.find((account) => account.id === record.fromAccountId)?.name ?? ''} → ${
            accountsQuery.data?.find((account) => account.id === record.toAccountId)?.name ?? ''
          }`
        : (accountsQuery.data?.find((account) => account.id === record.accountId)?.name ?? '');

  return (
    <View style={[styles.root, { backgroundColor: '#F5F5F5' }]}>
      <BrandHeader
        title={t('record.detailTitle')}
        leftIcon="close"
        rightIcon="checkmark"
        onLeftPress={() => router.back()}
        onRightPress={handleSubmit(save)}
      />
      {status === 'loading' ? (
        <View style={styles.state}>
          <ActivityIndicator />
        </View>
      ) : null}
      {status === 'error' ? (
        <View style={styles.state}>
          <Text style={{ color: colors.danger }} selectable>
            {t('record.error')}
          </Text>
        </View>
      ) : null}
      {status === 'content' && record ? (
        <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.label}>{t(`record.${record.kind}`)}</Text>
            {record.kind !== 'transfer' ? (
              <Text style={styles.value}>{t(record.categoryId, { ns: 'category' })}</Text>
            ) : null}
            <Text style={styles.label}>{t('record.account')}</Text>
            <Text style={styles.value}>{accountName}</Text>
            <Text style={styles.label}>{t('record.amount')}</Text>
            <Text style={styles.value} selectable>
              {formatMoney(record.amountCents)}
            </Text>
            <Text style={styles.label}>{t('record.date')}</Text>
            <Text style={styles.value}>{new Date(record.bookedAt).toLocaleString()}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>{t('record.note')}</Text>
            <Controller
              control={control}
              name="note"
              render={({ field }) => (
                <TextInput value={field.value} onChangeText={field.onChange} style={styles.input} />
              )}
            />
            <View style={styles.switchRow}>
              <Text>{t('record.uncleared')}</Text>
              <Controller
                control={control}
                name="uncleared"
                render={({ field }) => (
                  <NativeSwitch value={field.value} onValueChange={field.onChange} />
                )}
              />
            </View>
          </View>
          {error ? (
            <Text style={[styles.error, { color: colors.danger }]} selectable>
              {error}
            </Text>
          ) : null}
          <Pressable onPress={() => confirm.open(true)} style={styles.delete}>
            <Text style={{ color: colors.danger, fontWeight: '600' }}>{t('record.delete')}</Text>
          </Pressable>
        </ScrollView>
      ) : null}
      <ConfirmSheet {...confirm.props} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  state: { padding: Spacing.five, alignItems: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    padding: Spacing.three,
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
  label: { color: '#9CA3AF', fontSize: 12 },
  value: { fontSize: 16, marginBottom: Spacing.two },
  input: { fontSize: 16, paddingVertical: Spacing.two },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  error: { textAlign: 'center', padding: Spacing.two },
  delete: { alignItems: 'center', padding: Spacing.four },
});
