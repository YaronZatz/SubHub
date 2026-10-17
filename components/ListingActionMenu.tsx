'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sublet, ListingStatus, Language } from '../types';
import { translations } from '../translations';
import { getAuth } from 'firebase/auth';
import ConfirmModal from './shared/ConfirmModal';
import { accountCopy } from '../lib/accountCopy';

interface ListingActionMenuProps {
  listing: Sublet;
  language: Language;
  onStatusChange: (updated: Sublet) => void;
  onDelete: (id: string) => void;
  onToast: (msg: string) => void;
  className?: string;
}

type PendingAction = 'fill' | 'delete';

export default function ListingActionMenu({
  listing,
  language,
  onStatusChange,
  onDelete,
  onToast,
  className = '',
}: ListingActionMenuProps) {
  const t = translations[language];
  const ac = accountCopy(language).listingActions;
  const [open, setOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const { status } = listing;

  // Scraped / already-deleted listings have no action menu
  if (
    status === ListingStatus.TAKEN ||
    status === ListingStatus.EXPIRED ||
    status === ListingStatus.DELETED
  ) return null;

  const canPause   = status === ListingStatus.AVAILABLE;
  const canResume  = status === ListingStatus.PAUSED;
  const canFill    = status === ListingStatus.AVAILABLE || status === ListingStatus.PAUSED;
  const canDelete  = true; // active, paused, filled all allow delete

  // errorMsg is a localized, user-facing message (or '' to use the action's own failure message).
  // Raw server/network errors are logged, never shown.
  const patchStatus = async (newStatus: string): Promise<{ ok: boolean; errorMsg: string }> => {
    try {
      const user = getAuth().currentUser;
      const token = user ? await user.getIdToken() : null;
      if (!token) return { ok: false, errorMsg: ac.notSignedIn };
      const res = await fetch(`/api/listings/${listing.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) return { ok: true, errorMsg: '' };
      let detail = `HTTP ${res.status}`;
      try { const body = await res.json(); if (body?.error) detail = `${detail}: ${body.error}`; } catch { /* ignore */ }
      console.error(`[ListingActionMenu] PATCH status failed: ${detail}`);
      return { ok: false, errorMsg: res.status === 401 ? ac.notSignedIn : '' };
    } catch (err) {
      console.error('[ListingActionMenu] PATCH status error:', err);
      return { ok: false, errorMsg: '' };
    }
  };

  const handlePause = async () => {
    setOpen(false);
    const { ok, errorMsg } = await patchStatus('paused');
    if (ok) {
      onStatusChange({ ...listing, status: ListingStatus.PAUSED });
      onToast(t.toastPaused);
    } else {
      onToast(errorMsg || ac.pauseFailed);
    }
  };

  const handleResume = async () => {
    setOpen(false);
    const { ok, errorMsg } = await patchStatus('active');
    if (ok) {
      onStatusChange({ ...listing, status: ListingStatus.AVAILABLE });
      onToast(t.toastResumed);
    } else {
      onToast(errorMsg || ac.resumeFailed);
    }
  };

  const handleConfirm = async () => {
    if (!pendingAction) return;
    setIsLoading(true);
    if (pendingAction === 'fill') {
      const { ok, errorMsg } = await patchStatus('filled');
      setPendingAction(null);
      setIsLoading(false);
      if (ok) {
        onStatusChange({ ...listing, status: ListingStatus.FILLED });
        onToast(t.toastFilled);
      } else {
        onToast(errorMsg || ac.fillFailed);
      }
    } else if (pendingAction === 'delete') {
      const { ok, errorMsg } = await patchStatus('deleted');
      setPendingAction(null);
      setIsLoading(false);
      if (ok) {
        onDelete(listing.id);
        onToast(t.toastDeleted);
      } else {
        onToast(errorMsg || ac.deleteFailed);
      }
    }
  };

  return (
    <>
      <div ref={menuRef} className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-label={ac.menuLabel}
          className="w-9 h-9 flex items-center justify-center text-muted hover:text-ink hover:bg-brand-50 rounded-xl transition-colors text-lg font-bold"
        >
          ···
        </button>

        {open && (
          <div className="absolute end-0 top-full mt-1 z-50 bg-white rounded-2xl shadow-xl border border-line py-1.5 min-w-[160px]">
            {canPause && (
              <button
                type="button"
                onClick={handlePause}
                className="w-full text-start px-4 py-2.5 text-sm text-ink hover:bg-brand-50 font-medium transition-colors"
              >
                {t.pauseListing}
              </button>
            )}
            {canResume && (
              <button
                type="button"
                onClick={handleResume}
                className="w-full text-start px-4 py-2.5 text-sm text-ink hover:bg-brand-50 font-medium transition-colors"
              >
                {t.resumeListing}
              </button>
            )}
            {canFill && (
              <button
                type="button"
                onClick={() => { setOpen(false); setPendingAction('fill'); }}
                className="w-full text-start px-4 py-2.5 text-sm text-ink hover:bg-brand-50 font-medium transition-colors"
              >
                {t.markAsFilled}
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => { setOpen(false); setPendingAction('delete'); }}
                className="w-full text-start px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-medium transition-colors"
              >
                {t.deleteListing}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Confirm modals */}
      {pendingAction === 'fill' && (
        <ConfirmModal
          title={t.confirmFillTitle}
          body={t.confirmFillBody}
          confirmLabel={t.markAsFilled}
          onConfirm={handleConfirm}
          cancelLabel={t.cancel}
          onCancel={() => setPendingAction(null)}
          isLoading={isLoading}
        />
      )}
      {pendingAction === 'delete' && (
        <ConfirmModal
          title={t.confirmDeleteTitle}
          body={t.confirmDeleteBody}
          confirmLabel={t.deleteListing}
          danger
          onConfirm={handleConfirm}
          cancelLabel={t.cancel}
          onCancel={() => setPendingAction(null)}
          isLoading={isLoading}
        />
      )}

    </>
  );
}
