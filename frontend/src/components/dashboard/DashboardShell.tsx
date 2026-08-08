"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import type {
  CandidateMember,
  CandidateMission,
  CandidateSignals,
  CurriculumDay,
  CurriculumModule,
} from "@backend/types/candidate";
import { InterviewOverviewCard } from "@/components/interview/InterviewOverviewCard";
import type { ProfileSection } from "@/lib/candidateProfile";
import { countModuleCompleted } from "@/lib/moduleTasks";
import { CandidateAvatar } from "@/components/CandidateAvatar";
import { LogoutButton } from "@/components/LogoutButton";
import { ModuleDailyTasks } from "@/components/dashboard/ModuleDailyTasks";
import { ProfileSkillsGraph } from "@/components/dashboard/ProfileSkillsGraph";
import { ProfileInterviewScore } from "@/components/dashboard/ProfileInterviewScore";
import { InterviewScoreboard } from "@/components/dashboard/InterviewScoreboard";
import { StatCard, StatMetricIcon } from "@/components/dashboard/StatCard";
import type { StoredInterviewResult } from "@backend/lib/interviewResults";

type View = "overview" | "profile" | "modules";

type DashboardShellProps = {
  member: CandidateMember;
  signals: CandidateSignals;
  missions: CandidateMission[];
  cohort: string;
  profile: ProfileSection;
  modules: CurriculumModule[];
  curriculumDays: CurriculumDay[];
  interviewResult: StoredInterviewResult | null;
  initialView?: View;
};

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
        active
          ? "bg-white/10 text-white"
          : "text-slate-300 hover:bg-white/5 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function ModuleNavButton({
  active,
  onClick,
  module,
  completed,
  total,
  compact,
}: {
  active: boolean;
  onClick: () => void;
  module: CurriculumModule;
  completed: number;
  total: number;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg text-left transition ${
        compact ? "px-3 py-2" : "px-3 py-2"
      } ${
        active
          ? "bg-white/10 text-white"
          : "text-slate-300 hover:bg-white/5 hover:text-white"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Module {module.n}
      </p>
      <p className="truncate text-sm font-medium leading-snug">{module.title}</p>
      {!compact ? (
        <p className="mt-0.5 text-[11px] text-slate-500">
          {completed}/{total} days completed
        </p>
      ) : null}
    </button>
  );
}

export function DashboardShell({
  member,
  signals,
  missions,
  cohort,
  profile,
  modules,
  curriculumDays,
  interviewResult,
  initialView = "overview",
}: DashboardShellProps) {
  const [view, setView] = useState<View>(initialView);
  const [selectedModuleN, setSelectedModuleN] = useState<number | null>(null);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  const selectedModule = selectedModuleN
    ? modules.find((m) => m.n === selectedModuleN)
    : undefined;

  function openModule(moduleN: number) {
    setSelectedModuleN(moduleN);
    setView("modules");
  }

  function openModulesMenu() {
    setView("modules");
  }

  return (
    <div className="flex min-h-screen bg-[#eef1f6]">
      <aside className="flex w-72 shrink-0 flex-col border-r border-slate-800/50 bg-[#0f172a] text-white">
        <div className="border-b border-white/10 px-5 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Interview Agent
          </p>
          <p className="mt-1 text-sm font-medium text-slate-200">
            Candidate portal
          </p>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden px-3 py-4">
          <NavButton
            active={view === "profile"}
            onClick={() => {
              setView("profile");
              setSelectedModuleN(null);
            }}
          >
            <span className="flex items-center justify-between gap-2">
              Profile
              {interviewResult ? (
                <span className="rounded-md bg-indigo-500/30 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-indigo-100">
                  {interviewResult.finalScore}/100
                </span>
              ) : null}
            </span>
          </NavButton>
          <NavButton
            active={view === "overview"}
            onClick={() => {
              setView("overview");
              setSelectedModuleN(null);
            }}
          >
            Overview
          </NavButton>
          <NavButton active={view === "modules"} onClick={openModulesMenu}>
            Modules
          </NavButton>

          {view === "modules" ? (
            <div className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto border-l border-white/10 pl-2 pr-1">
              {modules.map((module) => {
                const { completed, total } = countModuleCompleted(
                  module,
                  curriculumDays,
                  missions,
                );
                return (
                  <ModuleNavButton
                    key={module.n}
                    active={selectedModuleN === module.n}
                    onClick={() => openModule(module.n)}
                    module={module}
                    completed={completed}
                    total={total}
                    compact
                  />
                );
              })}
            </div>
          ) : null}
        </nav>

        <button
          type="button"
          onClick={() => setView("profile")}
          className="mx-3 mb-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/10"
        >
          <CandidateAvatar seed={member.id} name={member.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{member.name}</p>
            <p className="truncate text-xs text-slate-400">View profile</p>
          </div>
        </button>

        <div className="border-t border-white/10 px-4 py-4">
          <Link
            href="/login"
            className="mb-2 block text-center text-xs text-slate-400 hover:text-white"
          >
            Switch candidate
          </Link>
          <LogoutButton variant="sidebar" />
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white px-8 py-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-5">
            <CandidateAvatar seed={member.id} name={member.name} size="lg" />
            <div>
              <p className="text-sm font-medium text-slate-500">
                {member.id} · {member.jobRole}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                {member.name}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {member.education} · {member.yearsExperience} yrs experience ·{" "}
                {member.status}
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 px-8 py-8">
          {view === "overview" ? (
            <>
              <section>
                <h2 className="text-lg font-semibold text-slate-900">
                  Your progress
                </h2>
                <p className="mt-1 text-sm text-slate-600">Cohort: {cohort}</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    label="Commit days"
                    value={signals.commitDays}
                    hint="Days with activity in the program"
                    icon={<StatMetricIcon kind="commit" />}
                  />
                  <StatCard
                    label="Missions completed"
                    value={signals.missionsCompleted}
                    hint="Total missions finished"
                    icon={<StatMetricIcon kind="missions" />}
                  />
                  <StatCard
                    label="First-try success"
                    value={signals.missionsFirstTry}
                    hint="Missions passed on the first attempt"
                    icon={<StatMetricIcon kind="firstTry" />}
                  />
                  <StatCard
                    label="AI interview mark"
                    value={
                      interviewResult
                        ? `${interviewResult.finalScore}/100`
                        : "—"
                    }
                    hint={
                      interviewResult
                        ? "Latest proctored interview (see Profile for breakdown)"
                        : "Complete the AI interview to earn your mark"
                    }
                    icon={<StatMetricIcon kind="firstTry" />}
                  />
                </div>
              </section>

              <InterviewOverviewCard
                candidateName={member.name}
                missions={missions}
                curriculumDays={curriculumDays}
              />

              <section className="mt-10">
                <h2 className="text-lg font-semibold text-slate-900">
                  Recent missions
                </h2>
                <ul className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  {missions.map((mission) => {
                    const status = mission.skipped
                      ? "Skipped"
                      : mission.passed
                        ? mission.attempts === 1
                          ? "Passed · 1st try"
                          : `Passed · ${mission.attempts} attempts`
                        : "In progress";

                    return (
                      <li
                        key={`${mission.day}-${mission.title}`}
                        className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5"
                      >
                        <p className="font-medium text-slate-800">
                          Day {mission.day}: {mission.title}
                        </p>
                        <span className="text-sm text-slate-500">{status}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </>
          ) : view === "modules" ? (
            selectedModule ? (
              <ModuleDailyTasks
                module={selectedModule}
                curriculumDays={curriculumDays}
                missions={missions}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                <h2 className="text-lg font-semibold text-slate-900">Modules</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Choose <span className="font-medium">Module 1</span>,{" "}
                  <span className="font-medium">Module 2</span>, … from the left
                  sidebar to view daily tasks and completion status.
                </p>
              </div>
            )
          ) : (
            <div className="mx-auto max-w-5xl space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Profile
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Personal details, interview mark, and learning focus.
                </p>
              </div>

              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Personal information
                </h3>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  {profile.personalInformation.map((row) => (
                    <div key={row.label}>
                      <dt className="text-xs font-medium text-slate-400">
                        {row.label}
                      </dt>
                      <dd className="mt-1 text-sm font-medium text-slate-900">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>

              <ProfileInterviewScore initialResult={interviewResult} />

              <ProfileSkillsGraph
                candidateName={member.name}
                jobRole={member.jobRole}
                wellFocusedAreas={profile.wellFocusedAreas}
                strengths={profile.strengths}
              />
            </div>
          )}
        </main>
        </div>

        {view === "profile" ? (
          <div className="sticky top-0 hidden h-screen min-h-0 shrink-0 lg:block">
            <InterviewScoreboard currentCandidateId={member.id} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
