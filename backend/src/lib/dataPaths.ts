import path from "path";
import { existsSync } from "fs";

/** Resolve repo `data/` (Render cwd is usually repo root; locally may be `frontend/`). */
export function getRepoDataDir(): string {
  const marker = "candidates.json";
  const cwdData = path.join(process.cwd(), "data");
  if (existsSync(path.join(cwdData, marker))) {
    return cwdData;
  }
  const parentData = path.join(process.cwd(), "..", "data");
  if (existsSync(path.join(parentData, marker))) {
    return parentData;
  }
  return cwdData;
}
