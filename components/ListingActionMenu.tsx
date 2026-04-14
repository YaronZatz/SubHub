'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sublet, ListingStatus, Language } from '../types';
import { translations } from '../translations';
import { getAuth } from 'firebase/auth';
import ConfirmModal from './shared/ConfirmModal';

interface ListingActionMenuProps {
  listing: Sublet;
  language: Language;
  onStatusChange: (updated: Sublet) => void;
  onDelete: (id: string) => void;
  className?: string;
}

type PendingAction = 'fill' | 'delete';

export default function ListingActionMenu({
  listing,
  language,
  onStatusChange,
  onDelete,
  className = '',
}: ListingActionMenuProps) {
  const t = translations[language];
  const [open, setOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
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

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const patchStatus = async (newStatus: string): Promise<{ ok: boolean; errorMsg?: string }> => {
    try {
      const user = getAuth().currentUser;
      const token = user ? await user.getIdToken() : null;
      if (!token) return { ok: false, errorMsg: 'Not signed in' };
      const res = await fetch(`/api/listings/${listing.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) return { ok: true };
      let errorMsg = `Error ${res.status}`;
      try { const body = await res.json(); errorMsg = body?.error ?? errorMsg; } catch { /* ignore */ }
      console.error(`[ListingActionMenu] PATCH status failed: ${errorMsg}`);
      return { ok: false, errorMsg };
    } catch (err) {
      return { ok: false, errorMsg: String(err) };
    }
  };

  const handlePause = async () => {
    setOpen(false);
    const { ok, errorMsg } = await patchStatus('paused');
    if (ok) {
      onStatusChange({ ...listing, status: ListingStatus.PAUSED });
      showToast(t.toastPaused);
    } else {
      showToast(errorMsg ?? 'Failed to pause listing');
    }
  };

  const handleResume = async () => {
    setOpen(false);
    const { ok, errorMsg } = await patchStatus('active');
    if (ok) {
      onStatusChange({ ...listing, status: ListingStatus.AVAILABLE });
      showToast(t.toastResumed);
    } else {
      showToast(errorMsg ?? 'Failed to resume listing');
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
        showToast(t.toastFilled);
      } else {
        showToast(errorMsg ?? 'Failed to mark as filled');
      }
    } else if (pendingAction === 'delete') {
      const { ok, errorMsg } = await patchStatus('deleted');
      setPendingAction(null);
      setIsLoading(false);
      if (ok) {
        onDelete(listing.id);
        showToast(t.toastDeleted);
      } else {
        showToast(errorMsg ?? 'Failed to delete listing');
      }
    }
  };

  return (
    <>
      <div ref={menuRef} className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-label="Listing actions"
          className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors text-lg font-bold"
        >
          ···
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 min-w-[160px]">
            {canPause && (
              <button
                type="button"
                onClick={handlePause}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-medium transition-colors"
              >
                {t.pauseListing}
              </button>
            )}
            {canResume && (
              <button
                type="button"
                onClick={handleResume}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-medium transition-colors"
              >
                {t.resumeListing}
              </button>
            )}
            {canFill && (
              <button
                type="button"
                onClick={() => { setOpen(false); setPendingAction('fill'); }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-medium transition-colors"
              >
                {t.markAsFilled}
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => { setOpen(false); setPendingAction('delete'); }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-medium transition-colors"
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
          onCancel={() => setPendingAction(null)}
          isLoading={isLoading}
        />
      )}

      {/* Inline toast */}
      {toastMsg && (
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[160] pointer-events-none">
          <div className="bg-slate-800 text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-2xl">{toastMsg}</div>
        </div>
      )}
    </>
  );
}
