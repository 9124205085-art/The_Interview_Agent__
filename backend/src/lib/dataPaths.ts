import path from "path";
import { existsSync } from "fs";

/** Resolve repo `data/` whether Next.js cwd is `frontend/` or monorepo root. */
export function getRepoDataDir(): string {
  const markerFiles = ["candidates.json", "interview-scores.json"];
  const tryDirs = [
    path.join(process.cwd(), "data"),
    path.join(process.cwd(), "..", "data"),
    path.join(__dirname, "..", "..", "..", "data"),
  ];
  for (const dir of tryDirs) {
    if (markerFiles.some((f) => existsSync(path.join(dir, f)))) {
      return dir;
    }
  }
  return path.join(process.cwd(), "..", "data");
}
