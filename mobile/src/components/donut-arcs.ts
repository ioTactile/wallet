export type DonutSliceInput = {
  id: string;
  color: string;
  share: number;
};

export type DonutArc = {
  id: string;
  color: string;
  d: string;
};

const TWO_PI = Math.PI * 2;
const GAP = 0.04;
export const DONUT_INNER_RATIO = 0.62;

export function donutArcs(
  slices: readonly DonutSliceInput[],
  size: number,
  innerRatio = DONUT_INNER_RATIO,
): DonutArc[] {
  const cx = size / 2;
  const cy = size / 2;
  const outer = size / 2;
  const inner = outer * innerRatio;
  const visible = slices.filter((slice) => slice.share > 0);
  let angle = -Math.PI / 2;
  const gap = visible.length > 1 ? GAP : 0;

  return visible.map((slice) => {
    const sweep = slice.share * TWO_PI;
    const start = angle + gap / 2;
    const end = angle + sweep - gap / 2;
    angle += sweep;
    return {
      id: slice.id,
      color: slice.color,
      d: donutPath(cx, cy, outer, inner, start, Math.max(start, end)),
    };
  });
}

export function hitDonutSlice(
  slices: readonly DonutSliceInput[],
  size: number,
  x: number,
  y: number,
  innerRatio = DONUT_INNER_RATIO,
): string | null {
  const cx = size / 2;
  const cy = size / 2;
  const outer = size / 2;
  const inner = outer * innerRatio;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.hypot(dx, dy);
  if (dist < inner || dist > outer) {
    return null;
  }
  const visible = slices.filter((slice) => slice.share > 0);
  let fromStart = Math.atan2(dy, dx) + Math.PI / 2;
  if (fromStart < 0) {
    fromStart += TWO_PI;
  }
  let cursor = 0;
  for (const slice of visible) {
    const next = cursor + slice.share * TWO_PI;
    if (fromStart >= cursor && fromStart < next) {
      return slice.id;
    }
    cursor = next;
  }
  return visible.at(-1)?.id ?? null;
}

/** Prefer client − box on web; fall back to Pressable locationX/Y on native. */
export function localPointInDonut(input: {
  locationX: number;
  locationY: number;
  clientX?: number;
  clientY?: number;
  boxClientLeft?: number;
  boxClientTop?: number;
}): { x: number; y: number } {
  if (
    input.clientX != null &&
    input.clientY != null &&
    input.boxClientLeft != null &&
    input.boxClientTop != null
  ) {
    return {
      x: input.clientX - input.boxClientLeft,
      y: input.clientY - input.boxClientTop,
    };
  }
  return { x: input.locationX, y: input.locationY };
}

export function donutPath(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  start: number,
  end: number,
): string {
  const sweep = end - start;
  if (sweep >= TWO_PI - 1e-6) {
    const mid = start + Math.PI;
    return `${donutPath(cx, cy, outer, inner, start, mid)} ${donutPath(cx, cy, outer, inner, mid, end)}`;
  }
  const large = sweep > Math.PI ? 1 : 0;
  const startOuter = polar(cx, cy, outer, start);
  const endOuter = polar(cx, cy, outer, end);
  const startInner = polar(cx, cy, inner, end);
  const endInner = polar(cx, cy, inner, start);
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outer} ${outer} 0 ${large} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${inner} ${inner} 0 ${large} 0 ${endInner.x} ${endInner.y}`,
    'Z',
  ].join(' ');
}

function polar(cx: number, cy: number, radius: number, angle: number): { x: number; y: number } {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}
