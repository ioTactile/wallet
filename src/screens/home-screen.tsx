import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BrandHeader } from '@/components/brand-header';
import { HomeMenuSidebar } from '@/components/home-menu-sidebar';
import { Icons } from '@/constants/icons';
import { Colors, Spacing } from '@/constants/theme';

export function HomeScreen() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const colors = Colors.light;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <BrandHeader
        title={t('home.title')}
        leftIcon="menu"
        rightIcon="bell"
        onLeftPress={() => setMenuOpen(true)}
      />
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.accounts')}</Text>
          <SymbolView name={Icons.chevronRight} size={16} tintColor="#9CA3AF" />
        </View>
        <Pressable style={styles.addCard}>
          <Text style={styles.addLabel}>{t('home.addAccount')}</Text>
          <Text style={styles.addPlus}>+</Text>
        </Pressable>
        <Pressable style={styles.records}>
          <SymbolView name={Icons.list} size={18} tintColor="#111827" />
          <Text style={styles.recordsLabel}>{t('home.records')}</Text>
        </Pressable>
      </View>
      <HomeMenuSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  section: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  addCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  addLabel: {
    color: '#6B7280',
  },
  addPlus: {
    fontSize: 22,
    color: '#9CA3AF',
  },
  records: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  recordsLabel: {
    fontSize: 14,
  },
});
