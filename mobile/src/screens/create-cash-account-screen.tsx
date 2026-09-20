import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState } from 'react';

import { AccountColorPicker } from '@/components/account-color-picker';
import { BrandHeader } from '@/components/brand-header';
import { NativeSwitch } from '@/components/native-switch';
import { Colors, Spacing } from '@/constants/theme';
import {
  cashAccountFormSchema,
  defaultCashFormValues,
  toCreateCashBody,
  accountErrorKey,
  type CashAccountFormValues,
} from '@/screens/accounts/accounts-view-model';
import { useCreateCashAccount } from '@/screens/accounts/use-account-queries';

export function CreateCashAccountScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const create = useCreateCashAccount();
  const [error, setError] = useState<string | null>(null);
  const colors = Colors.light;

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<CashAccountFormValues>({
    resolver: zodResolver(cashAccountFormSchema),
    defaultValues: defaultCashFormValues(),
    mode: 'onSubmit',
  });

  const pending = isSubmitting || create.isPending;

  async function onCreate(values: CashAccountFormValues) {
    if (pending) return;
    setError(null);
    try {
      const body = toCreateCashBody(values);
      if (body.kind !== 'cash') return;
      const { kind, ...input } = body;
      void kind;
      await create.mutateAsync(input);
      router.replace('/accounts');
    } catch (cause) {
      setError(t(accountErrorKey(cause, 'create')));
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: '#F5F5F5' }]}>
      <BrandHeader
        title={t('account.createCashTitle')}
        leftIcon="chevronLeft"
        rightIcon="checkmark"
        onLeftPress={() => router.back()}
        onRightPress={
          pending
            ? undefined
            : () => {
                void handleSubmit(onCreate)();
              }
        }
      />
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
        <Pressable
          disabled={pending}
          onPress={() => {
            void handleSubmit(onCreate)();
          }}
          style={[styles.submit, { backgroundColor: colors.brand, opacity: pending ? 0.7 : 1 }]}
        >
          <Text style={[styles.submitLabel, { color: colors.onBrand }]}>{t('account.create')}</Text>
        </Pressable>
      </ScrollView>
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
  submit: {
    marginTop: Spacing.four,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitLabel: {
    fontWeight: '700',
    fontSize: 16,
  },
});
