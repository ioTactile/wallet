import { SymbolView } from 'expo-symbols';
import { useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Swipeable, {
  SwipeDirection,
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';

import { Icons } from '@/constants/icons';
import { Colors } from '@/constants/theme';

type Props = {
  enabled: boolean;
  confirmed: boolean;
  busy: boolean;
  confirmLabel: string;
  unconfirmLabel: string;
  onPress: () => void;
  onToggle: () => void;
  children: ReactNode;
};

export function RecordSwipeRow({
  enabled,
  confirmed,
  busy,
  confirmLabel,
  unconfirmLabel,
  onPress,
  onToggle,
  children,
}: Props) {
  const swipeRef = useRef<SwipeableMethods>(null);
  const swipeActive = useRef(false);

  const label = confirmed ? unconfirmLabel : confirmLabel;
  const actionColor = confirmed ? '#9CA3AF' : Colors.light.brand;

  const row = (
    <Pressable
      onPress={() => {
        if (swipeActive.current) {
          return;
        }
        onPress();
      }}
    >
      {children}
    </Pressable>
  );

  if (!enabled) {
    return row;
  }

  return (
    <Swipeable
      ref={swipeRef}
      overshootLeft={false}
      friction={2}
      leftThreshold={48}
      onSwipeableOpenStartDrag={() => {
        swipeActive.current = true;
      }}
      onSwipeableOpen={(direction) => {
        swipeActive.current = true;
        if (direction === SwipeDirection.RIGHT && !busy) {
          onToggle();
        }
        swipeRef.current?.close();
      }}
      onSwipeableClose={() => {
        // Swallow the press that RN often fires after a swipe release.
        setTimeout(() => {
          swipeActive.current = false;
        }, 80);
      }}
      renderLeftActions={() => (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.action, { backgroundColor: actionColor }]}
        >
          <SymbolView
            name={confirmed ? Icons.close : Icons.checkmark}
            tintColor={Colors.light.onBrand}
            size={18}
          />
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
    >
      {row}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  action: {
    width: 96,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: {
    color: Colors.light.onBrand,
    fontSize: 12,
    fontWeight: '600',
  },
});
