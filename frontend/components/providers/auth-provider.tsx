"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import { login as loginRequest, logout as logoutRequest, refreshSession as refreshSessionRequest } from "@/lib/api/auth";
import { configureApiClient } from "@/lib/api/client";
import {
  AuthSessionResponse,
  AuthStatus,
  LoginInput,
  UserResponse,
} from "@/lib/api/types";

type AuthContextValue = {
  status: AuthStatus;
  user: UserResponse | null;
  accessToken: string | null;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
  setUser: (user: UserResponse) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUserState] = useState<UserResponse | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const accessTokenRef = useRef<string | null>(null);

  const applySession = useCallback((session: AuthSessionResponse) => {
    accessTokenRef.current = session.accessToken;
    setAccessToken(session.accessToken);
    setUserState(session.user);
    setStatus("authenticated");
  }, []);

  const clearSession = useCallback(() => {
    accessTokenRef.current = null;
    setAccessToken(null);
    setUserState(null);
    setStatus("anonymous");
  }, []);

  const refresh = useCallback(async () => {
    try {
      const session = await refreshSessionRequest();
      applySession(session);
      return true;
    } catch {
      clearSession();
      return false;
    }
  }, [applySession, clearSession]);

  const login = useCallback(
    async (input: LoginInput) => {
      const session = await loginRequest(input);
      applySession(session);
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // Best effort only; local state still needs to clear.
    }

    clearSession();
    router.replace("/login");
  }, [clearSession, router]);

  const setUser = useCallback((nextUser: UserResponse) => {
    setUserState(nextUser);
    setStatus("authenticated");
  }, []);

  useEffect(() => {
    configureApiClient({
      getAccessToken: () => accessTokenRef.current,
      refreshSession: refresh,
      onAuthFailure: () => {
        clearSession();

        if (pathname !== "/login" && pathname !== "/signup") {
          router.replace(`/login?next=${encodeURIComponent(pathname || "/events")}`);
        }
      },
    });
  }, [clearSession, pathname, refresh, router]);

  useEffect(() => {
    let cancelled = false;

    async function initializeSession() {
      try {
        const session = await refreshSessionRequest();

        if (cancelled) {
          return;
        }

        applySession(session);
      } catch {
        if (!cancelled) {
          clearSession();
        }
      }
    }

    void initializeSession();

    return () => {
      cancelled = true;
    };
  }, [applySession, clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      accessToken,
      login,
      logout,
      refresh,
      setUser,
    }),
    [accessToken, login, logout, refresh, setUser, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
