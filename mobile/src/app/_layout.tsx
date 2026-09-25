import { Stack } from 'expo-router/stack';

import { AppBootstrap } from '@/components/app-bootstrap';
import { AuthGate } from '@/components/auth-gate';
import '@/i18n';

export default function RootLayout() {
  return (
    <AppBootstrap>
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(app)" />
          <Stack.Screen name="welcome" />
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="pin" />
        </Stack>
      </AuthGate>
    </AppBootstrap>
  );
}
