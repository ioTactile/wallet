import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

const PANEL_MAX_WIDTH = 300;
const OPEN_MS = 300;

type Props = {
  open: boolean;
  onClose: () => void;
};

export function HomeMenuSidebar({ open, onClose }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { session } = useAuth();
  const colors = Colors.light;
  const panelWidth = Math.min(windowWidth * 0.78, PANEL_MAX_WIDTH);
  const progress = useSharedValue(0);

  const initial =
    session?.user.firstName.trim().slice(0, 1).toUpperCase() ||
    session?.user.email.slice(0, 1).toUpperCase() ||
    '?';

  useEffect(() => {
    progress.set(
      withTiming(open ? 1 : 0, {
        duration: OPEN_MS,
        easing: Easing.bezier(0.32, 0.72, 0, 1),
      }),
    );
  }, [open, progress]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 1], [0, 0.4]),
  }));

  const panelStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(progress.get(), [0, 1], [-panelWidth, 0]),
      },
    ],
  }));

  function goToProfile() {
    onClose();
    router.push('/profile');
  }

  return (
    <View
      pointerEvents={open ? 'auto' : 'none'}
      style={StyleSheet.absoluteFill}
      accessibilityViewIsModal={open}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('menu.close')}
        onPress={onClose}
        style={StyleSheet.absoluteFill}
      >
        <Animated.View style={[styles.backdrop, backdropStyle]} />
      </Pressable>
      <Animated.View
        style={[
          styles.panel,
          panelStyle,
          {
            width: panelWidth,
            paddingTop: insets.top,
            backgroundColor: colors.background,
          },
        ]}
      >
        <View style={[styles.hero, { backgroundColor: colors.brand }]}>
          <Pressable style={styles.identity} onPress={goToProfile}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLabel}>{initial}</Text>
            </View>
            <View style={styles.identityText}>
              <Text style={styles.email} numberOfLines={1}>
                {session?.user.email}
              </Text>
              <Text style={styles.wallet}>{t('menu.wallet')}</Text>
            </View>
          </Pressable>
        </View>
        <Pressable style={styles.row} onPress={onClose}>
          <Text style={styles.rowLabel}>{t('home.title')}</Text>
        </Pressable>
        <Pressable style={styles.row} onPress={goToProfile}>
          <Text style={styles.rowLabel}>{t('profile.title')}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  hero: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  identityText: {
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    fontWeight: '700',
    fontSize: 18,
  },
  email: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  wallet: {
    color: '#E8FFF1',
    marginTop: 2,
  },
  row: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  rowLabel: {
    fontSize: 16,
  },
});
