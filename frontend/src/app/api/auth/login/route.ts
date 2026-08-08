import { NextResponse } from "next/server";
import { getCandidateById } from "@backend/lib/data";
import {
  CANDIDATE_SESSION_COOKIE,
  normalizeCandidateId,
} from "@backend/lib/session";

export async function POST(request: Request) {
  let body: { candidateId?: string };
  try {
    body = (await request.json()) as { candidateId?: string };
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const candidateId = body.candidateId?.trim();
  if (!candidateId) {
    return NextResponse.json(
      { error: "Candidate ID is required" },
      { status: 400 },
    );
  }

  const candidate = getCandidateById(candidateId);
  if (!candidate) {
    return NextResponse.json(
      { error: "No candidate found with that ID" },
      { status: 404 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    candidateId: candidate.member.id,
    name: candidate.member.name,
  });

  response.cookies.set(CANDIDATE_SESSION_COOKIE, normalizeCandidateId(candidate.member.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
