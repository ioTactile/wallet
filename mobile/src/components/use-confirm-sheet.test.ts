import { describe, expect, it } from '@jest/globals';

import {
  confirmSheetReducer,
  toConfirmSheetView,
  type ConfirmSheetCopy,
  type ConfirmSheetState,
} from './use-confirm-sheet';

type Kind = 'delete' | 'leave';

function copyFor(kind: Kind): ConfirmSheetCopy {
  return {
    title: kind === 'delete' ? 'Delete?' : 'Leave?',
    message: 'Sure',
    cancelLabel: 'No',
    confirmLabel: 'Yes',
  };
}

const idle: ConfirmSheetState<Kind> = { payload: null, confirming: false };

describe('confirmSheetReducer', () => {
  it('opens and closes from idle', () => {
    const opened = confirmSheetReducer(idle, { type: 'open', payload: 'delete' });
    expect(opened).toEqual({ payload: 'delete', confirming: false });
    expect(confirmSheetReducer(opened, { type: 'close' })).toEqual(idle);
  });

  it('locks open and close while a confirm is in flight', () => {
    const confirming = confirmSheetReducer(
      { payload: 'leave', confirming: false },
      { type: 'confirmStart' },
    );
    expect(confirming).toEqual({ payload: 'leave', confirming: true });
    expect(confirmSheetReducer(confirming, { type: 'open', payload: 'delete' })).toEqual(
      confirming,
    );
    expect(confirmSheetReducer(confirming, { type: 'close' })).toEqual(confirming);
    expect(confirmSheetReducer(confirming, { type: 'confirmStart' })).toEqual(confirming);
    expect(confirmSheetReducer(confirming, { type: 'confirmEnd' })).toEqual(idle);
  });

  it('does not start a confirm when nothing is presented', () => {
    expect(confirmSheetReducer(idle, { type: 'confirmStart' })).toEqual(idle);
  });
});

describe('toConfirmSheetView', () => {
  it('maps idle and presented state to sheet props', () => {
    expect(toConfirmSheetView(idle, copyFor)).toMatchObject({
      presented: false,
      disabled: false,
      title: '',
      message: '',
      cancelLabel: '',
      confirmLabel: '',
    });
    expect(toConfirmSheetView({ payload: 'leave', confirming: true }, copyFor)).toMatchObject({
      presented: true,
      disabled: true,
      ...copyFor('leave'),
    });
  });
});
