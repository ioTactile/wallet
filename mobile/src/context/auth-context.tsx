import { useQueryClient } from '@tanstack/react-query';
import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';

import { authUseCases } from '@/application/use-cases';
import type { Session } from '@/domain/session';

type AuthContextValue = {
  hydrated: boolean;
  pinConfigured: boolean;
  unlocked: boolean;
  session: Session | null;
  createPin: (pin: string, confirmation: string) => Promise<void>;
  unlock: (pin: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  updateProfile: (firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [hydrated, setHydrated] = useState(false);
  const [pinConfigured, setPinConfigured] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let cancelled = false;
    authUseCases.hydrate.execute().then((snapshot) => {
      if (cancelled) return;
      setPinConfigured(snapshot.pinConfigured);
      setSession(snapshot.session);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      hydrated,
      pinConfigured,
      unlocked,
      session,
      async createPin(pin, confirmation) {
        await authUseCases.createPin.execute(pin, confirmation);
        setPinConfigured(true);
        setUnlocked(true);
      },
      async unlock(pin) {
        await authUseCases.verifyPin.execute(pin);
        setUnlocked(true);
      },
      async login(email, password) {
        setSession(await authUseCases.login.execute(email, password));
      },
      async register(email, password) {
        setSession(await authUseCases.register.execute(email, password));
      },
      async updateProfile(firstName, lastName) {
        setSession(await authUseCases.updateProfile.execute(firstName, lastName));
      },
      async logout() {
        await authUseCases.logout.execute();
        setSession(null);
        queryClient.clear();
      },
    }),
    [hydrated, pinConfigured, unlocked, session, queryClient],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const value = use(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return value;
}
