import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
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
import { recordsListHref } from '@/screens/records/records-navigation';
import {
  applyRecordEditParams,
  canSubmitRecordEdit,
  draftForKind,
  recordSourceAccountId,
  recordUpdateBody,
  toRecordEditDraft,
  type RecordEditDraft,
} from '@/screens/records/records-view-model';
import { useDeleteRecord, useRecord, useUpdateRecord } from '@/screens/records/use-record-queries';

type FormValues = {
  note: string;
  uncleared: boolean;
};

export function RecordDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    id,
    categoryId: categoryParam,
    toAccountId: toAccountParam,
    fromAccountId: fromAccountParam,
    kind: kindParam,
  } = useLocalSearchParams<{
    id: string;
    categoryId?: string;
    toAccountId?: string;
    fromAccountId?: string;
    kind?: string;
  }>();
  const recordId = typeof id === 'string' ? id : '';
  const query = useRecord(recordId);
  const accountsQuery = useAccountList();
  const update = useUpdateRecord();
  const remove = useDeleteRecord();
  const [error, setError] = useState<string | null>(null);
  const record = query.data;
  const status = detailScreenStatus({ data: record, error: query.error });
  const colors = Colors.light;
  const { control, reset, getValues } = useForm<FormValues>({
    defaultValues: { note: '', uncleared: false },
  });
  const [draft, setDraft] = useState<RecordEditDraft | null>(null);
  const [seenRecordId, setSeenRecordId] = useState<string | null>(null);
  const [seenParamKey, setSeenParamKey] = useState('');
  const paramKey = `${kindParam ?? ''}|${categoryParam ?? ''}|${toAccountParam ?? ''}|${fromAccountParam ?? ''}`;

  if (record && seenRecordId !== record.id) {
    setSeenRecordId(record.id);
    setSeenParamKey(paramKey);
    setDraft(
      applyRecordEditParams(toRecordEditDraft(record), {
        kind: kindParam,
        categoryId: categoryParam,
        toAccountId: toAccountParam,
        fromAccountId: fromAccountParam,
      }),
    );
    reset({ note: record.note, uncleared: record.clearing === 'uncleared' });
  } else if (record && draft && paramKey !== seenParamKey) {
    setSeenParamKey(paramKey);
    setDraft(
      applyRecordEditParams(draft, {
        kind: kindParam,
        categoryId: categoryParam,
        toAccountId: toAccountParam,
        fromAccountId: fromAccountParam,
      }),
    );
  }

  const confirm = useConfirmSheet({
    copy: () => ({
      title: t('record.deleteConfirmTitle'),
      message: t('record.deleteConfirmMessage'),
      cancelLabel: t('account.cancel'),
      confirmLabel: t('record.delete'),
    }),
    onConfirm: async () => {
      await remove.mutateAsync(recordId);
      router.dismissTo(recordsListHref());
    },
  });

  const canSave =
    record != null && draft != null && canSubmitRecordEdit(record, draft) && !update.isPending;

  async function save() {
    if (!record || !draft || !canSave) {
      return;
    }
    const values = getValues();
    const body = recordUpdateBody(record, {
      ...draft,
      note: values.note,
      uncleared: values.uncleared,
    });
    if (body == null) {
      router.dismissTo(recordsListHref());
      return;
    }
    setError(null);
    try {
      await update.mutateAsync({ id: recordId, body });
      router.dismissTo(recordsListHref());
    } catch (cause) {
      setError(cause instanceof RecordApiError ? t('record.saveError') : t('record.saveError'));
    }
  }

  const accounts = accountsQuery.data ?? [];
  const sourceAccountId = record ? recordSourceAccountId(record) : '';
  const pickingFrom = record?.kind === 'income' && draft?.kind === 'transfer';
  const sourceName = accounts.find((account) => account.id === sourceAccountId)?.name ?? '';
  const otherName =
    accounts.find((account) => account.id === draft?.otherAccountId)?.name ??
    t('record.selectAccount');
  const lockedTransferName = pickingFrom
    ? (accounts.find((account) => account.id === record?.accountId)?.name ?? '')
    : sourceName;

  return (
    <View style={[styles.root, { backgroundColor: '#F5F5F5' }]}>
      <BrandHeader
        title={t('record.detailTitle')}
        leftIcon="close"
        rightIcon="checkmark"
        onLeftPress={() => router.dismissTo(recordsListHref())}
        onRightPress={
          canSave
            ? () => {
                void save();
              }
            : undefined
        }
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
      {status === 'content' && record && draft ? (
        <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.tabs}>
              {(['expense', 'income', 'transfer'] as const).map((item) => (
                <Pressable
                  key={item}
                  onPress={() =>
                    setDraft((current) => (current ? draftForKind(current, item) : current))
                  }
                  style={[styles.tab, draft.kind === item && styles.tabActive]}
                >
                  <Text style={[styles.tabLabel, draft.kind === item && styles.tabLabelActive]}>
                    {t(`record.${item}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
            {draft.kind === 'transfer' ? (
              <>
                <Text style={styles.label}>{t('record.fromAccount')}</Text>
                {pickingFrom ? (
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/records/select-account',
                        params: {
                          recordId,
                          excludeAccountId: record.accountId,
                          selectedId: draft.otherAccountId ?? '',
                          field: 'fromAccountId',
                        },
                      })
                    }
                  >
                    <Text style={styles.value}>{otherName}</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.value}>{lockedTransferName}</Text>
                )}
                <Text style={styles.label}>{t('record.toAccount')}</Text>
                {pickingFrom ? (
                  <Text style={styles.value}>{lockedTransferName}</Text>
                ) : (
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/records/select-account',
                        params: {
                          recordId,
                          excludeAccountId: sourceAccountId,
                          selectedId: draft.otherAccountId ?? '',
                          field: 'toAccountId',
                        },
                      })
                    }
                  >
                    <Text style={styles.value}>{otherName}</Text>
                  </Pressable>
                )}
              </>
            ) : (
              <>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/records/category',
                      params: { kind: draft.kind, recordId },
                    })
                  }
                >
                  <Text style={styles.label}>{t('record.category')}</Text>
                  <Text style={styles.value}>
                    {draft.categoryId
                      ? t(draft.categoryId, { ns: 'category' })
                      : t('record.category')}
                  </Text>
                </Pressable>
                <Text style={styles.label}>{t('record.account')}</Text>
                <Text style={styles.value}>{sourceName}</Text>
              </>
            )}
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    padding: 4,
    marginBottom: Spacing.two,
  },
  tab: { flex: 1, paddingVertical: Spacing.two, alignItems: 'center', borderRadius: 999 },
  tabActive: { backgroundColor: Colors.light.action },
  tabLabel: { color: '#6B7280', fontWeight: '700', fontSize: 13 },
  tabLabelActive: { color: Colors.light.onBrand },
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
