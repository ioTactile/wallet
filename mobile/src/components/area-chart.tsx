import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { areaChartGeometry } from '@/components/area-chart-path';
import { Colors } from '@/constants/theme';

type Props = {
  values: readonly number[];
  yMin: number;
  yMax: number;
  yLabels: readonly string[];
  xLabels: readonly string[];
  width: number;
  height?: number;
};

const AXIS = 36;
const BOTTOM = 22;
const LINE = Colors.light.action;

export function AreaChart({ values, yMin, yMax, yLabels, xLabels, width, height = 180 }: Props) {
  const plotWidth = Math.max(width - AXIS, 1);
  const plotHeight = height - BOTTOM;
  const geometry = areaChartGeometry(values, yMin, yMax, plotWidth, plotHeight);
  const tickCount = Math.max(yLabels.length - 1, 1);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {yLabels.map((label, index) => {
          const y = (index / tickCount) * plotHeight;
          return (
            <Line
              key={`grid-${index}`}
              x1={AXIS}
              y1={y}
              x2={width}
              y2={y}
              stroke="#E5E7EB"
              strokeDasharray="4 4"
            />
          );
        })}
        <Path d={shift(geometry.area, AXIS, 0)} fill={LINE} opacity={0.18} />
        <Path d={shift(geometry.line, AXIS, 0)} stroke={LINE} strokeWidth={2} fill="none" />
      </Svg>
      {yLabels.map((label, index) => (
        <Text
          key={`y-${index}`}
          style={[styles.yLabel, { top: (index / tickCount) * plotHeight - 8 }]}
        >
          {label}
        </Text>
      ))}
      <View style={styles.xRow}>
        {xLabels.map((label, index) => (
          <Text key={`${label}-${index}`} style={styles.xLabel}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function shift(path: string, dx: number, dy: number): string {
  return path.replace(/([ML]) ([-.\d]+) ([-.\d]+)/g, (_match, command, x, y) => {
    return `${command} ${Number(x) + dx} ${Number(y) + dy}`;
  });
}

const styles = StyleSheet.create({
  yLabel: {
    position: 'absolute',
    left: 0,
    width: AXIS - 4,
    fontSize: 10,
    color: '#9CA3AF',
    fontVariant: ['tabular-nums'],
  },
  xRow: {
    position: 'absolute',
    left: AXIS,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xLabel: {
    fontSize: 10,
    color: '#9CA3AF',
  },
});
