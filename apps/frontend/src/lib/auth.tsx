import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { httpRequest } from "@/lib/http-client";

const TOKEN_KEY = "referral_hub_token";

export type SignUpPayload = {
  fullName: string;
  email: string;
  password: string;
  memberType: "student" | "alumni";
  isWorkingProfessional: boolean;
  isConsultant: boolean;
  company?: string;
  currentRole?: string;
  experienceYears?: number;
};

type AuthContextValue = {
  isLoaded: boolean;
  isSignedIn: boolean;
  signUp: (payload: SignUpPayload) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
  setAuthTokenGetter(() => getStoredToken());
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const validateSession = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setIsSignedIn(false);
      setIsLoaded(true);
      return;
    }

    setAuthTokenGetter(() => token);

    try {
      await httpRequest("/users/me");
      setIsSignedIn(true);
    } catch {
      setStoredToken(null);
      setIsSignedIn(false);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    void validateSession();
  }, [validateSession]);

  const signUp = useCallback(async (payload: SignUpPayload) => {
    const data = await httpRequest<{ token: string }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setStoredToken(data.token);
    setIsSignedIn(true);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const data = await httpRequest<{ token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(data.token);
    setIsSignedIn(true);
  }, []);

  const signOut = useCallback(() => {
    setStoredToken(null);
    setIsSignedIn(false);
  }, []);

  const value = useMemo(
    () => ({
      isLoaded,
      isSignedIn,
      signUp,
      signIn,
      signOut,
    }),
    [isLoaded, isSignedIn, signUp, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

// Wire token getter before first render so generated hooks work immediately.
setAuthTokenGetter(() => getStoredToken());
