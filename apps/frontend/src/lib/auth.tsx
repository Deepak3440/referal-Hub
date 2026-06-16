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
  avatarData?: string;
  avatarMimeType?: string;
};

export type SignUpResult =
  | { requiresVerification: true; email: string }
  | { signedIn: true };

type AuthContextValue = {
  isLoaded: boolean;
  isSignedIn: boolean;
  signUp: (payload: SignUpPayload) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  resendVerificationEmail: (email: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<{ email: string }>;
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

  const signUp = useCallback(async (payload: SignUpPayload): Promise<SignUpResult> => {
    const data = await httpRequest<{
      token?: string;
      requiresVerification?: boolean;
      email?: string;
    }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (data.requiresVerification) {
      return {
        requiresVerification: true,
        email: data.email ?? payload.email.trim().toLowerCase(),
      };
    }

    if (!data.token) {
      throw new Error("Unexpected signup response");
    }

    setStoredToken(data.token);
    setIsSignedIn(true);
    return { signedIn: true };
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

  const resendVerificationEmail = useCallback(async (email: string) => {
    await httpRequest("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }, []);

  const verifyEmail = useCallback(async (token: string) => {
    const data = await httpRequest<{ verified: boolean; email: string }>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
    return { email: data.email };
  }, []);

  const value = useMemo(
    () => ({
      isLoaded,
      isSignedIn,
      signUp,
      signIn,
      signOut,
      resendVerificationEmail,
      verifyEmail,
    }),
    [isLoaded, isSignedIn, signUp, signIn, signOut, resendVerificationEmail, verifyEmail],
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
