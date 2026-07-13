"use client";

import { useState } from "react";
import ResumeDropzone from "@/components/ResumeDropzone";
import JdTextarea from "@/components/JdTextarea";
import {
  analyzeResponseSchema,
  apiErrorSchema,
  extractResponseSchema,
  validateJdText,
  type AnalyzeResponse,
} from "@/lib/schemas";

type ExtractState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; chars: number }
  | { status: "error"; message: string };

type AnalyzeState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; result: AnalyzeResponse }
  | { status: "error"; message: string };

export default function AnalyzePage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [jd, setJd] = useState("");
  const [extractState, setExtractState] = useState<ExtractState>({ status: "idle" });
  const [analyzeState, setAnalyzeState] = useState<AnalyzeState>({ status: "idle" });

  const jdError = validateJdText(jd);
  const canContinue =
    !!file && !fileError && extractState.status === "success" && jd.length > 0 && !jdError;

  async function handleFileChange(next: File | null) {
    setFile(next);
    setExtractState({ status: "idle" });
    if (!next) return;

    setExtractState({ status: "loading" });
    const formData = new FormData();
    formData.append("file", next);

    try {
      const res = await fetch("/api/extract", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        const parsed = apiErrorSchema.safeParse(json);
        setExtractState({
          status: "error",
          message: parsed.success
            ? parsed.data.error.message
            : "Something went wrong reading this file.",
        });
        return;
      }
      const parsed = extractResponseSchema.parse(json);
      setExtractState({ status: "success", chars: parsed.chars });
    } catch {
      setExtractState({
        status: "error",
        message: "Something went wrong reading this file.",
      });
    }
  }

  async function handleAnalyze() {
    if (!file || !canContinue) return;

    setAnalyzeState({ status: "loading" });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("jd", jd);

    try {
      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        const parsed = apiErrorSchema.safeParse(json);
        setAnalyzeState({
          status: "error",
          message: parsed.success
            ? parsed.data.error.message
            : "Something went wrong during analysis.",
        });
        return;
      }
      setAnalyzeState({ status: "success", result: analyzeResponseSchema.parse(json) });
    } catch {
      setAnalyzeState({
        status: "error",
        message: "Something went wrong during analysis.",
      });
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Score your resume</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Upload your resume and paste the job description you&apos;re applying to.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Resume
        </h2>
        <ResumeDropzone
          file={file}
          onFileChange={handleFileChange}
          error={fileError}
          onErrorChange={setFileError}
        />
        {extractState.status === "loading" && (
          <p className="mt-2 text-sm text-zinc-500">Reading resume…</p>
        )}
        {extractState.status === "success" && (
          <p className="mt-2 text-sm text-emerald-600">
            Extracted {extractState.chars.toLocaleString()} characters.
          </p>
        )}
        {extractState.status === "error" && (
          <p className="mt-2 text-sm text-red-600">{extractState.message}</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Job description
        </h2>
        <JdTextarea value={jd} onChange={setJd} />
      </section>

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={!canContinue || analyzeState.status === "loading"}
        className="rounded-full bg-foreground px-6 py-3 text-base font-medium text-background disabled:cursor-not-allowed disabled:opacity-40"
      >
        {analyzeState.status === "loading" ? "Analyzing… (up to a minute)" : "Analyze"}
      </button>

      {analyzeState.status === "error" && (
        <p className="text-sm text-red-600">{analyzeState.message}</p>
      )}

      {analyzeState.status === "success" && (
        <AnalysisPreview result={analyzeState.result} />
      )}
    </div>
  );
}

// Raw, unstyled preview of the analysis result — placeholder until the real
// Results UI (SRS F4) ships in Phase 4.
function AnalysisPreview({ result }: { result: AnalyzeResponse }) {
  const { analysis } = result;
  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-black/10 p-6 dark:border-white/10">
      <div>
        <p className="text-sm text-zinc-500">Phase 4 will replace this raw preview</p>
        <p className="text-3xl font-semibold">
          {analysis.match_score} <span className="text-lg font-normal">/ 100</span>
        </p>
        <p className="text-zinc-600 dark:text-zinc-400">{analysis.band}</p>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Gaps
        </h3>
        <ul className="flex flex-col gap-3">
          {analysis.gaps.map((gap, i) => (
            <li key={i} className="rounded-xl border border-black/10 p-3 text-sm dark:border-white/10">
              <p className="font-medium">
                {gap.jd_requirement}{" "}
                <span className="text-xs uppercase text-zinc-500">({gap.severity})</span>
              </p>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                Evidence: {gap.evidence_in_resume}
              </p>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">{gap.why_it_matters}</p>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Rewritten bullets
        </h3>
        <ul className="flex flex-col gap-3">
          {analysis.rewritten_bullets.map((b, i) => (
            <li key={i} className="rounded-xl border border-black/10 p-3 text-sm dark:border-white/10">
              <p>{b.bullet}</p>
              <p className="mt-1 text-xs text-zinc-500">Addresses: {b.addresses_gap}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
