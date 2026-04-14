'use client';

import React from 'react';

interface ConfirmModalProps {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ConfirmModal({
  title,
  body,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4 animate-in zoom-in-95 fade-in duration-200">
        <h3 className="text-base font-black text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600">{body}</p>
        <div className="flex gap-3 mt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 py-3 rounded-2xl font-black text-sm text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg ${
              danger
                ? 'bg-red-600 hover:bg-red-700 shadow-red-100/50'
                : 'bg-cyan-600 hover:bg-cyan-700 shadow-cyan-100/50'
            }`}
          >
            {isLoading && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
