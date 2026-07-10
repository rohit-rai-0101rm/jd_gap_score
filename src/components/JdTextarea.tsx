"use client";

import { JD_MAX_CHARS, validateJdText } from "@/lib/schemas";

interface JdTextareaProps {
  value: string;
  onChange: (value: string) => void;
}

// Keys that edit/navigate rather than insert a character — allowed even
// though the field is paste-only per SRS F2.2.
const ALLOWED_KEYS = new Set([
  "Backspace",
  "Delete",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "Tab",
]);

export default function JdTextarea({ value, onChange }: JdTextareaProps) {
  const error = validateJdText(value);

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.metaKey || e.ctrlKey || ALLOWED_KEYS.has(e.key)) return;
          e.preventDefault();
        }}
        placeholder="Paste the full job description here..."
        rows={12}
        className="w-full rounded-2xl border border-black/15 bg-transparent p-4 text-sm outline-none focus:border-foreground dark:border-white/15"
      />
      <div className="mt-1 text-sm">
        <span className={error ? "text-red-600" : "text-zinc-500"}>
          {error ??
            `${value.length.toLocaleString()} / ${JD_MAX_CHARS.toLocaleString()} characters`}
        </span>
      </div>
    </div>
  );
}
