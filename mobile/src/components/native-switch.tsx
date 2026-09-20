import { Host, Switch } from '@expo/ui';

type Props = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

export function NativeSwitch({ value, onValueChange, disabled }: Props) {
  return (
    <Host matchContents>
      <Switch value={value} onValueChange={onValueChange} disabled={disabled} />
    </Host>
  );
}
