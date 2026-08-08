import type { CandidateMission } from "@/types/candidate";
import type { CurriculumDay, CurriculumModule } from "@/types/candidate";
import {
  getDayTaskStatus,
  getModuleDays,
  type DayTaskStatus,
} from "@/lib/moduleTasks";

function StatusIcon({ status }: { status: DayTaskStatus }) {
  if (status === "completed") {
    return (
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-1 ring-emerald-200"
        title="Completed"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 12.5l3.5 3.5L18 8"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (status === "skipped") {
    return (
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-200"
        title="Skipped"
      >
        <span className="text-xs font-bold">—</span>
      </span>
    );
  }
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 ring-1 ring-slate-200"
      title="Not completed"
    >
      <span className="h-2 w-2 rounded-full bg-slate-300" />
    </span>
  );
}

type ModuleDailyTasksProps = {
  module: CurriculumModule;
  curriculumDays: CurriculumDay[];
  missions: CandidateMission[];
};

export function ModuleDailyTasks({
  module,
  curriculumDays,
  missions,
}: ModuleDailyTasksProps) {
  const days = getModuleDays(module, curriculumDays);
  const [rangeStart, rangeEnd] = module.days;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-indigo-600">
          Module {module.n}
        </p>
        <h2 className="text-xl font-semibold text-slate-900">{module.title}</h2>
        <p className="mt-1 text-sm text-slate-600">
          Daily tasks for days {rangeStart}–{rangeEnd} · green check = completed
        </p>
      </div>

      <ul className="space-y-3">
        {days.map((day) => {
          const status = getDayTaskStatus(day.day, missions);
          const mission = missions.find((m) => m.day === day.day);

          return (
            <li
              key={day.day}
              className={`rounded-xl border bg-white p-4 shadow-sm transition ${
                status === "completed"
                  ? "border-emerald-200/80"
                  : "border-slate-200"
              }`}
            >
              <div className="flex gap-4">
                <StatusIcon status={status} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      Day {day.day}
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                      {day.type}
                    </span>
                    {status === "completed" && mission?.attempts ? (
                      <span className="text-xs text-emerald-600">
                        {mission.attempts === 1
                          ? "First-try pass"
                          : `${mission.attempts} attempts`}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 font-medium text-slate-900">{day.title}</p>
                  {day.objectives && day.objectives.length > 0 ? (
                    <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                      {day.objectives.slice(0, 4).map((objective) => (
                        <li
                          key={objective}
                          className="flex gap-2 text-sm text-slate-600"
                        >
                          {status === "completed" ? (
                            <span className="mt-0.5 text-emerald-500">✓</span>
                          ) : (
                            <span className="mt-0.5 text-slate-300">○</span>
                          )}
                          {objective}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
