import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { User } from "@shared/schema";
import { STORAGE_KEYS } from "@/lib/constants";

interface AuthContextType {
  user: User | null;
  isConnected: boolean;
  isLoading: boolean;
  isSignedOut: boolean;
  signIn: (user: User) => void;
  signOut: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedOut, setIsSignedOut] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem(STORAGE_KEYS.CONNECTED_USER);
    const walletConnected = localStorage.getItem(STORAGE_KEYS.WALLET_CONNECTED);
    const userSignedOut = localStorage.getItem(STORAGE_KEYS.USER_SIGNED_OUT);

    if (userSignedOut === "true") {
      setIsSignedOut(true);
      setIsLoading(false);
      return;
    }

    if (storedUser && walletConnected === "true") {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsConnected(true);
      } catch {
        localStorage.removeItem(STORAGE_KEYS.CONNECTED_USER);
        localStorage.removeItem(STORAGE_KEYS.WALLET_CONNECTED);
      }
    }
    setIsLoading(false);
  }, []);

  const signIn = useCallback((newUser: User) => {
    setUser(newUser);
    setIsConnected(true);
    localStorage.setItem(STORAGE_KEYS.CONNECTED_USER, JSON.stringify(newUser));
    localStorage.setItem(STORAGE_KEYS.WALLET_CONNECTED, "true");
    localStorage.removeItem(STORAGE_KEYS.USER_SIGNED_OUT);
    localStorage.removeItem(STORAGE_KEYS.USER_CLICKED_HOME);
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    setIsConnected(false);
    setIsSignedOut(true);
    localStorage.removeItem(STORAGE_KEYS.CONNECTED_USER);
    localStorage.removeItem(STORAGE_KEYS.WALLET_CONNECTED);
    localStorage.setItem(STORAGE_KEYS.USER_SIGNED_OUT, "true");
    localStorage.removeItem(STORAGE_KEYS.USER_CLICKED_HOME);
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEYS.CONNECTED_USER, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, isConnected, isLoading, isSignedOut, signIn, signOut, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useConnectedUserId(): number | null {
  const { user } = useAuth();
  return user?.id ?? null;
}
