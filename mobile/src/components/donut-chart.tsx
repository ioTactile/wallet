import { Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { donutArcs, hitDonutSlice, type DonutSliceInput } from '@/components/donut-arcs';

type Props = {
  slices: readonly DonutSliceInput[];
  selectedId: string | null;
  size: number;
  onSlicePress: (id: string) => void;
};

export function DonutChart({ slices, selectedId, size, onSlicePress }: Props) {
  const arcs = donutArcs(slices, size);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={(event) => {
        const id = hitDonutSlice(
          slices,
          size,
          event.nativeEvent.locationX,
          event.nativeEvent.locationY,
        );
        if (id) {
          onSlicePress(id);
        }
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
  );
}
