import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { SymbolView } from 'expo-symbols';

import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { PIN_LENGTH, PinMismatch, WrongPin } from '@/domain/pin';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'] as const;

export function PinScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { pinConfigured, createPin, unlock } = useAuth();
  const [value, setValue] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const colors = Colors.light;

  const title = !pinConfigured
    ? pending
      ? t('pin.confirmTitle')
      : t('pin.createTitle')
    : t('pin.unlockTitle');

  async function submit(next: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!pinConfigured) {
        if (!pending) {
          setPending(next);
          setValue('');
          return;
        }
        await createPin(pending, next);
        return;
      }
      await unlock(next);
    } catch (cause) {
      if (cause instanceof PinMismatch) setError(t('pin.mismatch'));
      else if (cause instanceof WrongPin) setError(t('pin.wrong'));
      else setError(t('signIn.genericError'));
      setPending(null);
      setValue('');
    } finally {
      setBusy(false);
    }
  }

  function onKey(key: (typeof KEYS)[number]) {
    if (busy) return;
    if (key === '') return;
    if (key === 'back') {
      setValue((current) => current.slice(0, -1));
      return;
    }
    const next = `${value}${key}`.slice(0, PIN_LENGTH);
    setValue(next);
    if (next.length === PIN_LENGTH) {
      void submit(next);
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + Spacing.six, paddingBottom: insets.bottom }]}>
      <View style={[styles.lock, { backgroundColor: colors.brand }]}>
        <SymbolView name="lock.fill" tintColor={colors.onBrand} size={28} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.dots}>
        {Array.from({ length: PIN_LENGTH }, (_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              { backgroundColor: index < value.length ? colors.brand : '#D1D5DB' },
            ]}
          />
        ))}
      </View>
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : <View style={styles.errorSlot} />}
      <View style={styles.pad}>
        {KEYS.map((key) => (
          <Pressable key={key || 'empty'} onPress={() => onKey(key)} style={styles.key}>
            {key === 'back' ? (
              <Text style={styles.keyLabel}>{'←'}</Text>
            ) : (
              <Text style={styles.keyLabel}>{key}</Text>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  lock: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: Spacing.four,
    fontSize: 22,
    fontWeight: '600',
  },
  dots: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  error: {
    marginTop: Spacing.three,
    minHeight: 20,
  },
  errorSlot: {
    marginTop: Spacing.three,
    height: 20,
  },
  pad: {
    width: '100%',
    maxWidth: 320,
    marginTop: 'auto',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  key: {
    width: '33%',
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyLabel: {
    fontSize: 28,
    color: '#4B5563',
  },
});
