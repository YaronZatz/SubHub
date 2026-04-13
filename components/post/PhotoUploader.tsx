'use client';

import React, { useRef } from 'react';

interface PhotoUploaderProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  /** Max number of photos allowed (default 5) */
  maxPhotos?: number;
  error?: string | null;
  onError?: (msg: string) => void;
  /** Label shown above the upload area */
  label?: string;
  subtitle?: string;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        const MAX_DIM = 1200;
        if (w > h) {
          if (w > MAX_DIM) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM; }
        } else {
          if (h > MAX_DIM) { w = Math.round(w * MAX_DIM / h); h = MAX_DIM; }
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function PhotoUploader({
  photos,
  onChange,
  maxPhotos = 5,
  error,
  onError,
  label,
  subtitle,
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remaining = maxPhotos - photos.length;
    if (remaining <= 0) {
      onError?.(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    const accepted: File[] = [];
    let sizeError = false;

    Array.from(files).slice(0, remaining).forEach((file) => {
      if (!ACCEPTED_TYPES.includes(file.type)) return; // silently reject invalid type
      if (file.size > MAX_FILE_SIZE_BYTES) { sizeError = true; return; }
      accepted.push(file);
    });

    if (sizeError) onError?.('One or more photos exceed the 5MB size limit');

    if (photos.length + accepted.length > maxPhotos) {
      onError?.(`Maximum ${maxPhotos} photos allowed`);
    }

    const newBase64s: string[] = [];
    for (const file of accepted.slice(0, remaining)) {
      try {
        newBase64s.push(await compressImage(file));
      } catch {
        // skip unprocessable files
      }
    }
    onChange([...photos, ...newBase64s]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-baseline justify-between">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {label}
          </label>
          {subtitle && <span className="text-[9px] text-slate-400">{subtitle}</span>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {photos.map((src, i) => (
          <div
            key={i}
            className="relative w-20 h-20 rounded-xl overflow-hidden shadow-sm bg-slate-100 group shrink-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removePhoto(i)}
              className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center text-xs leading-none hover:bg-black/80 transition-colors"
              aria-label="Remove photo"
            >
              ×
            </button>
          </div>
        ))}

        {photos.length < maxPhotos && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-20 h-20 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-cyan-400 hover:text-cyan-500 transition-all bg-slate-50/50 shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="text-[9px] font-bold uppercase tracking-widest">Add</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && (
        <p className="text-[11px] text-red-500 font-semibold">{error}</p>
      )}
    </div>
  );
}
