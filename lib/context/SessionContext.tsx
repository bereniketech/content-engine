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
  prefillTopicForm: (topic: string, keywords?: string[]) => void;
  setAssets: (assets: ContentAsset[]) => void;
  upsertAsset: (asset: ContentAsset) => void;
  loadSession: (session: {
    sessionId: string;
    inputType: SessionInputType;
    inputData: SessionInputData;
    assets: ContentAsset[];
  }) => void;
  clearSession: () => void;
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
      setImprovedArticle(null);
      setAssets([]);
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

  const clearSession = useCallback(() => {
    setSessionId(null);
    setInputType(null);
    setInputData(null);
    setImprovedArticle(null);
    setAssets([]);
    setError(null);
  }, []);

  const prefillTopicForm = useCallback((topic: string, keywords: string[] = []) => {
    const sanitizedTopic = topic.trim();

    if (!sanitizedTopic) {
      return;
    }

    setInputType("topic");
    setInputData({
      topic: sanitizedTopic,
      audience: "",
      tone: "authority",
      keywords: keywords.length > 0 ? keywords.join(", ") : undefined,
      geography: undefined,
    });
  }, []);

  const loadSession = useCallback(
    (session: {
      sessionId: string;
      inputType: SessionInputType;
      inputData: SessionInputData;
      assets: ContentAsset[];
    }) => {
      setSessionId(session.sessionId);
      setInputType(session.inputType);
      setInputData(session.inputData);
      setImprovedArticle(null);
      setAssets(session.assets);
      setError(null);
    },
    [],
  );

  const upsertAsset = useCallback((asset: ContentAsset) => {
    setAssets((currentAssets) => {
      const nextAssets = currentAssets.filter((currentAsset) => currentAsset.id !== asset.id)
      nextAssets.push(asset)
      nextAssets.sort((left, right) =>
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
      )
      return nextAssets
    })

    if (asset.assetType === 'improved') {
      const improved = typeof asset.content.improved === 'string' ? asset.content.improved.trim() : ''
      if (improved) {
        setImprovedArticle(improved)
        setInputType('upload')
        setInputData({ article: improved })
      }
    }
  }, [])

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
      prefillTopicForm,
      setAssets,
      upsertAsset,
      loadSession,
      clearSession,
    }),
    [
      sessionId,
      inputType,
      inputData,
      improvedArticle,
      assets,
      isSubmitting,
      error,
      createSession,
      applyImprovedArticle,
      prefillTopicForm,
      upsertAsset,
      loadSession,
      clearSession,
    ],
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