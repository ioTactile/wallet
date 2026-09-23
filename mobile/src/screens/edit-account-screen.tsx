import { zodResolver } from '@hookform/resolvers/zod';
import { canSyncFromBank, DEFAULT_ACCOUNT_COLOR } from '@wallet/shared';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import type { EventArg, NavigationAction } from 'expo-router/react-navigation';
import { useEffect, useRef, useState } from 'react';
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

import { AccountColorPicker } from '@/components/account-color-picker';
import { BrandHeader } from '@/components/brand-header';
import { ConfirmSheet, useConfirmSheet } from '@/components/confirm-sheet';
import { NativeSwitch } from '@/components/native-switch';
import { Colors, Spacing } from '@/constants/theme';
import {
  accountConfirmCopy,
  accountErrorKey,
  detailScreenStatus,
  editAccountFormSchema,
  lastSyncedLabel,
  toEditAccountFormValues,
  toUpdateAccountBody,
  type AccountConfirmKind,
  type EditAccountFormValues,
} from '@/screens/accounts/accounts-view-model';
import {
  useAccount,
  useArchiveAccount,
  useDeleteAccount,
  useUpdateAccount,
} from '@/screens/accounts/use-account-queries';
import { useDisconnectBankAccount, useSyncBankAccount } from '@/screens/accounts/use-bank-queries';

export function EditAccountScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const accountId = typeof id === 'string' ? id : '';
  const query = useAccount(accountId);
  const update = useUpdateAccount();
  const archive = useArchiveAccount();
  const remove = useDeleteAccount();
  const disconnect = useDisconnectBankAccount();
  const sync = useSyncBankAccount();
  const [error, setError] = useState<string | null>(null);
  const allowLeave = useRef(false);
  const pendingLeave = useRef<NavigationAction | null>(null);
  const colors = Colors.light;
  const account = query.data;
  const status = detailScreenStatus({ data: account, error: query.error });

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<EditAccountFormValues>({
    resolver: zodResolver(editAccountFormSchema),
    defaultValues: {
      name: '',
      color: DEFAULT_ACCOUNT_COLOR,
      excludeFromStats: false,
      minBalance: '',
      maxBalance: '',
      archived: false,
    },
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (account) {
      reset(toEditAccountFormValues(account));
    }
  }, [account, reset]);

  const dirty = Boolean(account) && isDirty;
  const pending =
    isSubmitting ||
    update.isPending ||
    archive.isPending ||
    remove.isPending ||
    disconnect.isPending ||
    sync.isPending;

  const confirmSheet = useConfirmSheet<AccountConfirmKind>({
    copy: (kind) => {
      const keys = accountConfirmCopy(kind);
      return {
        title: t(keys.titleKey),
        message: t(keys.messageKey),
        cancelLabel: t(keys.cancelKey),
        confirmLabel: t(keys.confirmKey),
      };
    },
    onConfirm: async (kind) => {
      if (kind === 'unsaved') {
        const action = pendingLeave.current;
        allowLeave.current = true;
        pendingLeave.current = null;
        if (action) navigation.dispatch(action);
        return;
      }
      if (!account) return;
      setError(null);
      try {
        if (kind === 'disconnect') {
          await disconnect.mutateAsync(account.id);
        } else {
          await remove.mutateAsync(account.id);
        }
        allowLeave.current = true;
        router.replace('/accounts');
      } catch (cause) {
        setError(t(accountErrorKey(cause, kind === 'disconnect' ? 'disconnect' : 'delete')));
      }
    },
  });
  const openSheet = confirmSheet.open;

  useEffect(() => {
    const unsubscribe = navigation.addListener(
      'beforeRemove',
      (event: EventArg<'beforeRemove', true, { action: NavigationAction }>) => {
        if (allowLeave.current || !dirty) {
          return;
        }
        event.preventDefault();
        pendingLeave.current = event.data.action;
        openSheet('unsaved');
      },
    );
    return unsubscribe;
  }, [dirty, navigation, openSheet]);

  function leave() {
    allowLeave.current = true;
    router.back();
  }

  async function onSave(form: EditAccountFormValues) {
    if (pending || !account) return;
    setError(null);
    try {
      await update.mutateAsync({ id: account.id, body: toUpdateAccountBody(form) });
      if (form.archived !== (account.archivedAt !== null)) {
        await archive.mutateAsync({ id: account.id, archived: form.archived });
      }
      leave();
    } catch (cause) {
      const action = form.archived !== (account.archivedAt !== null) ? 'archive' : 'save';
      setError(t(accountErrorKey(cause, action)));
    }
  }

  function openConfirm(kind: Exclude<AccountConfirmKind, 'unsaved'>) {
    if (pending || !account) return;
    confirmSheet.open(kind);
  }

  async function onSync() {
    if (pending || !account) return;
    setError(null);
    try {
      await sync.mutateAsync(account.id);
    } catch (cause) {
      setError(t(accountErrorKey(cause, 'sync')));
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: '#F5F5F5' }]}>
      <BrandHeader
        title={t('account.editTitle')}
        leftIcon="chevronLeft"
        rightIcon="checkmark"
        onLeftPress={() => router.back()}
        onRightPress={
          pending || status !== 'content'
            ? undefined
            : () => {
                void handleSubmit(onSave)();
              }
        }
      />
      {status === 'loading' ? (
        <View style={styles.state}>
          <ActivityIndicator />
          <Text style={styles.stateText}>{t('account.loading')}</Text>
        </View>
      ) : null}
      {status === 'error' ? (
        <View style={styles.state}>
          <Text style={[styles.stateText, { color: colors.danger }]} selectable>
            {t('account.error')}
          </Text>
          <Pressable onPress={() => query.refetch()}>
            <Text style={[styles.retry, { color: colors.action }]}>{t('account.retry')}</Text>
          </Pressable>
        </View>
      ) : null}
      {status === 'content' && account ? (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.body}
        >
          <Text style={styles.label}>{t('account.name')}</Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                editable={!pending}
                style={styles.input}
              />
            )}
          />
          {account.kind === 'bank' ? (
            <>
              <Text style={styles.label}>{t('account.iban')}</Text>
              <Text style={styles.value} selectable>
                {account.iban ?? '—'}
              </Text>
              <Text style={styles.label}>{t('account.institutionName')}</Text>
              <Text style={styles.value} selectable>
                {account.institutionName ?? '—'}
              </Text>
              {lastSyncedLabel(account.lastSyncedAt, i18n.language) ? (
                <>
                  <Text style={styles.label}>{t('account.lastSynced')}</Text>
                  <Text style={styles.value} selectable>
                    {lastSyncedLabel(account.lastSyncedAt, i18n.language)}
                  </Text>
                </>
              ) : null}
            </>
          ) : null}
          <Text style={styles.label}>{t('account.currency')}</Text>
          <Text style={styles.value}>EUR</Text>
          <Text style={styles.label}>{t('account.color')}</Text>
          <Controller
            control={control}
            name="color"
            render={({ field: { onChange, value } }) => (
              <AccountColorPicker value={value} onChange={onChange} disabled={pending} />
            )}
          />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('account.excludeFromStats')}</Text>
            <Controller
              control={control}
              name="excludeFromStats"
              render={({ field: { onChange, value } }) => (
                <NativeSwitch value={value} onValueChange={onChange} disabled={pending} />
              )}
            />
          </View>
          <View style={styles.switchRow}>
            <Controller
              control={control}
              name="archived"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.switchLabel}>
                    {value ? t('account.unarchive') : t('account.archive')}
                  </Text>
                  <NativeSwitch value={value} onValueChange={onChange} disabled={pending} />
                </>
              )}
            />
          </View>
          <Text style={styles.label}>{t('account.minBalance')}</Text>
          <Controller
            control={control}
            name="minBalance"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                keyboardType="decimal-pad"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                editable={!pending}
                style={styles.input}
              />
            )}
          />
          <Text style={styles.label}>{t('account.maxBalance')}</Text>
          <Controller
            control={control}
            name="maxBalance"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                keyboardType="decimal-pad"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                editable={!pending}
                style={styles.input}
              />
            )}
          />
          {error ? (
            <Text style={[styles.error, { color: colors.danger }]} selectable>
              {error}
            </Text>
          ) : null}
          {account.kind === 'bank' &&
          canSyncFromBank(account.kind) &&
          account.archivedAt === null ? (
            <Pressable
              disabled={pending}
              onPress={() => {
                void onSync();
              }}
              style={[styles.sync, { backgroundColor: colors.brand }]}
            >
              <Text style={[styles.destructiveLabel, { color: colors.onBrand }]}>
                {t('account.sync')}
              </Text>
            </Pressable>
          ) : null}
          {account.kind === 'cash' ? (
            <Pressable
              disabled={pending}
              onPress={() => openConfirm('delete')}
              style={[styles.destructive, { borderColor: colors.danger }]}
            >
              <Text style={[styles.destructiveLabel, { color: colors.danger }]}>
                {t('account.delete')}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              disabled={pending}
              onPress={() => openConfirm('disconnect')}
              style={[styles.destructive, { backgroundColor: colors.danger }]}
            >
              <Text style={[styles.destructiveLabel, { color: colors.onBrand }]}>
                {t('account.disconnect')}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      ) : null}
      <ConfirmSheet
        {...confirmSheet.props}
        onDismiss={() => {
          pendingLeave.current = null;
          confirmSheet.close();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: {
    padding: Spacing.four,
    gap: Spacing.two,
    paddingBottom: Spacing.six,
  },
  state: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  stateText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  retry: {
    fontSize: 16,
    fontWeight: '600',
  },
  label: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: Spacing.two,
  },
  input: {
    fontSize: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D1D5DB',
    paddingVertical: Spacing.two,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.two,
    borderRadius: 8,
    borderCurve: 'continuous',
  },
  value: {
    fontSize: 16,
    marginBottom: Spacing.two,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginTop: Spacing.three,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  switchLabel: {
    flex: 1,
    fontSize: 16,
  },
  error: {
    marginTop: Spacing.two,
  },
  destructive: {
    marginTop: Spacing.three,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  sync: {
    marginTop: Spacing.three,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destructiveLabel: {
    fontWeight: '700',
    fontSize: 16,
  },
});
