import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AnalyzeResponse } from "@/lib/schemas";

export interface AnalysisStorage {
  save(record: AnalyzeResponse): Promise<void>;
  get(id: string): Promise<AnalyzeResponse | null>;
}

const DATA_DIR = path.join(process.cwd(), ".data", "analyses");

class FileAnalysisStorage implements AnalysisStorage {
  async save(record: AnalyzeResponse): Promise<void> {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(
      path.join(DATA_DIR, `${record.id}.json`),
      JSON.stringify(record, null, 2),
      "utf-8",
    );
  }

  async get(id: string): Promise<AnalyzeResponse | null> {
    try {
      const raw = await readFile(path.join(DATA_DIR, `${id}.json`), "utf-8");
      return JSON.parse(raw) as AnalyzeResponse;
    } catch {
      return null;
    }
  }
}

// Swap this for a Supabase-backed implementation in Phase 5 — every caller
// goes through this interface, so that's the only line that needs to change.
export const analysisStorage: AnalysisStorage = new FileAnalysisStorage();
