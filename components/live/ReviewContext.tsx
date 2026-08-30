"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AnchoredComment,
  ReviewAnchor,
} from "@/lib/live/review-context";

export interface ReviewDraftNote {
  id: string;
  anchor: ReviewAnchor;
  body: string;
}

interface ReviewContextValue {
  draftNotes: ReviewDraftNote[];
  addDraftAnchor: (anchor: ReviewAnchor) => string;
  updateDraftBody: (id: string, body: string) => void;
  removeDraftNote: (id: string) => void;
  anchoredComments: AnchoredComment[];
  setAnchoredComments: (comments: AnchoredComment[]) => void;
  commentsVersion: number;
  notifyCommentsChanged: () => void;
}

const ReviewContext = createContext<ReviewContextValue | null>(null);

function draftId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ReviewContextProvider({ children }: { children: ReactNode }) {
  const [draftNotes, setDraftNotes] = useState<ReviewDraftNote[]>([]);
  const [anchoredComments, setAnchoredComments] = useState<AnchoredComment[]>([]);
  const [commentsVersion, setCommentsVersion] = useState(0);

  const addDraftAnchor = useCallback((anchor: ReviewAnchor) => {
    const id = draftId();
    setDraftNotes((current) => [...current, { id, anchor, body: "" }]);
    return id;
  }, []);

  const updateDraftBody = useCallback((id: string, body: string) => {
    setDraftNotes((current) =>
      current.map((note) => (note.id === id ? { ...note, body } : note)),
    );
  }, []);

  const removeDraftNote = useCallback((id: string) => {
    setDraftNotes((current) => current.filter((note) => note.id !== id));
  }, []);

  const notifyCommentsChanged = useCallback(() => {
    setCommentsVersion((version) => version + 1);
  }, []);

  const value = useMemo(
    () => ({
      draftNotes,
      addDraftAnchor,
      updateDraftBody,
      removeDraftNote,
      anchoredComments,
      setAnchoredComments,
      commentsVersion,
      notifyCommentsChanged,
    }),
    [
      addDraftAnchor,
      anchoredComments,
      commentsVersion,
      draftNotes,
      notifyCommentsChanged,
      removeDraftNote,
      updateDraftBody,
    ],
  );

  return <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>;
}

export function useReviewContext() {
  const context = useContext(ReviewContext);
  if (!context) {
    throw new Error("useReviewContext must be used inside ReviewContextProvider");
  }
  return context;
}
