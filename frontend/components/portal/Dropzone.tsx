"use client";

import { DragEvent, useRef, useState } from "react";
import { FileText, ImagePlus, X } from "lucide-react";

type DropzoneProps = {
  previewUrl?: string;
  files?: File[];
  onFile?: (file: File, previewUrl: string) => void;
  onFiles?: (files: File[]) => void;
  onClear?: () => void;
  label?: string;
  hint?: string;
  accept?: string;
  multiple?: boolean;
  variant?: "image" | "document";
};

export function Dropzone({
  previewUrl,
  files = [],
  onFile,
  onFiles,
  onClear,
  label,
  hint,
  accept,
  multiple = false,
  variant = "image",
}: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const isImage = variant === "image";
  const resolvedLabel =
    label ??
    (isImage
      ? multiple
        ? "Glissez des images ou cliquez pour parcourir"
        : "Glissez une image ou cliquez pour parcourir"
      : "Glissez vos documents ou cliquez pour parcourir");
  const resolvedHint = hint ?? (isImage ? "JPG, PNG ou WEBP" : "PDF, images ou documents officiels");
  const resolvedAccept = accept ?? (isImage ? "image/*" : ".pdf,image/*,.doc,.docx");

  function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    const incoming = Array.from(list);
    if (multiple) {
      onFiles?.([...files, ...incoming]);
      return;
    }
    const file = incoming[0];
    if (file.type.startsWith("image/")) {
      onFile?.(file, URL.createObjectURL(file));
    } else {
      onFile?.(file, "");
    }
    onFiles?.([file]);
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragOver(false);
    handleFiles(event.dataTransfer.files);
  }

  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`grid min-h-36 w-full place-items-center rounded-3xl border-2 border-dashed p-4 text-center transition-all duration-300 ${
          dragOver ? "border-brand-500 bg-brand-50 dark:bg-brand-900/40" : "border-lilac/50 bg-white/60 dark:bg-white/5"
        }`}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Aperçu du fichier" className="h-36 w-full rounded-2xl object-cover" />
        ) : (
          <div>
            {isImage ? (
              <ImagePlus className="mx-auto h-8 w-8 text-brand-500" />
            ) : (
              <FileText className="mx-auto h-8 w-8 text-brand-500" />
            )}
            <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{resolvedLabel}</p>
            <p className="mt-1 text-xs text-slate-400">{resolvedHint}</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={resolvedAccept}
          multiple={multiple}
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
      </button>
      {previewUrl && onClear ? (
        <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={onClear}>
          Retirer l'image
        </button>
      ) : null}
      {files.length > 0 ? (
        <ul className="grid gap-2">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2 text-sm dark:bg-white/10">
              <span className="truncate font-semibold">{file.name}</span>
              {onFiles ? (
                <button
                  type="button"
                  className="text-rose-500"
                  aria-label={`Retirer ${file.name}`}
                  onClick={() => onFiles(files.filter((_, current) => current !== index))}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
