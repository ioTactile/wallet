import type { AspspRef } from '@wallet/shared';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { BrandHeader } from '@/components/brand-header';
import { Colors, Spacing } from '@/constants/theme';
import { parseAspspWidgetMessage } from '@/domain/aspsp-widget-message';
import { BankApiError } from '@/domain/errors';
import { accountErrorKey } from '@/screens/accounts/accounts-view-model';
import { useBankConnectionOptions, useConnectBank } from '@/screens/accounts/use-bank-queries';
import { bankUseCases } from '@/application/use-cases';

export function ConnectBankScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const connect = useConnectBank();
  const [error, setError] = useState<string | null>(null);
  const colors = Colors.light;
  const pending = connect.isPending;

  const optionsQuery = useBankConnectionOptions();

  const onLeave = useCallback(() => {
    bankUseCases.dismissAuth.execute();
    router.back();
  }, [router]);

  const runConnect = useCallback(
    async (aspsp?: AspspRef) => {
      if (pending) return;
      setError(null);
      try {
        await connect.mutateAsync(aspsp);
        router.replace('/accounts');
      } catch (cause) {
        if (cause instanceof BankApiError && cause.code === 'cancelled') {
          return;
        }
        setError(t(accountErrorKey(cause, 'connect')));
      }
    },
    [connect, pending, router, t],
  );

  const onWidgetMessage = useCallback(
    (raw: string) => {
      const message = parseAspspWidgetMessage(raw);
      if (message == null) return;
      if (message.type === 'wallet.aspspCancelled') {
        onLeave();
        return;
      }
      void runConnect({ name: message.name, country: message.country });
    },
    [onLeave, runConnect],
  );

  const selectUrl = optionsQuery.data?.selectUrl ?? null;

  useEffect(() => {
    if (Platform.OS !== 'web' || selectUrl == null) {
      return;
    }
    const onMessage = (event: MessageEvent) => {
      const data = typeof event.data === 'string' ? event.data : JSON.stringify(event.data ?? null);
      onWidgetMessage(data);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onWidgetMessage, selectUrl]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <BrandHeader
        title={t(selectUrl ? 'account.selectBankTitle' : 'account.connectBankTitle')}
        leftIcon="chevronLeft"
        onLeftPress={onLeave}
      />
      {optionsQuery.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : optionsQuery.isError ? (
        <View style={styles.body}>
          <Text style={[styles.error, { color: colors.danger }]} selectable>
            {t('account.connectBankError')}
          </Text>
          <Pressable
            onPress={() => {
              void optionsQuery.refetch();
            }}
            style={[styles.action, { backgroundColor: colors.brand }]}
          >
            <Text style={[styles.actionLabel, { color: colors.onBrand }]}>
              {t('account.retry')}
            </Text>
          </Pressable>
        </View>
      ) : selectUrl ? (
        <SelectBankBody
          selectUrl={selectUrl}
          pending={pending}
          error={error}
          onMessage={onWidgetMessage}
          dangerColor={colors.danger}
        />
      ) : (
        <SandboxConnectBody
          pending={pending}
          error={error}
          onConnect={() => {
            void runConnect();
          }}
          onLeave={onLeave}
          colors={colors}
        />
      )}
    </View>
  );
}

function SelectBankBody(props: {
  selectUrl: string;
  pending: boolean;
  error: string | null;
  onMessage: (raw: string) => void;
  dangerColor: string;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.selectRoot}>
      {props.error ? (
        <Text style={[styles.errorBanner, { color: props.dangerColor }]} selectable>
          {props.error}
        </Text>
      ) : null}
      {props.pending ? (
        <View style={styles.pendingOverlay}>
          <ActivityIndicator color={Colors.light.brand} />
          <Text style={styles.pendingLabel}>{t('account.connectBankPending')}</Text>
        </View>
      ) : null}
      {Platform.OS === 'web' ? (
        <iframe
          title={t('account.selectBankTitle')}
          src={props.selectUrl}
          style={{ flex: 1, width: '100%', height: '100%', border: 'none' }}
        />
      ) : (
        <WebView
          source={{ uri: props.selectUrl }}
          style={styles.webview}
          onMessage={(event) => {
            props.onMessage(event.nativeEvent.data);
          }}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
        />
      )}
    </View>
  );
}

function SandboxConnectBody(props: {
  pending: boolean;
  error: string | null;
  onConnect: () => void;
  onLeave: () => void;
  colors: (typeof Colors)['light'];
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.body}>
      <Text style={styles.message} selectable>
        {t('account.connectBankHint')}
      </Text>
      {props.error ? (
        <Text style={[styles.error, { color: props.colors.danger }]} selectable>
          {props.error}
        </Text>
      ) : null}
      <Pressable
        disabled={props.pending}
        onPress={props.onConnect}
        style={[
          styles.action,
          { backgroundColor: props.colors.brand, opacity: props.pending ? 0.6 : 1 },
        ]}
      >
        {props.pending ? (
          <ActivityIndicator color={props.colors.onBrand} />
        ) : (
          <Text style={[styles.actionLabel, { color: props.colors.onBrand }]}>
            {t('account.connectBank')}
          </Text>
        )}
      </Pressable>
      <Pressable onPress={props.onLeave} style={styles.cancel}>
        <Text style={[styles.cancelLabel, { color: props.colors.action }]}>
          {t('account.cancel')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.three,
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectRoot: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
    color: '#374151',
  },
  error: {
    fontSize: 14,
  },
  errorBanner: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 14,
  },
  pendingOverlay: {
    position: 'absolute',
    zIndex: 2,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    gap: Spacing.two,
  },
  pendingLabel: {
    fontSize: 14,
    color: '#374151',
  },
  action: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancel: {
    alignItems: 'center',
    padding: Spacing.two,
  },
  cancelLabel: {
    fontSize: 16,
  },
});
