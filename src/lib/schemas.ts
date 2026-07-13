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

// --- SRS F3: analysis engine ---

export const resumeFactsSchema = z.object({
  skills: z.array(z.string()),
  roles: z.array(z.string()),
  achievements: z.array(z.string()),
  keywords: z.array(z.string()),
  years_of_experience: z.number(),
});
export type ResumeFacts = z.infer<typeof resumeFactsSchema>;

export const jdFactsSchema = z.object({
  must_have_requirements: z.array(z.string()),
  nice_to_have: z.array(z.string()),
  seniority: z.string(),
  keywords: z.array(z.string()),
});
export type JdFacts = z.infer<typeof jdFactsSchema>;

export const extractionResultSchema = z.object({
  resume: resumeFactsSchema,
  jd: jdFactsSchema,
});
export type ExtractionResult = z.infer<typeof extractionResultSchema>;

export const gapSchema = z.object({
  jd_requirement: z.string(),
  evidence_in_resume: z.string(),
  severity: z.enum(["high", "medium", "low"]),
  why_it_matters: z.string(),
});
export type Gap = z.infer<typeof gapSchema>;

export const rewrittenBulletSchema = z.object({
  addresses_gap: z.string(),
  bullet: z.string(),
});
export type RewrittenBullet = z.infer<typeof rewrittenBulletSchema>;

export const llmAnalysisSchema = z.object({
  match_score: z.number().min(0).max(100),
  gaps: z.array(gapSchema).min(1),
  rewritten_bullets: z.array(rewrittenBulletSchema).min(3).max(5),
});
export type LlmAnalysis = z.infer<typeof llmAnalysisSchema>;

export const SCORE_BANDS = {
  strong: "Strong match",
  competitive: "Competitive",
  borderline: "Borderline",
  filtered: "Likely filtered out",
} as const;
export type ScoreBand = (typeof SCORE_BANDS)[keyof typeof SCORE_BANDS];

export function scoreBand(score: number): ScoreBand {
  if (score >= 85) return SCORE_BANDS.strong;
  if (score >= 70) return SCORE_BANDS.competitive;
  if (score >= 50) return SCORE_BANDS.borderline;
  return SCORE_BANDS.filtered;
}

export const analysisResultSchema = llmAnalysisSchema.extend({
  band: z.enum([
    SCORE_BANDS.strong,
    SCORE_BANDS.competitive,
    SCORE_BANDS.borderline,
    SCORE_BANDS.filtered,
  ]),
});
export type AnalysisResult = z.infer<typeof analysisResultSchema>;

export const analyzeResponseSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  extraction: extractionResultSchema,
  analysis: analysisResultSchema,
});
export type AnalyzeResponse = z.infer<typeof analyzeResponseSchema>;
