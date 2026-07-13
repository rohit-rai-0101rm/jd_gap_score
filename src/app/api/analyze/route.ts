import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { extractResumeText, ResumeExtractionError } from "@/lib/extraction";
import { completeJSON, LlmJsonParseError } from "@/lib/llm";
import {
  ANALYSIS_SYSTEM_PROMPT,
  EXTRACTION_SYSTEM_PROMPT,
  buildAnalysisPrompt,
  buildExtractionPrompt,
} from "@/lib/prompts";
import {
  extractionResultSchema,
  llmAnalysisSchema,
  scoreBand,
  validateJdText,
  type AnalyzeResponse,
  type ApiError,
} from "@/lib/schemas";
import { analysisStorage } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

const HARD_TIMEOUT_MS = 60_000;

class AnalysisTimeoutError extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new AnalysisTimeoutError(`Analysis timed out after ${ms}ms`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function errorResponse(code: string, message: string, status: number) {
  const body: ApiError = { error: { code, message } };
  return NextResponse.json(body, { status });
}

async function runAnalysisPipeline(
  resumeText: string,
  jdText: string,
): Promise<AnalyzeResponse> {
  const extraction = await completeJSON({
    systemPrompt: EXTRACTION_SYSTEM_PROMPT,
    prompt: buildExtractionPrompt(resumeText, jdText),
    schema: extractionResultSchema,
  });

  const llmAnalysis = await completeJSON({
    systemPrompt: ANALYSIS_SYSTEM_PROMPT,
    prompt: buildAnalysisPrompt(
      resumeText,
      jdText,
      JSON.stringify(extraction.resume),
      JSON.stringify(extraction.jd),
    ),
    schema: llmAnalysisSchema,
  });

  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    extraction,
    analysis: { ...llmAnalysis, band: scoreBand(llmAnalysis.match_score) },
  };
}

export async function POST(request: Request) {
  // TODO(Phase 5): enforce quota + rate limits here, before any LLM call —
  // see SRS F5/F7 and the CLAUDE.md hard rule.

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("INVALID_REQUEST", "Expected multipart form data.", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return errorResponse("MISSING_FILE", "No resume file was provided.", 400);
  }

  const jd = formData.get("jd");
  if (typeof jd !== "string" || jd.length === 0) {
    return errorResponse("MISSING_JD", "No job description was provided.", 400);
  }
  const jdError = validateJdText(jd);
  if (jdError) {
    return errorResponse("INVALID_JD", jdError, 400);
  }

  let resumeText: string;
  try {
    resumeText = await extractResumeText(file);
  } catch (err) {
    if (err instanceof ResumeExtractionError) {
      const status =
        err.code === "UNSUPPORTED_FILE_TYPE" || err.code === "FILE_TOO_LARGE" ? 400 : 422;
      return errorResponse(err.code, err.message, status);
    }
    return errorResponse(
      "EXTRACTION_FAILED",
      "We couldn't read this file. Please try a different file.",
      422,
    );
  }

  try {
    const result = await withTimeout(runAnalysisPipeline(resumeText, jd), HARD_TIMEOUT_MS);
    await analysisStorage.save(result);
    return NextResponse.json(result satisfies AnalyzeResponse);
  } catch (err) {
    if (err instanceof AnalysisTimeoutError) {
      return errorResponse(
        "ANALYSIS_TIMEOUT",
        "This is taking longer than expected. Please try again.",
        504,
      );
    }
    if (err instanceof LlmJsonParseError) {
      return errorResponse(
        "ANALYSIS_FAILED",
        "We couldn't complete the analysis. Please try again.",
        502,
      );
    }
    return errorResponse("ANALYSIS_FAILED", "Something went wrong. Please try again.", 500);
  }
}
