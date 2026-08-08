import { NextResponse } from "next/server";
import { CANDIDATE_SESSION_COOKIE } from "@backend/lib/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CANDIDATE_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
