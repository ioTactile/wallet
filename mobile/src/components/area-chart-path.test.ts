import { describe, expect, it } from '@jest/globals';

import { areaChartGeometry } from '@/components/area-chart-path';

describe('areaChartGeometry', () => {
  it('maps values onto the plot and closes the area on the baseline', () => {
    const geometry = areaChartGeometry([0, 50, 100], 0, 100, 200, 100);
    expect(geometry.points).toEqual([
      { x: 0, y: 100 },
      { x: 100, y: 50 },
      { x: 200, y: 0 },
    ]);
    expect(geometry.line.startsWith('M ')).toBe(true);
    expect(geometry.area.endsWith('Z')).toBe(true);
  });

  it('stretches a single value across the width', () => {
    const geometry = areaChartGeometry([40], 0, 100, 100, 100);
    expect(geometry.points).toHaveLength(2);
    expect(geometry.points[0]?.y).toBe(60);
    expect(geometry.points[1]?.x).toBe(100);
  });
});
