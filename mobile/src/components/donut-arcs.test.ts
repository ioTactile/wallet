import { describe, expect, it } from '@jest/globals';

import { donutArcs, hitDonutSlice } from '@/components/donut-arcs';

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

  it('ignores the hole and the outside', () => {
    expect(hitDonutSlice(halves, size, 100, 100)).toBeNull();
    expect(hitDonutSlice(halves, size, 0, 0)).toBeNull();
  });
});
