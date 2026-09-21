import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandHeader } from '@/components/brand-header';
import { Colors, Spacing } from '@/constants/theme';
import { BankApiError } from '@/domain/ports';
import { dismissWebBankAuth } from '@/infrastructure/expo-bank-auth-session';
import { accountErrorKey } from '@/screens/accounts/accounts-view-model';
import { useConnectBank } from '@/screens/accounts/use-account-queries';

export function ConnectBankScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const connect = useConnectBank();
  const [error, setError] = useState<string | null>(null);
  const colors = Colors.light;
  const pending = connect.isPending;

  function onLeave() {
    dismissWebBankAuth();
    router.back();
  }

  async function onConnect() {
    if (pending) return;
    setError(null);
    try {
      await connect.mutateAsync();
      router.replace('/accounts');
    } catch (cause) {
      if (cause instanceof BankApiError && cause.code === 'cancelled') {
        return;
      }
      setError(t(accountErrorKey(cause, 'connect')));
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <BrandHeader
        title={t('account.connectBankTitle')}
        leftIcon="chevronLeft"
        onLeftPress={onLeave}
      />
      <View style={styles.body}>
        <Text style={styles.message} selectable>
          {t('account.connectBankHint')}
        </Text>
        {error ? (
          <Text style={[styles.error, { color: colors.danger }]} selectable>
            {error}
          </Text>
        ) : null}
        <Pressable
          disabled={pending}
          onPress={() => {
            void onConnect();
          }}
          style={[styles.action, { backgroundColor: colors.brand, opacity: pending ? 0.6 : 1 }]}
        >
          {pending ? (
            <ActivityIndicator color={colors.onBrand} />
          ) : (
            <Text style={[styles.actionLabel, { color: colors.onBrand }]}>
              {t('account.connectBank')}
            </Text>
          )}
        </Pressable>
        <Pressable onPress={onLeave} style={styles.cancel}>
          <Text style={[styles.cancelLabel, { color: colors.action }]}>{t('account.cancel')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
  },
  error: {
    fontSize: 15,
  },
  action: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontWeight: '700',
    fontSize: 16,
  },
  cancel: {
    alignItems: 'center',
    padding: Spacing.two,
  },
  cancelLabel: {
    fontSize: 16,
  },
});
