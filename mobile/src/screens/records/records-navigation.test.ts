import { describe, expect, it } from '@jest/globals';

import { newRecordHref, recordDetailHref, recordsListHref } from './records-navigation';

describe('records navigation', () => {
  it('closes record flows on the list instead of walking the stack', () => {
    expect(recordsListHref()).toBe('/records');
    expect(recordsListHref('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')).toEqual({
      pathname: '/records',
      params: { accountIds: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    });
  });

  it('returns to the existing detail or new-record screen with picker params', () => {
    expect(
      recordDetailHref('3b8d1f2a-6c5e-4d0b-9f11-2a4c6e8b0d12', {
        categoryId: 'food_drinks.groceries',
        kind: 'expense',
      }),
    ).toEqual({
      pathname: '/records/[id]',
      params: {
        id: '3b8d1f2a-6c5e-4d0b-9f11-2a4c6e8b0d12',
        categoryId: 'food_drinks.groceries',
        kind: 'expense',
      },
    });
    expect(newRecordHref({ kind: 'expense', categoryId: 'food_drinks' })).toEqual({
      pathname: '/records/new',
      params: { kind: 'expense', categoryId: 'food_drinks' },
    });
  });
});
