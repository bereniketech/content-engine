"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type {
  ContentAsset,
  SessionInputData,
  SessionInputType,
} from "@/types";

interface CreateSessionResult {
  sessionId: string | null;
  error: string | null;
}

interface SessionContextValue {
  sessionId: string | null;
  inputType: SessionInputType | null;
  inputData: SessionInputData | null;
  improvedArticle: string | null;
  assets: ContentAsset[];
  isSubmitting: boolean;
  error: string | null;
  createSession: (
    inputType: SessionInputType,
    inputData: SessionInputData,
  ) => Promise<CreateSessionResult>;
  applyImprovedArticle: (article: string) => void;
  setAssets: (assets: ContentAsset[]) => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputType, setInputType] = useState<SessionInputType | null>(null);
  const [inputData, setInputData] = useState<SessionInputData | null>(null);
  const [improvedArticle, setImprovedArticle] = useState<string | null>(null);
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSession = useCallback(
    async (
      nextInputType: SessionInputType,
      nextInputData: SessionInputData,
    ): Promise<CreateSessionResult> => {
      setInputType(nextInputType);
      setInputData(nextInputData);
      setError(null);
      setIsSubmitting(true);

      const supabase = getSupabaseBrowserClient();

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          const authErrorMessage = userError?.message ?? "You must be logged in.";
          setError(authErrorMessage);
          setSessionId(null);
          return { sessionId: null, error: authErrorMessage };
        }

        const { data, error: insertError } = await supabase
          .from("sessions")
          .insert({
            user_id: user.id,
            input_type: nextInputType,
            input_data: nextInputData,
          })
          .select("id")
          .single();

        if (insertError) {
          setError(insertError.message);
          setSessionId(null);
          return { sessionId: null, error: insertError.message };
        }

        setSessionId(data.id);
        return { sessionId: data.id, error: null };
      } catch {
        const fallbackError = "Failed to create a session. Please try again.";
        setError(fallbackError);
        setSessionId(null);
        return { sessionId: null, error: fallbackError };
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const applyImprovedArticle = useCallback((article: string) => {
    const sanitizedArticle = article.trim();

    if (!sanitizedArticle) {
      return;
    }

    setImprovedArticle(sanitizedArticle);
    setInputType("upload");
    setInputData({ article: sanitizedArticle });
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      sessionId,
      inputType,
      inputData,
      improvedArticle,
      assets,
      isSubmitting,
      error,
      createSession,
      applyImprovedArticle,
      setAssets,
    }),
    [sessionId, inputType, inputData, improvedArticle, assets, isSubmitting, error, createSession, applyImprovedArticle],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionContext() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSessionContext must be used within SessionProvider.");
  }

  return context;
}