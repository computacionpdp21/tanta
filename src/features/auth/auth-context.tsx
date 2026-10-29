import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  consumeAuthNotice,
  mensajeAuthNotice,
  mensajeErrorAuth,
  setAuthNotice,
} from "@/lib/auth-errors";
import { asRecord, mapPerfil } from "@/lib/mappers";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Perfil, RolUsuario } from "@/types/database";

export interface AuthState {
  session: Session | null;
  user: User | null;
  perfil: Perfil | null;
  rol: RolUsuario | null;
  loading: boolean;
  isConfigured: boolean;
  notice: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearNotice: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(() => {
    const stored = consumeAuthNotice();
    return stored ? mensajeAuthNotice(stored) : null;
  });
  const requestId = useRef(0);
  const cierreManual = useRef(false);

  const applySession = useCallback(async (next: Session | null) => {
    const current = ++requestId.current;

    if (!supabase) {
      setSession(null);
      setPerfil(null);
      setLoading(false);
      return;
    }

    if (!next) {
      setSession(null);
      setPerfil(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("perfiles")
      .select("*")
      .eq("id", next.user.id)
      .maybeSingle();

    if (current !== requestId.current) return;

    if (error) {
      setSession(null);
      setPerfil(null);
      setLoading(false);
      setNotice(mensajeErrorAuth(error));
      await supabase.auth.signOut();
      return;
    }

    const mapped = data ? mapPerfil(asRecord(data) ?? {}) : null;

    if (!mapped) {
      setAuthNotice("missing_profile");
      setNotice(mensajeAuthNotice("missing_profile"));
      setSession(null);
      setPerfil(null);
      setLoading(false);
      await supabase.auth.signOut();
      return;
    }

    if (!mapped.activo) {
      setAuthNotice("inactive");
      setNotice(mensajeAuthNotice("inactive"));
      setSession(null);
      setPerfil(null);
      setLoading(false);
      await supabase.auth.signOut();
      return;
    }

    setSession(next);
    setPerfil(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!cancelled) return applySession(data.session);
      })
      .catch(() => {
        if (!cancelled) {
          setSession(null);
          setPerfil(null);
          setLoading(false);
        }
      });

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "SIGNED_OUT" && !cierreManual.current) {
        setAuthNotice("expired");
        setNotice(mensajeAuthNotice("expired"));
      }
      if (event === "SIGNED_IN") {
        cierreManual.current = false;
      }
      window.setTimeout(() => {
        void applySession(nextSession);
      }, 0);
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [applySession]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      throw new Error("Supabase no está configurado. Revisa el archivo .env.");
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(mensajeErrorAuth(error));
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    cierreManual.current = true;
    await supabase.auth.signOut();
    setSession(null);
    setPerfil(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      perfil,
      rol: perfil?.rol ?? null,
      loading,
      isConfigured: isSupabaseConfigured,
      notice,
      signIn,
      signOut,
      clearNotice: () => setNotice(null),
    }),
    [session, perfil, loading, notice, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}
