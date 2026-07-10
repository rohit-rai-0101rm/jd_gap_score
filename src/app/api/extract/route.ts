import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import {
  MAX_RESUME_BYTES,
  MIN_EXTRACTED_CHARS,
  resumeFileExtension,
  type ApiError,
} from "@/lib/schemas";

export const runtime = "nodejs";

function errorResponse(code: string, message: string, status: number) {
  const body: ApiError = { error: { code, message } };
  return NextResponse.json(body, { status });
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

export async function POST(request: Request) {
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

  const extension = resumeFileExtension(file.name);
  if (!extension) {
    return errorResponse(
      "UNSUPPORTED_FILE_TYPE",
      "Only .pdf and .docx files are supported.",
      400,
    );
  }

  if (file.size > MAX_RESUME_BYTES) {
    return errorResponse(
      "FILE_TOO_LARGE",
      "File is too large. Maximum size is 5 MB.",
      400,
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let text: string;
  try {
    text = extension === "pdf" ? await extractPdfText(buffer) : await extractDocxText(buffer);
  } catch {
    return errorResponse(
      "EXTRACTION_FAILED",
      "We couldn't read this file. Please try a different file.",
      422,
    );
  }

  const trimmed = text.trim();

  if (trimmed.length < MIN_EXTRACTED_CHARS) {
    const message =
      extension === "pdf"
        ? "We couldn't read this PDF cleanly — please upload a DOCX or a text-based PDF."
        : "We couldn't extract readable text from this file. Please try a different file.";
    return errorResponse("UNREADABLE_RESUME", message, 422);
  }

  return NextResponse.json({ text: trimmed, chars: trimmed.length });
}
