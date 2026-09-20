import { useCallback, useReducer, useRef } from 'react';

export type ConfirmSheetCopy = {
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
};

export type ConfirmSheetProps = ConfirmSheetCopy & {
  presented: boolean;
  disabled: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
};

export type ConfirmSheetState<T> = {
  payload: T | null;
  confirming: boolean;
};

export type ConfirmSheetAction<T> =
  | { type: 'open'; payload: T }
  | { type: 'close' }
  | { type: 'confirmStart' }
  | { type: 'confirmEnd' };

export type ConfirmSheetApi<T> = {
  payload: T | null;
  presented: boolean;
  open: (payload: T) => void;
  close: () => void;
  confirm: () => Promise<void>;
  props: ConfirmSheetProps;
};

const emptyCopy: ConfirmSheetCopy = {
  title: '',
  message: '',
  cancelLabel: '',
  confirmLabel: '',
};

export function confirmSheetReducer<T>(
  state: ConfirmSheetState<T>,
  action: ConfirmSheetAction<T>,
): ConfirmSheetState<T> {
  if (state.confirming && action.type !== 'confirmEnd') {
    return state;
  }
  switch (action.type) {
    case 'open':
      return { payload: action.payload, confirming: false };
    case 'close':
      return { payload: null, confirming: false };
    case 'confirmStart':
      if (state.payload == null) return state;
      return { ...state, confirming: true };
    case 'confirmEnd':
      return { payload: null, confirming: false };
  }
}

export function toConfirmSheetView<T>(
  state: ConfirmSheetState<T>,
  copy: (payload: T) => ConfirmSheetCopy,
): Omit<ConfirmSheetProps, 'onDismiss' | 'onConfirm'> {
  const labels = state.payload == null ? emptyCopy : copy(state.payload);
  return {
    presented: state.payload != null,
    disabled: state.confirming,
    ...labels,
  };
}

type Options<T> = {
  copy: (payload: T) => ConfirmSheetCopy;
  onConfirm: (payload: T) => void | Promise<void>;
};

export function useConfirmSheet<T>({ copy, onConfirm }: Options<T>): ConfirmSheetApi<T> {
  const [state, dispatch] = useReducer(confirmSheetReducer<T>, {
    payload: null,
    confirming: false,
  });
  const lockRef = useRef(false);

  const open = useCallback((payload: T) => {
    dispatch({ type: 'open', payload });
  }, []);

  const close = useCallback(() => {
    dispatch({ type: 'close' });
  }, []);

  const confirm = useCallback(async () => {
    if (state.payload == null || lockRef.current) return;
    lockRef.current = true;
    dispatch({ type: 'confirmStart' });
    try {
      await onConfirm(state.payload);
    } finally {
      lockRef.current = false;
      dispatch({ type: 'confirmEnd' });
    }
  }, [onConfirm, state.payload]);

  return {
    payload: state.payload,
    presented: state.payload != null,
    open,
    close,
    confirm,
    props: {
      ...toConfirmSheetView(state, copy),
      onDismiss: close,
      onConfirm: () => {
        void confirm();
      },
    },
  };
}
