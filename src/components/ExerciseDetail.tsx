import type { WeekMetrics } from "../lib/trainingLogic";
import type { Exercise } from "../types/training";

interface ExerciseDetailProps {
  exercise: Exercise;
  weekMetrics: Record<string, WeekMetrics>;
  selectedWeekId: string | null;
  onWeekChange: (weekId: string) => void;
  onConfigChange: (patch: Partial<Exercise>) => void;
  onAddSet: (weekId: string) => void;
  onUpdateSet: (
    weekId: string,
    setId: string,
    field: "reps" | "weight",
    value: number,
  ) => void;
  onRemoveSet: (weekId: string, setId: string) => void;
  onAddWeek: () => void;
}

const InputField = ({
  label,
  value,
  onChange,
  step = "any",
}: {
  label: string;
  value: number;
  step?: string;
  onChange: (value: number) => void;
}) => (
  <label className="flex flex-col gap-1 text-sm text-slate-200">
    {label}
    <input
      type="number"
      step={step}
      className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-base text-white placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
      value={Number.isFinite(value) ? value : ""}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  </label>
);

export const ExerciseDetail = ({
  exercise,
  weekMetrics,
  selectedWeekId,
  onWeekChange,
  onConfigChange,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
  onAddWeek,
}: ExerciseDetailProps) => {
  if (!exercise.weeks.length) {
    return null;
  }

  const activeWeek =
    exercise.weeks.find((week) => week.id === selectedWeekId) ||
    exercise.weeks[0];
  const metrics = weekMetrics?.[activeWeek.id];

  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-6 text-white shadow-2xl backdrop-blur-3xl">
      <header className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-200">
          Active Exercise
        </p>
        <h1 className="text-3xl font-semibold">{exercise.name}</h1>
        <p className="text-slate-100">
          Current e1RM:{" "}
          <span className="font-semibold">
            {activeWeek.estimatedOneRM
              ? activeWeek.estimatedOneRM.toFixed(1)
              : exercise.oneRM.toFixed(1)}{" "}
            kg
          </span>
        </p>
      </header>

      <section className="mt-6 space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm uppercase tracking-wide text-slate-200">
            Configuration
          </p>
          <div className="flex gap-2">
            {(["Low", "Moderate"] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => onConfigChange({ volumeLevel: level })}
                className={`rounded-full px-4 py-1 text-sm ${
                  exercise.volumeLevel === level
                    ? "bg-white/70 text-slate-900"
                    : "bg-white/10 text-white"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-white sm:grid-cols-4">
          <InputField
            label="1RM estimate"
            value={exercise.oneRM}
            onChange={(value) => onConfigChange({ oneRM: value })}
          />
          <InputField
            label="Min range"
            step="0.01"
            value={exercise.minRange}
            onChange={(value) => onConfigChange({ minRange: value })}
          />
          <InputField
            label="Max range"
            step="0.01"
            value={exercise.maxRange}
            onChange={(value) => onConfigChange({ maxRange: value })}
          />
          <InputField
            label="Rounding"
            step="0.5"
            value={exercise.rounding}
            onChange={(value) => onConfigChange({ rounding: value })}
          />
          <InputField
            label="Max stack"
            value={exercise.maxStack}
            onChange={(value) => onConfigChange({ maxStack: value })}
          />
          <InputField
            label="Max sets"
            value={exercise.maxSets}
            onChange={(value) => onConfigChange({ maxSets: Math.max(1, value) })}
          />
        </div>
      </section>

      <section className="mt-6 space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center gap-2">
            <p className="text-sm text-slate-200">Week</p>
            <select
              value={activeWeek.id}
              onChange={(event) => onWeekChange(event.target.value)}
              className="rounded-2xl border border-white/20 bg-slate-900/30 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
            >
              {exercise.weeks.map((week) => (
                <option key={week.id} value={week.id}>
                  {week.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={onAddWeek}
            className="rounded-2xl bg-white/70 px-4 py-2 text-sm font-semibold text-slate-900"
          >
            + Add Week
          </button>
        </div>

        <div className="rounded-2xl bg-slate-900/20 p-4">
          <p className="text-sm uppercase tracking-wide text-slate-200">
            Suggested weight
          </p>
          <p className="text-3xl font-semibold">
            {activeWeek.suggestedWeight
              ? `${activeWeek.suggestedWeight.toFixed(1)} kg`
              : "—"}
          </p>
        </div>

        <div className="space-y-3">
          {activeWeek.sets.length === 0 && (
            <p className="rounded-2xl bg-slate-900/10 p-3 text-sm text-slate-200">
              No sets logged yet. Use the button below to add your first set.
            </p>
          )}
          {activeWeek.sets.map((set) => (
            <div
              key={set.id}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
            >
              <div className="flex flex-1 items-center gap-2">
                <label className="flex flex-1 flex-col text-sm text-slate-200">
                  Reps
                  <input
                    type="number"
                    min={0}
                    className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                    value={set.reps}
                    onChange={(event) =>
                      onUpdateSet(
                        activeWeek.id,
                        set.id,
                        "reps",
                        Number(event.target.value),
                      )
                    }
                  />
                </label>
                <label className="flex flex-1 flex-col text-sm text-slate-200">
                  Weight (kg)
                  <input
                    type="number"
                    min={0}
                    className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                    value={set.weight}
                    onChange={(event) =>
                      onUpdateSet(
                        activeWeek.id,
                        set.id,
                        "weight",
                        Number(event.target.value),
                      )
                    }
                  />
                </label>
              </div>
              <button
                type="button"
                aria-label="Delete set"
                onClick={() => onRemoveSet(activeWeek.id, set.id)}
                className="rounded-full border border-white/20 p-2 text-slate-200 hover:bg-white/20"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onAddSet(activeWeek.id)}
          className="w-full rounded-2xl border border-dashed border-white/40 py-3 text-white"
        >
          + Add Set
        </button>

        <div className="grid gap-4 rounded-2xl bg-slate-900/20 p-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-slate-200">Effective reps</p>
            <p className="text-2xl font-semibold">
              {metrics?.totalEffectiveReps
                ? metrics.totalEffectiveReps.toFixed(1)
                : "0"}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-200">HVL</p>
            <p className="text-2xl font-semibold">
              {metrics?.totalHVL ? metrics.totalHVL.toFixed(1) : "0"}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-200">Suggested sets</p>
            <p className="text-2xl font-semibold">
              {metrics?.suggestedSets ?? exercise.maxSets}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
