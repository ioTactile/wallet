import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icons } from '@/constants/icons';
import { Colors, Spacing } from '@/constants/theme';
import {
  EXPENSE_STRUCTURE_FILTERS,
  EXPENSE_STRUCTURE_PERIODS,
  type ExpenseStructureFilter,
  type ExpenseStructurePeriod,
} from '@/screens/home/expenses-structure-view-model';

type Props = {
  visible: boolean;
  period: ExpenseStructurePeriod;
  filter: ExpenseStructureFilter;
  onDismiss: () => void;
  onSave: (next: { period: ExpenseStructurePeriod; filter: ExpenseStructureFilter }) => void;
};

export function HomeCardConfigModal({ visible, period, filter, onDismiss, onSave }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      {visible ? (
        <ConfigFields
          key={`${period}:${filter}`}
          period={period}
          filter={filter}
          onDismiss={onDismiss}
          onSave={onSave}
        />
      ) : null}
    </Modal>
  );
}

function ConfigFields({ period, filter, onDismiss, onSave }: Omit<Props, 'visible'>) {
  const { t } = useTranslation();
  const colors = Colors.light;
  const [draftPeriod, setDraftPeriod] = useState(period);
  const [draftFilter, setDraftFilter] = useState(filter);
  const [openMenu, setOpenMenu] = useState<'period' | 'filter' | null>(null);

  return (
    <View style={styles.modalBackdrop}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('account.cancel')}
        style={StyleSheet.absoluteFill}
        onPress={onDismiss}
      />
      <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>{t('home.cardConfiguration')}</Text>
        <Text style={styles.fieldLabel}>{t('home.selectPeriod')}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setOpenMenu((current) => (current === 'period' ? null : 'period'))}
          style={styles.field}
        >
          <Text style={styles.fieldValue}>{t(`record.period.${draftPeriod}`)}</Text>
          <SymbolView name={Icons.chevronRight} size={16} tintColor="#9CA3AF" />
        </Pressable>
        {openMenu === 'period' ? (
          <ScrollView
            style={styles.dropdown}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {EXPENSE_STRUCTURE_PERIODS.map((item) => (
              <Pressable
                key={item}
                onPress={() => {
                  setDraftPeriod(item);
                  setOpenMenu(null);
                }}
                style={styles.dropdownItem}
              >
                <Text>{t(`record.period.${item}`)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        <Text style={styles.fieldLabel}>{t('home.filter')}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setOpenMenu((current) => (current === 'filter' ? null : 'filter'))}
          style={styles.field}
        >
          <Text style={styles.fieldValue}>{t(`home.filter.${draftFilter}`)}</Text>
          <SymbolView name={Icons.chevronRight} size={16} tintColor="#9CA3AF" />
        </Pressable>
        {openMenu === 'filter' ? (
          <View style={styles.dropdown}>
            {EXPENSE_STRUCTURE_FILTERS.map((item) => (
              <Pressable
                key={item}
                onPress={() => {
                  setDraftFilter(item);
                  setOpenMenu(null);
                }}
                style={styles.dropdownItem}
              >
                <Text>{t(`home.filter.${item}`)}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <View style={styles.modalActions}>
          <Pressable accessibilityRole="button" onPress={onDismiss} style={styles.modalAction}>
            <Text style={[styles.modalActionLabel, { color: colors.action }]}>
              {t('account.cancel')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => onSave({ period: draftPeriod, filter: draftFilter })}
            style={styles.modalAction}
          >
            <Text style={[styles.modalActionLabel, { color: colors.action }]}>
              {t('account.save')}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderCurve: 'continuous',
    padding: Spacing.four,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: Spacing.three,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: Spacing.one,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    paddingVertical: Spacing.two,
    marginBottom: Spacing.three,
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  dropdown: {
    marginTop: -Spacing.two,
    marginBottom: Spacing.three,
    maxHeight: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderCurve: 'continuous',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.four,
    marginTop: Spacing.two,
  },
  modalAction: {
    paddingVertical: Spacing.two,
  },
  modalActionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
