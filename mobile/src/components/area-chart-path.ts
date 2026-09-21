export type ChartPoint = { x: number; y: number };

export function areaChartGeometry(
  values: readonly number[],
  yMin: number,
  yMax: number,
  width: number,
  height: number,
): { line: string; area: string; points: ChartPoint[] } {
  const series = values.length === 1 ? [values[0] ?? 0, values[0] ?? 0] : [...values];
  const span = yMax - yMin || 1;
  const last = Math.max(series.length - 1, 1);
  const points = series.map((value, index) => ({
    x: (index / last) * width,
    y: height - ((value - yMin) / span) * height,
  }));
  const line = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const lastPoint = points.at(-1) ?? { x: 0, y: height };
  const firstPoint = points[0] ?? { x: 0, y: height };
  const area = `${line} L ${lastPoint.x} ${height} L ${firstPoint.x} ${height} Z`;
  return { line, area, points };
}
