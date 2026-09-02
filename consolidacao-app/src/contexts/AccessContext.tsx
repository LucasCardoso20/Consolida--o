import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { UserProfile } from "../types/access";

type AccessContextValue = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  profileError: string | null;
  refreshProfile: () => Promise<void>;
};

const AccessContext = createContext<AccessContextValue | null>(null);

type AccessProviderProps = {
  children: ReactNode;
};

export function AccessProvider({ children }: AccessProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    setProfileError(null);

    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        organization_id,
        full_name,
        email,
        role,
        access_status,
        created_at
      `)
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Erro ao carregar perfil:", error);
      setProfile(null);
      setProfileError(
        "Não foi possível carregar as informações de acesso da conta.",
      );
      return;
    }

    setProfile(data as UserProfile | null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    setSession(currentSession);

    if (!currentSession?.user) {
      setProfile(null);
      setProfileError(null);
      return;
    }

    await loadProfile(currentSession.user.id);
  }, [loadProfile]);

  useEffect(() => {
    let isMounted = true;

    async function initializeAccess() {
      setIsLoading(true);

      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      setSession(initialSession);

      if (initialSession?.user) {
        await loadProfile(initialSession.user.id);
      } else {
        setProfile(null);
      }

      if (isMounted) {
        setIsLoading(false);
      }
    }

    void initializeAccess();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);

      if (!nextSession?.user) {
        setProfile(null);
        setProfileError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      await loadProfile(nextSession.user.id);

      if (isMounted) {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<AccessContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isLoading,
      profileError,
      refreshProfile,
    }),
    [isLoading, profile, profileError, refreshProfile, session],
  );

  return (
    <AccessContext.Provider value={value}>
      {children}
    </AccessContext.Provider>
  );
}

export function useAccess() {
  const context = useContext(AccessContext);

  if (!context) {
    throw new Error("useAccess deve ser usado dentro de AccessProvider.");
  }

  return context;
}