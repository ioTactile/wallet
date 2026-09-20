import { BottomSheet, Button, Column, Text } from '@expo/ui';

import { Colors, Spacing } from '@/constants/theme';

import type { ConfirmSheetProps } from './use-confirm-sheet';

export { useConfirmSheet } from './use-confirm-sheet';
export type { ConfirmSheetApi, ConfirmSheetCopy, ConfirmSheetProps } from './use-confirm-sheet';

export function ConfirmSheet({
  presented,
  title,
  message,
  cancelLabel,
  confirmLabel,
  disabled,
  onDismiss,
  onConfirm,
}: ConfirmSheetProps) {
  const colors = Colors.light;

  return (
    <BottomSheet isPresented={presented} onDismiss={disabled ? () => undefined : onDismiss}>
      <Column spacing={Spacing.three}>
        <Text textStyle={{ fontSize: 18, fontWeight: '700' }}>{title}</Text>
        <Text>{message}</Text>
        <Button
          variant="filled"
          label={confirmLabel}
          disabled={disabled}
          onPress={onConfirm}
          style={{ backgroundColor: colors.danger }}
        />
        <Button variant="text" label={cancelLabel} disabled={disabled} onPress={onDismiss} />
      </Column>
    </BottomSheet>
  );
}
