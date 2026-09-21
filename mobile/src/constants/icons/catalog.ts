import type { CrossPlatformIcon } from './types';

export const Icons = {
  menu: { ios: 'line.3.horizontal', android: 'menu', web: 'menu' },
  chevronLeft: { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  bell: { ios: 'bell', android: 'notifications', web: 'notifications' },
  checkmark: { ios: 'checkmark', android: 'check', web: 'check' },
  lock: { ios: 'lock.fill', android: 'lock', web: 'lock' },
  shield: { ios: 'shield.fill', android: 'shield', web: 'shield' },
  mail: { ios: 'envelope.fill', android: 'mail', web: 'mail' },
  list: { ios: 'list.bullet', android: 'format_list_bulleted', web: 'format_list_bulleted' },
  plus: { ios: 'plus', android: 'add', web: 'add' },
  trash: { ios: 'trash', android: 'delete', web: 'delete' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  transfer: { ios: 'arrow.left.arrow.right', android: 'swap_horiz', web: 'swap_horiz' },
} as const satisfies Record<string, CrossPlatformIcon>;

export type AppIconName = keyof typeof Icons;

export type HeaderLeftIcon = Extract<AppIconName, 'menu' | 'chevronLeft' | 'close'>;
export type HeaderRightIcon = Extract<AppIconName, 'bell' | 'checkmark' | 'plus'>;
