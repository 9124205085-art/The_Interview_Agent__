import type { InterviewQuestionScore } from "../../types/interview";

function heuristicQuestionScore(
  question: string,
  answer: string,
): InterviewQuestionScore {
  const text = answer.trim();
  const len = text.length;
  const words = text.split(/\s+/).filter(Boolean).length;

  let accuracy = 35;
  if (len >= 40) accuracy += 15;
  if (len >= 120) accuracy += 20;
  if (len >= 250) accuracy += 15;
  if (/\b(because|therefore|for example|such as)\b/i.test(text)) accuracy += 10;

  let depth = 30;
  if (words >= 25) depth += 15;
  if (words >= 60) depth += 20;
  if (/\b(trade-off|architecture|implement|deploy|evaluate|security)\b/i.test(text)) {
    depth += 15;
  }
  if (/\b(RAG|LLM|embedding|vector|API|agent|MCP)\b/i.test(text)) depth += 10;

  let context = 35;
  if (question.length > 0 && text.length > 20) context += 20;
  if (/\b(module|day|project|cohort|mission)\b/i.test(text)) context += 10;
  if (len >= 80) context += 15;

  const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));
  const accuracyC = clamp(accuracy);
  const depthC = clamp(depth);
  const contextC = clamp(context);
  return {
    questionId: "",
    accuracy: accuracyC,
    depth: depthC,
    context: contextC,
    composite: Math.round((accuracyC + depthC + contextC) / 3),
  };
}

export async function scoreInterviewAnswer(
  questionId: string,
  question: string,
  answer: string,
  jobRole: string,
): Promise<InterviewQuestionScore> {
  const fallback = heuristicQuestionScore(question, answer);
  fallback.questionId = questionId;

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
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'Score the candidate answer for a technical interview. Return JSON only: {"accuracy":number,"depth":number,"context":number} where each is 0-100. accuracy=correctness/relevance, depth=technical detail, context=communication & situational fit. Be fair; short but correct answers can score 60+.',
          },
          {
            role: "user",
            content: JSON.stringify({ jobRole, question, answer }),
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
      accuracy?: number;
      depth?: number;
      context?: number;
    };
    const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));
    const accuracy = clamp(parsed.accuracy ?? fallback.accuracy);
    const depth = clamp(parsed.depth ?? fallback.depth);
    const context = clamp(parsed.context ?? fallback.context);
    return {
      questionId,
      accuracy,
      depth,
      context,
      composite: Math.round((accuracy + depth + context) / 3),
    };
  } catch {
    return fallback;
  }
}

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

export async function generateFollowUpQuestion(input: {
  candidateName: string;
  jobRole: string;
  day: number;
  dayTitle: string;
  moduleTitle: string;
  objectives?: string[];
  tools?: string[];
  previousQuestion: string;
  previousAnswer: string;
  fallback: string;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return input.fallback;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.65,
        max_tokens: 160,
        messages: [
          {
            role: "system",
            content:
              "You are a senior technical interviewer in an AI engineering cohort. Ask ONE follow-up question that references something specific the candidate said in their previous answer (quote or paraphrase a phrase). Probe implementation detail, trade-offs, or evaluation—not a generic new topic. Under 55 words. No numbering or labels.",
          },
          {
            role: "user",
            content: JSON.stringify({
              candidateName: input.candidateName,
              jobRole: input.jobRole,
              cohortDay: input.day,
              dayTitle: input.dayTitle,
              module: input.moduleTitle,
              objectives: input.objectives?.slice(0, 2),
              tools: input.tools?.slice(0, 3),
              previousQuestion: input.previousQuestion,
              previousAnswer: input.previousAnswer,
            }),
          },
        ],
      }),
    });
    if (!res.ok) return input.fallback;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text && text.length > 20 ? text : input.fallback;
  } catch {
    return input.fallback;
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
