import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandHeader } from '@/components/brand-header';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { notifyBankAuthFromWindow } from '@/infrastructure/expo-bank-auth-session';
import { accountErrorKey, bankCallbackConnectionId } from '@/screens/accounts/accounts-view-model';
import { useCompleteBankConnection } from '@/screens/accounts/use-bank-queries';

export function BankCallbackScreen() {
  const { t } = useTranslation();
  const { unlocked, session } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{
    connectionId?: string | string[];
    ref?: string | string[];
  }>();
  const complete = useCompleteBankConnection();
  const [error, setError] = useState<string | null>(null);
  const colors = Colors.light;
  const connectionId =
    bankCallbackConnectionId(params.connectionId) ?? bankCallbackConnectionId(params.ref);
  const handedOff = Platform.OS === 'web' && connectionId != null;
  const displayError = connectionId == null ? t('account.connectBankError') : error;

  const finish = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await complete.mutateAsync(id);
        router.replace('/accounts');
      } catch (cause) {
        setError(t(accountErrorKey(cause, 'connect')));
      }
    },
    [complete, router, t],
  );

  useEffect(() => {
    if (handedOff) {
      notifyBankAuthFromWindow();
      return;
    }
    if (!unlocked || session == null || connectionId == null) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await complete.mutateAsync(connectionId);
        if (!cancelled) {
          router.replace('/accounts');
        }
      } catch (cause) {
        if (!cancelled) {
          setError(t(accountErrorKey(cause, 'connect')));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // complete.mutateAsync is invoked once per unlocked connectionId; mutation identity must not retrigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId, handedOff, session, unlocked]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <BrandHeader title={t('account.connectBankTitle')} />
      <View style={styles.body}>
        {displayError ? (
          <>
            <Text style={[styles.message, { color: colors.danger }]} selectable>
              {displayError}
            </Text>
            {connectionId != null ? (
              <Pressable
                onPress={() => {
                  void finish(connectionId);
                }}
                style={styles.retry}
              >
                <Text style={[styles.retryLabel, { color: colors.action }]}>
                  {t('account.retry')}
                </Text>
              </Pressable>
            ) : null}
          </>
        ) : handedOff ? (
          <Text style={styles.message} selectable>
            {t('account.connectBankPopupDone')}
          </Text>
        ) : (
          <>
            <ActivityIndicator />
            <Text style={styles.message} selectable>
              {t('account.connectBankPending')}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: {
    padding: Spacing.four,
    gap: Spacing.four,
    alignItems: 'center',
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  retry: {
    padding: Spacing.two,
  },
  retryLabel: {
    fontSize: 16,
  },
});
