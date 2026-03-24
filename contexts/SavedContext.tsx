'use client';

import React, {
  createContext, useContext, useState, useEffect,
  useCallback, useRef, ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { savedService } from '../services/savedService';

interface SavedContextType {
  savedIds: Set<string>;
  isLoading: boolean;
  toggle: (listingId: string) => void;
  /** True when an unauthenticated user tried to save — show a sign-in modal. */
  showSignInModal: boolean;
  closeSignInModal: () => void;
}

const SavedContext = createContext<SavedContextType | undefined>(undefined);

export const SavedProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  /** If a guest taps the heart, remember which listing to save after sign-in. */
  const pendingId = useRef<string | null>(null);

  // Subscribe to Firestore when user signs in, clear when they sign out.
  useEffect(() => {
    if (!user) {
      setSavedIds(new Set());
      return;
    }
    setIsLoading(true);
    const unsub = savedService.onSavedChanged(user.id, (ids) => {
      setSavedIds(ids);
      setIsLoading(false);
    });
    return unsub;
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // After sign-in, execute any pending save the guest had queued.
  useEffect(() => {
    if (user && pendingId.current) {
      const id = pendingId.current;
      pendingId.current = null;
      // Optimistic update
      setSavedIds((prev) => new Set([...prev, id]));
      savedService.toggleSaved(user.id, id, false).catch(() => {
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      });
    }
  }, [user]);

  const toggle = useCallback(
    (listingId: string) => {
      if (!user) {
        pendingId.current = listingId;
        setShowSignInModal(true);
        return;
      }

      const currentlySaved = savedIds.has(listingId);

      // Optimistic update
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (currentlySaved) next.delete(listingId);
        else next.add(listingId);
        return next;
      });

      // Persist — rollback on failure
      savedService.toggleSaved(user.id, listingId, currentlySaved).catch(() => {
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (currentlySaved) next.add(listingId);
          else next.delete(listingId);
          return next;
        });
      });
    },
    [user, savedIds],
  );

  return (
    <SavedContext.Provider
      value={{
        savedIds,
        isLoading,
        toggle,
        showSignInModal,
        closeSignInModal: () => setShowSignInModal(false),
      }}
    >
      {children}
    </SavedContext.Provider>
  );
};

export const useSaved = (): SavedContextType => {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error('useSaved must be used within a SavedProvider');
  return ctx;
};
