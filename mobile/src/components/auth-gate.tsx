import { usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/context/auth-context';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { hydrated, pinConfigured, unlocked, session } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (pathname === '/bank/callback') {
      return;
    }

    const onPin = pathname === '/pin';
    const onWelcome = pathname === '/welcome';
    const onSignIn = pathname === '/sign-in';
    const onPublicAuth = onPin || onWelcome || onSignIn;

    if (!pinConfigured) {
      if (!onPin) router.replace('/pin');
      return;
    }

    if (!unlocked) {
      if (!onPin) router.replace('/pin');
      return;
    }

    if (!session) {
      if (!onWelcome && !onSignIn) router.replace('/welcome');
      return;
    }

    if (onPublicAuth) {
      router.replace('/');
    }
  }, [hydrated, pinConfigured, unlocked, session, pathname, router]);

  if (!hydrated) {
    return null;
  }

  return children;
}
