import { useEffect, useMemo, useState } from "react";
import { ExerciseCard } from "./components/ExerciseCard";
import { ExerciseDetail } from "./components/ExerciseDetail";
import { createId } from "./lib/id";
import { loadExercises, saveExercises } from "./lib/storage";
import { recomputeExerciseWeeks } from "./lib/trainingLogic";
import type { Exercise } from "./types/training";

const recomputeAll = (list: Exercise[]): Exercise[] =>
  list.map((exercise) => recomputeExerciseWeeks(exercise));

const createExercise = (name: string): Exercise => ({
  id: createId(),
  name: name || "New Exercise",
  oneRM: 100,
  minRange: 0.83,
  maxRange: 0.89,
  maxStack: 200,
  rounding: 2.5,
  volumeLevel: "Moderate",
  maxSets: 8,
  weeks: Array.from({ length: 4 }, (_, index) => ({
    id: createId(),
    label: `Week ${index + 1}`,
    sets: [],
  })),
});

export const App = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null,
  );
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [focusSetId, setFocusSetId] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadExercises();
    const computed = recomputeAll(stored);
    setExercises(computed);
    if (computed.length) {
      setSelectedExerciseId(computed[0].id);
      setSelectedWeekId(computed[0].weeks[0]?.id ?? null);
    }
  }, []);

  useEffect(() => {
    saveExercises(exercises);
  }, [exercises]);

  const applyUpdate = (builder: (prev: Exercise[]) => Exercise[]) => {
    setExercises((prev) => recomputeAll(builder(prev)));
  };

  const selectedExercise = useMemo(() => {
    if (!exercises.length) {
      return null;
    }
    if (!selectedExerciseId) {
      return exercises[0];
    }
    return (
      exercises.find((exercise) => exercise.id === selectedExerciseId) ??
      exercises[0]
    );
  }, [exercises, selectedExerciseId]);

  useEffect(() => {
    if (!selectedExercise) {
      setSelectedWeekId(null);
      return;
    }
    if (
      !selectedWeekId ||
      !selectedExercise.weeks.some((week) => week.id === selectedWeekId)
    ) {
      setSelectedWeekId(selectedExercise.weeks[0]?.id ?? null);
    }
  }, [selectedExercise, selectedWeekId]);

  const handleExerciseConfigChange = (
    exerciseId: string,
    patch: Partial<Exercise>,
  ) => {
    applyUpdate((prev) =>
      prev.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, ...patch } : exercise,
      ),
    );
  };

  const handleAddWeek = (exerciseId: string) => {
    applyUpdate((prev) =>
      prev.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              weeks: [
                ...exercise.weeks,
                {
                  id: createId(),
                  label: `Week ${exercise.weeks.length + 1}`,
                  sets: [],
                },
              ],
            }
          : exercise,
      ),
    );
  };

  const handleAddSet = (exerciseId: string, weekId: string) => {
    const newSetId = createId();
    setFocusSetId(newSetId);
    applyUpdate((prev) =>
      prev.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              weeks: exercise.weeks.map((week) =>
                week.id === weekId
                  ? {
                      ...week,
                      sets: [
                        ...week.sets,
                        {
                          id: newSetId,
                          reps: 0,
                          weight: week.suggestedWeight ?? 0,
                        },
                      ],
                    }
                  : week,
              ),
            }
          : exercise,
      ),
    );
  };

  const handleUpdateSet = (
    exerciseId: string,
    weekId: string,
    setId: string,
    field: "reps" | "weight",
    value: number,
  ) => {
    applyUpdate((prev) =>
      prev.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              weeks: exercise.weeks.map((week) =>
                week.id === weekId
                  ? {
                      ...week,
                      sets: week.sets.map((set) =>
                        set.id === setId ? { ...set, [field]: value } : set,
                      ),
                    }
                  : week,
              ),
            }
          : exercise,
      ),
    );
  };

  const handleRemoveSet = (
    exerciseId: string,
    weekId: string,
    setId: string,
  ) => {
    applyUpdate((prev) =>
      prev.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              weeks: exercise.weeks.map((week) =>
                week.id === weekId
                  ? {
                      ...week,
                      sets: week.sets.filter((set) => set.id !== setId),
                    }
                  : week,
              ),
            }
          : exercise,
      ),
    );
  };

  const handleAddExercise = () => {
    if (!newExerciseName.trim()) {
      return;
    }
    applyUpdate((prev) => [...prev, createExercise(newExerciseName.trim())]);
    setNewExerciseName("");
  };

  return (
    <div className="min-h-screen bg-base px-4 py-6 text-text-primary sm:px-6">
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <header className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-text-secondary">
            GymTrack
          </p>
          <h1 className="text-3xl font-semibold">Weekly Strength Planner</h1>
          <p className="text-base text-text-secondary">
            Define your lifts once, then follow the guided weekly flow that
            mirrors the Google Sheet.
          </p>
        </header>

        <section className="space-y-3">
          <div className="rounded-3xl bg-surface p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-text-primary">
                Exercises
              </h2>
              <span className="text-sm text-text-secondary">
                {exercises.length} saved
              </span>
            </div>
            <div className="space-y-3">
              {exercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  isActive={exercise.id === selectedExercise?.id}
                  onSelect={() => {
                    setSelectedExerciseId(exercise.id);
                    setSelectedWeekId(exercise.weeks[0]?.id ?? null);
                  }}
                />
              ))}
              {!exercises.length && (
                <p className="rounded-2xl bg-base px-3 py-2 text-sm text-text-secondary">
                  No exercises yet. Add your first lift below.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-outline bg-surface p-4 shadow-card">
            <label className="block text-sm font-medium text-text-primary">
              New exercise
            </label>
            <input
              type="text"
              placeholder="e.g. Bench Press"
              className="mt-2 w-full rounded-2xl border border-outline bg-white px-3 py-2 text-base text-text-primary focus:border-accent focus:outline-none"
              value={newExerciseName}
              onChange={(event) => setNewExerciseName(event.target.value)}
            />
            <button
              type="button"
              onClick={handleAddExercise}
              className="mt-3 w-full rounded-2xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-accent/30"
              disabled={!newExerciseName.trim()}
            >
              Add exercise
            </button>
          </div>
        </section>

        {selectedExercise ? (
          <ExerciseDetail
            exercise={selectedExercise}
            selectedWeekId={selectedWeekId}
            onWeekChange={setSelectedWeekId}
            onConfigChange={(patch) =>
              handleExerciseConfigChange(selectedExercise.id, patch)
            }
            onAddSet={(weekId) => handleAddSet(selectedExercise.id, weekId)}
            onUpdateSet={(weekId, setId, field, value) =>
              handleUpdateSet(selectedExercise.id, weekId, setId, field, value)
            }
            onRemoveSet={(weekId, setId) =>
              handleRemoveSet(selectedExercise.id, weekId, setId)
            }
            onAddWeek={() => handleAddWeek(selectedExercise.id)}
            focusSetId={focusSetId}
            onFocusHandled={() => setFocusSetId(null)}
          />
        ) : (
          <div className="rounded-3xl bg-surface p-5 text-center text-text-secondary shadow-card">
            Select or add an exercise to start logging sets.
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
