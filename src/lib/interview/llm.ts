export async function personalizeQuestion(
  template: string,
  context: string,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return template;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 180,
        messages: [
          {
            role: "system",
            content:
              "You are a technical interviewer. Rephrase the given template into one clear spoken interview question. Keep it under 45 words. Do not add numbering or labels.",
          },
          {
            role: "user",
            content: `Context: ${context}\nTemplate: ${template}`,
          },
        ],
      }),
    });
    if (!res.ok) return template;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text || template;
  } catch {
    return template;
  }
}

export async function briefAcknowledgment(
  question: string,
  answer: string,
  candidateName: string,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const snippet = answer.trim().slice(0, 80);
    return snippet.length > 20
      ? `Thanks, ${candidateName}. I noted your points on that.`
      : `Thanks, ${candidateName}. Feel free to add more detail if you'd like.`;
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.5,
        max_tokens: 80,
        messages: [
          {
            role: "system",
            content:
              "Give a one-sentence spoken acknowledgment of the candidate's interview answer. Be encouraging and professional. Max 25 words.",
          },
          {
            role: "user",
            content: `Question: ${question}\nAnswer: ${answer}\nCandidate: ${candidateName}`,
          },
        ],
      }),
    });
    if (!res.ok) {
      return `Thank you, ${candidateName}. Let's continue.`;
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return (
      data.choices?.[0]?.message?.content?.trim() ??
      `Thank you, ${candidateName}. Let's continue.`
    );
  } catch {
    return `Thank you, ${candidateName}. Let's continue.`;
  }
}

export async function buildFinalFeedback(
  candidateName: string,
  jobRole: string,
  qa: { question: string; answer: string }[],
): Promise<{
  summary: string;
  strengths: string[];
  gaps: string[];
  next: string[];
}> {
  const fallback = buildFallbackFeedback(candidateName, jobRole, qa);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallback;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'Return JSON only: {"summary":string,"strengths":string[],"gaps":string[],"next":string[]}. Concise actionable bullets.',
          },
          {
            role: "user",
            content: JSON.stringify({ candidateName, jobRole, qa }),
          },
        ],
      }),
    });
    if (!res.ok) return fallback;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as {
      summary?: string;
      strengths?: string[];
      gaps?: string[];
      next?: string[];
    };
    return {
      summary: parsed.summary ?? fallback.summary,
      strengths: parsed.strengths?.length ? parsed.strengths : fallback.strengths,
      gaps: parsed.gaps?.length ? parsed.gaps : fallback.gaps,
      next: parsed.next?.length ? parsed.next : fallback.next,
    };
  } catch {
    return fallback;
  }
}

function buildFallbackFeedback(
  candidateName: string,
  jobRole: string,
  qa: { question: string; answer: string }[],
) {
  const avgLen =
    qa.reduce((s, x) => s + x.answer.trim().length, 0) / Math.max(qa.length, 1);
  const strengths = [
    `${candidateName} engaged across ${qa.length} personalized module-based questions.`,
    avgLen > 120
      ? "Answers showed willingness to explain technical detail."
      : "Responses were concise and on-topic.",
  ];
  const gaps =
    avgLen < 80
      ? ["Expand answers with examples, metrics, and trade-offs."]
      : ["Deepen system-design reasoning on deployment and evaluation topics."];
  return {
    summary: `Interview complete for ${candidateName} (${jobRole}). Review focused on four completed cohort days with eight dynamic questions.`,
    strengths,
    gaps,
    next: [
      "Revisit module objectives you skipped or passed on retry.",
      "Practice aloud using both voice and text before the next session.",
    ],
  };
}
