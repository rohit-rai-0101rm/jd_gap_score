import { NextResponse } from "next/server";
import { extractResumeText, ResumeExtractionError } from "@/lib/extraction";
import type { ApiError } from "@/lib/schemas";

export const runtime = "nodejs";

function errorResponse(code: string, message: string, status: number) {
  const body: ApiError = { error: { code, message } };
  return NextResponse.json(body, { status });
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

  try {
    const text = await extractResumeText(file);
    return NextResponse.json({ text, chars: text.length });
  } catch (err) {
    if (err instanceof ResumeExtractionError) {
      const status = err.code === "UNSUPPORTED_FILE_TYPE" || err.code === "FILE_TOO_LARGE" ? 400 : 422;
      return errorResponse(err.code, err.message, status);
    }
    return errorResponse(
      "EXTRACTION_FAILED",
      "We couldn't read this file. Please try a different file.",
      422,
    );
  }
}
