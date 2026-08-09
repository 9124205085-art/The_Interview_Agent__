/** Vision API fallback when on-device COCO-SSD is unavailable. */
export async function detectPhoneInWebcamImage(
  imageBase64: string,
): Promise<boolean> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) return false;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0,
      max_tokens: 80,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "This is a proctoring webcam frame during an online exam.",
                "Is a handheld mobile phone or smartphone visible anywhere in this webcam frame?",
                "Include phones held near the face, beside the head, or toward the camera (screen or back).",
                "Do NOT count only laptops, desktop monitors, or wall posters.",
                'Reply with JSON only: {"phoneVisible":boolean,"confidence":number between 0 and 1}',
              ].join(" "),
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) return false;

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return false;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      phoneVisible?: boolean;
      confidence?: number;
    };
    return (
      parsed.phoneVisible === true &&
      typeof parsed.confidence === "number" &&
      parsed.confidence >= 0.5
    );
  } catch {
    return false;
  }
}
