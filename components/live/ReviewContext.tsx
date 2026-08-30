"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AnchoredComment,
  ReviewAnchor,
} from "@/lib/live/review-context";

interface ReviewContextValue {
  draftAnchor: ReviewAnchor | null;
  setDraftAnchor: (anchor: ReviewAnchor | null) => void;
  anchoredComments: AnchoredComment[];
  setAnchoredComments: (comments: AnchoredComment[]) => void;
}

const ReviewContext = createContext<ReviewContextValue | null>(null);

export function ReviewContextProvider({ children }: { children: ReactNode }) {
  const [draftAnchor, setDraftAnchor] = useState<ReviewAnchor | null>(null);
  const [anchoredComments, setAnchoredComments] = useState<AnchoredComment[]>([]);
  const value = useMemo(
    () => ({
      draftAnchor,
      setDraftAnchor,
      anchoredComments,
      setAnchoredComments,
    }),
    [anchoredComments, draftAnchor],
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
