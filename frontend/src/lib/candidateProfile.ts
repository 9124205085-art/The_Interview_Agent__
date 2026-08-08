import type { CandidateRecord } from "@backend/types/candidate";

export type ProfileSection = {
  personalInformation: { label: string; value: string }[];
  wellFocusedAreas: string[];
  strengths: string[];
};

const ROLE_FOCUS: Record<string, string[]> = {
  default: [
    "LLM applications & prompt engineering",
    "Retrieval-augmented generation (RAG)",
    "Production-ready AI deployments",
  ],
};

function focusFromRole(jobRole: string): string[] {
  const role = jobRole.toLowerCase();
  if (role.includes("data")) {
    return [
      "Data pipelines & structured analytics",
      "Embeddings & vector search systems",
      "Scalable ETL for AI workloads",
    ];
  }
  if (role.includes("backend") || role.includes("software")) {
    return [
      "API design & backend integration",
      "Streaming LLM responses",
      "Agent orchestration & MCP tooling",
    ];
  }
  if (role.includes("ai") || role.includes("machine learning")) {
    return [
      "End-to-end RAG architectures",
      "Fine-tuning & evaluation workflows",
      "Multi-agent AI systems",
    ];
  }
  if (role.includes("devops") || role.includes("ops")) {
    return [
      "Containerization & Kubernetes",
      "Observability for AI services",
      "Secure deployment pipelines",
    ];
  }
  if (role.includes("analyst") || role.includes("marketing")) {
    return [
      "Translating business needs into AI solutions",
      "User-facing chatbot experiences",
      "Data literacy for AI decision-making",
    ];
  }
  if (role.includes("intern") || role.includes("student")) {
    return [
      "Foundational Python & tooling",
      "Hands-on LLM project delivery",
      "Full-stack AI application builds",
    ];
  }
  return ROLE_FOCUS.default;
}

export function cartoonAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
}

export function buildCandidateProfile(
  candidate: CandidateRecord,
): ProfileSection {
  const { member, missions, signals } = candidate;

  const firstTryTitles = missions
    .filter((m) => m.passed && m.attempts === 1)
    .map((m) => m.title);

  const strengths: string[] = [];
  if (firstTryTitles.length > 0) {
    for (const title of firstTryTitles.slice(0, 4)) {
      strengths.push(`First-try mastery in ${title}`);
    }
  }
  if (signals.missionsFirstTry >= 15) {
    strengths.push("High consistency under timed mission assessments");
  } else if (signals.missionsFirstTry >= 8) {
    strengths.push("Solid execution with growing first-attempt accuracy");
  } else {
    strengths.push("Persistence and improvement across repeated attempts");
  }
  strengths.push(
    `${member.yearsExperience}+ years of experience as ${member.jobRole}`,
  );

  const missionThemes = missions
    .filter((m) => m.passed)
    .map((m) => m.title)
    .slice(0, 3);

  const wellFocusedAreas = [
    ...focusFromRole(member.jobRole),
    ...missionThemes.map((t) => `Applied learning: ${t}`),
  ].slice(0, 5);

  const personalInformation = [
    { label: "Full name", value: member.name },
    { label: "Candidate ID", value: member.id },
    { label: "Job role", value: member.jobRole },
    { label: "Education", value: member.education },
    {
      label: "Years of experience",
      value: String(member.yearsExperience),
    },
    { label: "Cohort status", value: member.status },
  ];

  return { personalInformation, wellFocusedAreas, strengths };
}
