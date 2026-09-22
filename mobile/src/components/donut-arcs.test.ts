import { describe, expect, it } from '@jest/globals';

import { donutArcs, hitDonutSlice, localPointInDonut } from '@/components/donut-arcs';

describe('donutArcs', () => {
  it('builds one path per positive share and a full ring for a single slice', () => {
    const full = donutArcs([{ id: 'all', color: '#F44336', share: 1 }], 200);
    expect(full).toHaveLength(1);
    expect(full[0]?.d.includes('A ')).toBe(true);

    const halves = donutArcs(
      [
        { id: 'a', color: '#F44336', share: 0.5 },
        { id: 'b', color: '#FFA726', share: 0.5 },
      ],
      200,
    );
    expect(halves.map((arc) => arc.id)).toEqual(['a', 'b']);
    expect(halves[0]?.d).not.toEqual(halves[1]?.d);
  });

  it('skips empty shares', () => {
    expect(
      donutArcs(
        [
          { id: 'a', color: '#000', share: 0 },
          { id: 'b', color: '#111', share: 1 },
        ],
        100,
      ).map((arc) => arc.id),
    ).toEqual(['b']);
  });
});

describe('hitDonutSlice', () => {
  const size = 200;
  const halves = [
    { id: 'a', color: '#F44336', share: 0.5 },
    { id: 'b', color: '#FFA726', share: 0.5 },
  ];

  it('returns the slice under a point on the ring', () => {
    expect(hitDonutSlice(halves, size, 100, 30)).toBe('a');
    expect(hitDonutSlice(halves, size, 170, 100)).toBe('a');
    expect(hitDonutSlice(halves, size, 100, 170)).toBe('b');
    expect(hitDonutSlice(halves, size, 30, 100)).toBe('b');
  });

  it('hits uneven slices in clockwise order from the top', () => {
    const uneven = [
      { id: 'big', color: '#CCC', share: 0.7 },
      { id: 'mid', color: '#F88', share: 0.2 },
      { id: 'small', color: '#8CC', share: 0.1 },
    ];
    // Top / right → large slice (0°–252° from top).
    expect(hitDonutSlice(uneven, size, 100, 30)).toBe('big');
    expect(hitDonutSlice(uneven, size, 170, 100)).toBe('big');
    // Left (~270°) → mid slice.
    expect(hitDonutSlice(uneven, size, 30, 100)).toBe('mid');
    // Upper-left (~340°) → small slice.
    expect(hitDonutSlice(uneven, size, 76, 34)).toBe('small');
  });

  it('ignores the hole and the outside', () => {
    expect(hitDonutSlice(halves, size, 100, 100)).toBeNull();
    expect(hitDonutSlice(halves, size, 0, 0)).toBeNull();
  });
});

describe('localPointInDonut', () => {
  it('uses client coordinates against the box when provided', () => {
    expect(
      localPointInDonut({
        locationX: 0,
        locationY: 0,
        clientX: 250,
        clientY: 180,
        boxClientLeft: 100,
        boxClientTop: 50,
      }),
    ).toEqual({ x: 150, y: 130 });
  });

  it('falls back to locationX/Y', () => {
    expect(localPointInDonut({ locationX: 40, locationY: 60 })).toEqual({ x: 40, y: 60 });
  });
});
