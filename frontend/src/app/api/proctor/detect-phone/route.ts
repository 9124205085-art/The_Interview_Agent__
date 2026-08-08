import { NextResponse } from "next/server";
import { detectPhoneInWebcamImage } from "@backend/lib/proctor/detectPhoneVision";

type Body = { imageBase64?: string };

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body.imageBase64?.trim();
  if (!raw) {
    return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
  }

  if (raw.length > 900_000) {
    return NextResponse.json({ error: "Image too large" }, { status: 413 });
  }

  try {
    const phone = await detectPhoneInWebcamImage(raw);
    return NextResponse.json({ phone, source: "vision" });
  } catch {
    return NextResponse.json({ phone: false, source: "vision" });
  }
}
