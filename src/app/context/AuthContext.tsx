import { createContext, useContext, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "../services/supabase";
import { api, setGuestMode } from "../../utils/api";

const GUEST_KEY = "overload_guest_mode";

// Create a minimal mock user object for guest mode
function createGuestUser(): User {
  const guestId = localStorage.getItem("overload_guest_id") || crypto.randomUUID();
  localStorage.setItem("overload_guest_id", guestId);
  return {
    id: guestId,
    app_metadata: {},
    user_metadata: { name: "Guest" },
    aud: "authenticated",
    created_at: new Date().toISOString(),
    is_anonymous: true,
    email: undefined,
  } as unknown as User;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isGuest: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  isGuest: false,
  signIn: async () => {},
  signUp: async () => {},
  signInWithGoogle: async () => {},
  signInAsGuest: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  deleteAccount: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    // Check if there's an active guest session first
    const wasGuest = localStorage.getItem(GUEST_KEY) === "true";
    if (wasGuest) {
      setUser(createGuestUser());
      setIsGuest(true);
      setGuestMode(true);
      setIsLoading(false);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // If a real user signs in, clear guest mode
        if (session?.user) {
          localStorage.removeItem(GUEST_KEY);
          setIsGuest(false);
          setGuestMode(false);
        }
        setSession(session);
        setUser(session?.user ?? (wasGuest ? createGuestUser() : null));
        setIsLoading(false);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    localStorage.removeItem(GUEST_KEY);
    setIsGuest(false);
    setGuestMode(false);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, name: string) => {
    localStorage.removeItem(GUEST_KEY);
    setIsGuest(false);
    setGuestMode(false);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (signUpError) throw signUpError;

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      throw new Error(
        'Account created! Please check your email to confirm your account, then sign in.'
      );
    }
  };

  const signInWithGoogle = async () => {
    localStorage.removeItem(GUEST_KEY);
    setIsGuest(false);
    setGuestMode(false);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) throw error;
  };

  const signInAsGuest = async () => {
    localStorage.setItem(GUEST_KEY, "true");
    setIsGuest(true);
    setGuestMode(true);
    setUser(createGuestUser());
  };

  const signOut = async () => {
    if (isGuest) {
      localStorage.removeItem(GUEST_KEY);
      localStorage.removeItem("overload_guest_id");
      setIsGuest(false);
      setGuestMode(false);
      setUser(null);
      setSession(null);
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) throw error;
  };

  const deleteAccount = async () => {
    if (isGuest) {
      // Clear all guest data from localStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("overload_")) keysToRemove.push(key);
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      setIsGuest(false);
      setGuestMode(false);
      setUser(null);
      setSession(null);
      return;
    }
    await api.auth.deleteAccount();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user, session, isLoading, isGuest,
      signIn, signUp, signInWithGoogle, signInAsGuest,
      signOut, resetPassword, deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
};