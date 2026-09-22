import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Icons } from '@/constants/icons';
import { Colors } from '@/constants/theme';

type Props = {
  color: string;
  confirmed: boolean;
};

export function RecordCategoryMark({ color, confirmed }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      {confirmed ? (
        <View style={styles.badge}>
          <SymbolView name={Icons.checkmark} tintColor={Colors.light.onBrand} size={10} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 36, height: 36 },
  swatch: { width: 36, height: 36, borderRadius: 18 },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.brand,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
});
