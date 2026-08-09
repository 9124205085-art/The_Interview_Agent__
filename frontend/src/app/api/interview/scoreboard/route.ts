import { NextResponse } from "next/server";
import { buildInterviewScoreboard } from "@backend/lib/interviewResults";
import { requireCandidate } from "@/lib/requireCandidate";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireCandidate();
  const entries = buildInterviewScoreboard();
  return NextResponse.json({ entries });
}
