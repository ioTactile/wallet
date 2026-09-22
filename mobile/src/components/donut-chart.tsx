import { useRef } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import {
  donutArcs,
  hitDonutSlice,
  localPointInDonut,
  type DonutSliceInput,
} from '@/components/donut-arcs';

type Props = {
  slices: readonly DonutSliceInput[];
  selectedId: string | null;
  size: number;
  onSlicePress: (id: string) => void;
};

export function DonutChart({ slices, selectedId, size, onSlicePress }: Props) {
  const boxRef = useRef<View>(null);
  const arcs = donutArcs(slices, size);

  return (
    <View ref={boxRef} collapsable={false} style={[styles.box, { width: size, height: size }]}>
      <Pressable
        accessibilityRole="button"
        style={{ width: size, height: size }}
        onPress={(event) => {
          const { locationX, locationY } = event.nativeEvent;
          const native = event.nativeEvent as typeof event.nativeEvent & {
            clientX?: number;
            clientY?: number;
          };

          const selectAt = (x: number, y: number) => {
            const id = hitDonutSlice(slices, size, x, y);
            if (id) {
              onSlicePress(id);
            }
          };

          if (Platform.OS === 'web' && boxRef.current != null) {
            boxRef.current.measureInWindow((left, top) => {
              const point = localPointInDonut({
                locationX,
                locationY,
                clientX: native.clientX,
                clientY: native.clientY,
                boxClientLeft: left,
                boxClientTop: top,
              });
              selectAt(point.x, point.y);
            });
            return;
          }

          selectAt(locationX, locationY);
        }}
      >
        <Svg width={size} height={size} pointerEvents="none">
          {arcs.map((arc) => (
            <Path
              key={arc.id}
              d={arc.d}
              fill={arc.color}
              opacity={selectedId == null || selectedId === arc.id ? 1 : 0.45}
            />
          ))}
        </Svg>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignSelf: 'center',
  },
});
