"use client";

import { useState } from "react";
import ResumeDropzone from "@/components/ResumeDropzone";
import JdTextarea from "@/components/JdTextarea";
import { apiErrorSchema, extractResponseSchema, validateJdText } from "@/lib/schemas";

type ExtractState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; chars: number }
  | { status: "error"; message: string };

export default function AnalyzePage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [jd, setJd] = useState("");
  const [extractState, setExtractState] = useState<ExtractState>({ status: "idle" });

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
        disabled
        title={
          canContinue
            ? "Inputs look good — the analysis engine ships in Phase 3."
            : undefined
        }
        className="rounded-full bg-foreground px-6 py-3 text-base font-medium text-background disabled:cursor-not-allowed disabled:opacity-40"
      >
        Analyze — coming in Phase 3
      </button>
    </div>
  );
}
