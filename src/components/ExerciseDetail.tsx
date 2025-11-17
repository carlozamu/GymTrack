import { useEffect, useMemo, useState } from "react";
import { isDeloadTime } from "../lib/trainingLogic";
import type { Exercise } from "../types/training";

interface ExerciseDetailProps {
  exercise: Exercise;
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
  focusSetId: string | null;
  onFocusHandled: () => void;
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
  <label className="flex flex-col gap-1 text-sm text-text-secondary">
    {label}
    <input
      type="number"
      step={step}
      className="rounded-2xl border border-outline bg-white px-3 py-2 text-base text-text-primary focus:border-accent focus:outline-none"
      value={Number.isFinite(value) ? value : ""}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  </label>
);

export const ExerciseDetail = ({
  exercise,
  selectedWeekId,
  onWeekChange,
  onConfigChange,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
  onAddWeek,
  focusSetId,
  onFocusHandled,
}: ExerciseDetailProps) => {
  const [showConfig, setShowConfig] = useState(false);

  const activeWeek =
    exercise.weeks.find((week) => week.id === selectedWeekId) ||
    exercise.weeks[0];

  const weekTarget =
    activeWeek?.suggestedSets && activeWeek.suggestedSets > 0
      ? activeWeek.suggestedSets
      : exercise.maxSets;
  const completedSets = activeWeek?.completedSets ?? activeWeek?.sets.length ?? 0;
  const targetReached = completedSets >= weekTarget;
  const maxSetsReached =
    (activeWeek?.sets.length ?? 0) >= exercise.maxSets;

  useEffect(() => {
    if (!focusSetId) {
      return;
    }
    const input = document.getElementById(`set-reps-${focusSetId}`);
    if (input instanceof HTMLInputElement) {
      input.focus();
    }
    onFocusHandled();
  }, [focusSetId, onFocusHandled]);

  const summaryRows = useMemo(
    () => [
      {
        label: "Effective reps",
        value: activeWeek?.effectiveReps
          ? activeWeek.effectiveReps.toFixed(1)
          : "0",
      },
      {
        label: "HVL",
        value: activeWeek?.totalHVL ? activeWeek.totalHVL.toFixed(1) : "0",
      },
      {
        label: "Week e1RM",
        value: activeWeek?.estimatedOneRM
          ? `${activeWeek.estimatedOneRM.toFixed(1)} kg`
          : `${exercise.oneRM.toFixed(1)} kg`,
      },
      {
        label: "Volume",
        value: `${exercise.volumeLevel}${
          activeWeek && isDeloadTime(activeWeek.label) ? " • Deload" : ""
        }`,
      },
    ],
    [activeWeek, exercise.volumeLevel, exercise.oneRM],
  );

  if (!activeWeek) {
    return null;
  }

  return (
    <section className="rounded-3xl bg-surface p-5 shadow-card">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.4em] text-text-secondary">
          Exercise
        </p>
        <h2 className="text-2xl font-semibold text-text-primary">
          {exercise.name}
        </h2>
        <p className="text-sm text-text-secondary">
          Current e1RM:{" "}
          <span className="font-medium text-text-primary">
            {activeWeek.estimatedOneRM
              ? activeWeek.estimatedOneRM.toFixed(1)
              : exercise.oneRM.toFixed(1)}{" "}
            kg
          </span>
        </p>
      </header>

      <div className="mt-5 space-y-4">
        <div className="rounded-2xl border border-outline bg-white/70 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-text-primary">
              Configuration
            </h3>
            <button
              type="button"
              onClick={() => setShowConfig((prev) => !prev)}
              className="text-sm font-semibold text-accent"
            >
              {showConfig ? "Hide" : "Edit"}
            </button>
          </div>
          {showConfig && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
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
                  onChange={(value) =>
                    onConfigChange({ maxSets: Math.max(1, value) })
                  }
                />
              </div>
              <div className="flex gap-2">
                {(["Low", "Moderate"] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => onConfigChange({ volumeLevel: level })}
                    className={`flex-1 rounded-2xl border px-3 py-2 text-sm font-semibold ${
                      exercise.volumeLevel === level
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-outline text-text-secondary"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-2xl border border-outline bg-white/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <label className="flex flex-1 flex-col text-sm text-text-secondary">
              Week
              <select
                value={activeWeek.id}
                onChange={(event) => onWeekChange(event.target.value)}
                className="mt-1 rounded-2xl border border-outline bg-white px-3 py-2 text-base text-text-primary focus:border-accent focus:outline-none"
              >
                {exercise.weeks.map((week) => (
                  <option key={week.id} value={week.id}>
                    {week.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={onAddWeek}
              className="rounded-2xl border border-outline px-3 py-2 text-sm font-semibold text-text-primary"
            >
              + Week
            </button>
          </div>
          <div className="rounded-2xl bg-base px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-text-secondary">
              Suggested weight
            </p>
            <p className="text-2xl font-semibold text-text-primary">
              {activeWeek.suggestedWeight
                ? `${activeWeek.suggestedWeight.toFixed(1)} kg`
                : "—"}
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-outline bg-white/70 p-4">
          <div className="space-y-2">
            <h3 className="text-base font-medium text-text-primary">
              Log sets
            </h3>
            <p className="text-sm text-text-secondary">
              Planned sets this week:{" "}
              <span className="font-semibold text-text-primary">
                {weekTarget}
              </span>
            </p>
            <p className="text-sm text-text-secondary">
              You&apos;ve logged {activeWeek.sets.length} sets.
            </p>
            {targetReached && (
              <p className="rounded-2xl bg-success/10 px-3 py-2 text-sm text-success">
                Target reached — additional sets count as extra volume.
              </p>
            )}
          </div>

          <div className="space-y-3">
            {activeWeek.sets.length === 0 && (
              <p className="rounded-2xl border border-dashed border-outline px-3 py-2 text-sm text-text-secondary">
                No sets yet. Tap “Add set” to start logging.
              </p>
            )}
            {activeWeek.sets.map((set, index) => {
              const withinTarget = index < weekTarget;
              const repsInvalid = !Number.isFinite(set.reps) || set.reps <= 0;
              const weightInvalid =
                !Number.isFinite(set.weight) || set.weight <= 0;
              return (
                <div
                  key={set.id}
                  className={`rounded-2xl border px-3 py-3 transition ${
                    withinTarget
                      ? "border-success/40 bg-success/5"
                      : "border-outline bg-white"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span
                      className={`font-medium ${
                        withinTarget ? "text-success" : "text-text-secondary"
                      }`}
                    >
                      Set {index + 1}
                    </span>
                    {!withinTarget && (
                      <span className="text-xs text-text-secondary">
                        Extra volume
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <label className="flex flex-1 flex-col text-sm text-text-secondary">
                      Reps
                      <input
                        id={`set-reps-${set.id}`}
                        type="number"
                        min={0}
                        className={`mt-1 rounded-2xl border px-3 py-2 text-base text-text-primary focus:border-accent focus:outline-none ${
                          repsInvalid ? "border-rose-300" : "border-outline"
                        }`}
                        value={Number.isFinite(set.reps) ? set.reps : ""}
                        onChange={(event) =>
                          onUpdateSet(
                            activeWeek.id,
                            set.id,
                            "reps",
                            Number(event.target.value),
                          )
                        }
                      />
                      {repsInvalid && (
                        <span className="mt-1 text-xs text-rose-500">
                          Enter reps &gt; 0
                        </span>
                      )}
                    </label>
                    <label className="flex flex-1 flex-col text-sm text-text-secondary">
                      Actual weight (kg)
                      <input
                        type="number"
                        min={0}
                        className={`mt-1 rounded-2xl border px-3 py-2 text-base text-text-primary focus:border-accent focus:outline-none ${
                          weightInvalid ? "border-rose-300" : "border-outline"
                        }`}
                        value={Number.isFinite(set.weight) ? set.weight : ""}
                        onChange={(event) =>
                          onUpdateSet(
                            activeWeek.id,
                            set.id,
                            "weight",
                            Number(event.target.value),
                          )
                        }
                      />
                      {weightInvalid && (
                        <span className="mt-1 text-xs text-rose-500">
                          Weight must be positive
                        </span>
                      )}
                    </label>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onRemoveSet(activeWeek.id, set.id)}
                      className="text-sm text-text-secondary"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onAddSet(activeWeek.id)}
            disabled={maxSetsReached}
            className="w-full rounded-2xl border-2 border-dashed border-outline px-4 py-3 text-sm font-semibold text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add set
          </button>
          {maxSetsReached && (
            <p className="text-xs text-text-secondary">
              You&apos;ve reached the configured max sets for this exercise.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-outline bg-white/80 p-4">
          <h3 className="text-base font-medium text-text-primary">
            Weekly summary
          </h3>
          <div className="mt-3 space-y-2">
            {summaryRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-text-secondary">{row.label}</span>
                <span className="font-semibold text-text-primary">
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
