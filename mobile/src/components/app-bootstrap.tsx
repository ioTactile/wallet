import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, type ReactNode } from 'react';
import { AppState, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { writeQueueUseCases } from '@/application/use-cases';
import { AuthProvider, useAuth } from '@/context/auth-context';

SplashScreen.preventAutoHideAsync();

function SplashHider() {
  const { hydrated } = useAuth();

  useEffect(() => {
    if (hydrated) {
      void SplashScreen.hideAsync();
    }
  }, [hydrated]);

  return null;
}

function WriteQueueFlusher() {
  const { session } = useAuth();
  const client = useQueryClient();

  useEffect(() => {
    if (!session) {
      return;
    }

    async function flush() {
      const flushed = await writeQueueUseCases.flush.execute();
      if (flushed > 0) {
        await client.invalidateQueries();
      }
    }

    void flush();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void flush();
      }
    });
    return () => sub.remove();
  }, [session, client]);

  return null;
}

export function AppBootstrap({ children }: { children: ReactNode }) {
  const colorScheme = useColorScheme();
  const [client] = useState(() => new QueryClient());

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={client}>
        <AuthProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <SplashHider />
            <WriteQueueFlusher />
            {children}
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
