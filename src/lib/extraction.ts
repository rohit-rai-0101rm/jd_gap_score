import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { MAX_RESUME_BYTES, MIN_EXTRACTED_CHARS, resumeFileExtension } from "@/lib/schemas";

export class ResumeExtractionError extends Error {
  constructor(
    public readonly code:
      | "UNSUPPORTED_FILE_TYPE"
      | "FILE_TOO_LARGE"
      | "EXTRACTION_FAILED"
      | "UNREADABLE_RESUME",
    message: string,
  ) {
    super(message);
    this.name = "ResumeExtractionError";
  }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

// Extracts and validates resume text per SRS F2. Throws ResumeExtractionError
// with a code + user-facing message on any failure.
export async function extractResumeText(file: File): Promise<string> {
  const extension = resumeFileExtension(file.name);
  if (!extension) {
    throw new ResumeExtractionError(
      "UNSUPPORTED_FILE_TYPE",
      "Only .pdf and .docx files are supported.",
    );
  }

  if (file.size > MAX_RESUME_BYTES) {
    throw new ResumeExtractionError(
      "FILE_TOO_LARGE",
      "File is too large. Maximum size is 5 MB.",
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let text: string;
  try {
    text = extension === "pdf" ? await extractPdfText(buffer) : await extractDocxText(buffer);
  } catch {
    throw new ResumeExtractionError(
      "EXTRACTION_FAILED",
      "We couldn't read this file. Please try a different file.",
    );
  }

  const trimmed = text.trim();

  if (trimmed.length < MIN_EXTRACTED_CHARS) {
    const message =
      extension === "pdf"
        ? "We couldn't read this PDF cleanly — please upload a DOCX or a text-based PDF."
        : "We couldn't extract readable text from this file. Please try a different file.";
    throw new ResumeExtractionError("UNREADABLE_RESUME", message);
  }

  return trimmed;
}
