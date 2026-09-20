import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { AuthGate } from '@/components/auth-gate';
import { AuthProvider, useAuth } from '@/context/auth-context';
import '@/i18n';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function SplashHider() {
  const { hydrated } = useAuth();

  useEffect(() => {
    if (hydrated) {
      void SplashScreen.hideAsync();
    }
  }, [hydrated]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [client] = useState(queryClient);

  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <SplashHider />
          <AuthGate>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(app)" />
              <Stack.Screen name="welcome" />
              <Stack.Screen name="sign-in" />
              <Stack.Screen name="pin" />
            </Stack>
          </AuthGate>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
