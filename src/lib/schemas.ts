import { z } from "zod";

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

export const RESUME_MIME_TYPES = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;

export const RESUME_EXTENSIONS = [".pdf", ".docx"] as const;

export const JD_MIN_CHARS = 200;
export const JD_MAX_CHARS = 15000;

// Below this, the extraction is treated as having failed (e.g. a scanned or
// two-column PDF that pdf-parse couldn't read cleanly). See SRS F2.4.
export const MIN_EXTRACTED_CHARS = 300;

export const extractResponseSchema = z.object({
  text: z.string(),
  chars: z.number(),
});

export type ExtractResponse = z.infer<typeof extractResponseSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export function resumeFileExtension(filename: string): "pdf" | "docx" | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  return null;
}

export function validateResumeFile(file: File): string | null {
  if (!resumeFileExtension(file.name)) {
    return "Only .pdf and .docx files are supported.";
  }
  if (file.size > MAX_RESUME_BYTES) {
    return `File too large — max ${MAX_RESUME_BYTES / (1024 * 1024)}MB.`;
  }
  return null;
}

export function validateJdText(text: string): string | null {
  if (text.length === 0) return null;
  if (text.length < JD_MIN_CHARS) {
    return `JD too short to analyze — paste at least ${JD_MIN_CHARS} characters (${text.length}/${JD_MIN_CHARS}).`;
  }
  if (text.length > JD_MAX_CHARS) {
    return `JD too long — max ${JD_MAX_CHARS.toLocaleString()} characters (${text.length.toLocaleString()}/${JD_MAX_CHARS.toLocaleString()}).`;
  }
  return null;
}
