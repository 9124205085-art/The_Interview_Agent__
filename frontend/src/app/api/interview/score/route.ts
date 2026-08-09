import { NextResponse } from "next/server";
import { getInterviewResult } from "@backend/lib/interviewResults";
import { requireCandidate } from "@/lib/requireCandidate";

export const dynamic = "force-dynamic";

export async function GET() {
  const candidate = await requireCandidate();
  const result = getInterviewResult(candidate.member.id);
  return NextResponse.json({ result: result ?? null });
}
