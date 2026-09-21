import { Host, List, ListItem } from '@expo/ui';
import {
  categoriesFor,
  getCategory,
  listChildren,
  listRoots,
  type RecordKind,
} from '@wallet/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandHeader } from '@/components/brand-header';
import { Colors, Spacing } from '@/constants/theme';

export function CategoryPickerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { kind: kindParam } = useLocalSearchParams<{ kind?: string }>();
  const kind: RecordKind = kindParam === 'income' ? 'income' : 'expense';
  const allowed = new Set(categoriesFor(kind).map((category) => category.id));
  const roots = listRoots().filter((category) => allowed.has(category.id));
  const colors = Colors.light;

  function select(id: string) {
    router.navigate({ pathname: '/records/new', params: { kind, categoryId: id } });
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <BrandHeader
        title={t('record.category')}
        leftIcon="chevronLeft"
        onLeftPress={() => router.back()}
      />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.body}>
        <Text style={styles.section}>{t('record.allCategories')}</Text>
        <Host matchContents>
          <List>
            {roots.map((root) => (
              <View key={root.id}>
                <ListItem
                  onPress={() => select(root.id)}
                  leading={<View style={[styles.dot, { backgroundColor: root.color }]} />}
                >
                  {t(root.id, { ns: 'category' })}
                </ListItem>
                {listChildren(root.id)
                  .filter((child) => allowed.has(child.id))
                  .map((child) => (
                    <ListItem
                      key={child.id}
                      onPress={() => select(child.id)}
                      leading={
                        <View
                          style={[styles.dot, { backgroundColor: getCategory(child.id)?.color }]}
                        />
                      }
                    >
                      {t(child.id, { ns: 'category' })}
                    </ListItem>
                  ))}
              </View>
            ))}
          </List>
        </Host>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  section: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginTop: Spacing.two },
  dot: { width: 36, height: 36, borderRadius: 18 },
});
