import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { RecordCategoryMark } from '@/components/record-category-mark';
import { Colors, Spacing } from '@/constants/theme';
import type { DataScreenStatus } from '@/screens/accounts/accounts-view-model';
import { formatRecordDay, type RecordRowVm } from '@/screens/records/records-view-model';

type Props = {
  status: DataScreenStatus;
  rows: RecordRowVm[];
  locale: string;
  onRetry: () => void;
  onShowMore: () => void;
  onRecordPress: (id: string) => void;
};

export function LastRecordsCard({
  status,
  rows,
  locale,
  onRetry,
  onShowMore,
  onRecordPress,
}: Props) {
  const { t } = useTranslation();
  const colors = Colors.light;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('home.lastRecords')}</Text>
      <Text style={styles.period}>{t('home.lastRecordsPeriod').toUpperCase()}</Text>
      {status === 'loading' ? (
        <View style={styles.state}>
          <ActivityIndicator />
          <Text style={styles.stateText}>{t('record.loading')}</Text>
        </View>
      ) : null}
      {status === 'error' ? (
        <View style={styles.state}>
          <Text style={[styles.stateText, { color: colors.danger }]} selectable>
            {t('record.error')}
          </Text>
          <Pressable onPress={onRetry} accessibilityRole="button">
            <Text style={[styles.retry, { color: colors.action }]}>{t('record.retry')}</Text>
          </Pressable>
        </View>
      ) : null}
      {status === 'empty' ? (
        <View style={styles.state}>
          <Text style={styles.stateText}>{t('record.empty')}</Text>
        </View>
      ) : null}
      {status === 'content'
        ? rows.map((row, index) => (
            <Pressable
              key={row.id}
              accessibilityRole="button"
              accessibilityLabel={row.title}
              onPress={() => onRecordPress(row.id)}
              style={[styles.row, index < rows.length - 1 ? styles.rowDivider : null]}
            >
              <RecordCategoryMark color={row.color} confirmed={row.confirmed} />
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {row.title}
                </Text>
                <Text style={styles.rowSubtitle} numberOfLines={1}>
                  {row.subtitle}
                </Text>
                {row.note ? (
                  <Text style={styles.rowNote} numberOfLines={1}>
                    {row.note}
                  </Text>
                ) : null}
              </View>
              <View style={styles.rowAmount}>
                <Text
                  style={[
                    styles.amount,
                    { color: row.amountCents < 0 ? colors.danger : '#2E7D32' },
                  ]}
                  selectable
                >
                  {row.amountLabel}
                </Text>
                {row.uncleared ? (
                  <Text style={styles.badge}>{t('record.uncleared')}</Text>
                ) : (
                  <Text style={styles.date}>{formatRecordDay(row.bookedAt, locale)}</Text>
                )}
              </View>
            </Pressable>
          ))
        : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('record.showMore')}
        onPress={onShowMore}
        style={styles.showMore}
      >
        <Text style={[styles.showMoreLabel, { color: colors.action }]}>{t('record.showMore')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  period: {
    marginTop: Spacing.one,
    marginBottom: Spacing.two,
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.4,
  },
  state: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  stateText: {
    color: '#6B7280',
    textAlign: 'center',
  },
  retry: {
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTitle: {
    fontWeight: '600',
  },
  rowSubtitle: {
    color: '#6B7280',
    fontSize: 13,
  },
  rowNote: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  rowAmount: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amount: {
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  badge: {
    fontSize: 11,
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  showMore: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.two,
  },
  showMoreLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
