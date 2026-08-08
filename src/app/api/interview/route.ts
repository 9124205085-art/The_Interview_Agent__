import { NextResponse } from "next/server";
import { getCurriculum } from "@/lib/data";
import type { CandidateRecord } from "@/types/candidate";
import {
  continueInterviewSession,
  startInterviewSession,
} from "@/lib/interview/handleInterview";

type InterviewBody = {
  sessionId: string;
  candidate?: CandidateRecord;
  message?: string;
};

export async function POST(request: Request) {
  let body: InterviewBody;
  try {
    body = (await request.json()) as InterviewBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.sessionId?.trim()) {
    return NextResponse.json(
      { error: "sessionId is required" },
      { status: 400 },
    );
  }

  const curriculum = getCurriculum();

  if (body.candidate && !body.message) {
    const result = await startInterviewSession(
      body.sessionId,
      body.candidate,
      curriculum.days,
      curriculum.modules,
    );
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result);
  }

  if (body.message?.trim()) {
    const result = await continueInterviewSession(
      body.sessionId,
      body.message.trim(),
    );
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result);
  }

  return NextResponse.json(
    { error: "Provide candidate to start or message to continue" },
    { status: 400 },
  );
}
