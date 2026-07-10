"use client";

import { useCallback, useRef, useState } from "react";
import { MAX_RESUME_BYTES, validateResumeFile } from "@/lib/schemas";

const MAX_RESUME_MB = MAX_RESUME_BYTES / (1024 * 1024);

interface ResumeDropzoneProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  error: string | null;
  onErrorChange: (error: string | null) => void;
}

export default function ResumeDropzone({
  file,
  onFileChange,
  error,
  onErrorChange,
}: ResumeDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (selected: File | null) => {
      if (!selected) {
        onFileChange(null);
        onErrorChange(null);
        return;
      }
      const validationError = validateResumeFile(selected);
      if (validationError) {
        onFileChange(null);
        onErrorChange(validationError);
        return;
      }
      onFileChange(selected);
      onErrorChange(null);
    },
    [onFileChange, onErrorChange],
  );

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragActive(false);
          handleFile(e.dataTransfer.files?.[0] ?? null);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          isDragActive
            ? "border-foreground bg-zinc-50 dark:bg-zinc-900"
            : "border-black/15 dark:border-white/15"
        }`}
      >
        <p className="font-medium">
          {file ? file.name : "Drag & drop your resume here"}
        </p>
        <p className="text-sm text-zinc-500">
          {file
            ? `${(file.size / 1024).toFixed(0)} KB`
            : `or click to browse — .pdf or .docx, max ${MAX_RESUME_MB}MB`}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {file && (
        <button
          type="button"
          onClick={() => handleFile(null)}
          className="mt-2 text-sm text-zinc-500 underline"
        >
          Remove file
        </button>
      )}
    </div>
  );
}
