import { useEffect, useMemo, useState } from "react";
import { ExerciseCard } from "./components/ExerciseCard";
import { ExerciseDetail } from "./components/ExerciseDetail";
import { createId } from "./lib/id";
import { loadExercises, saveExercises } from "./lib/storage";
import {
  recomputeExerciseWeeks,
  type WeekMetrics,
} from "./lib/trainingLogic";
import type { Exercise } from "./types/training";

interface ExerciseState {
  list: Exercise[];
  metrics: Record<string, Record<string, WeekMetrics>>;
}

const defaultState: ExerciseState = { list: [], metrics: {} };

const recomputeAll = (list: Exercise[]): ExerciseState => {
  const computed: Exercise[] = [];
  const metrics: Record<string, Record<string, WeekMetrics>> = {};

  list.forEach((exercise) => {
    const { updatedExercise, weekMetrics } = recomputeExerciseWeeks(exercise);
    computed.push(updatedExercise);
    metrics[updatedExercise.id] = weekMetrics;
  });

  return { list: computed, metrics };
};

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
  const [exerciseState, setExerciseState] =
    useState<ExerciseState>(defaultState);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null,
  );
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [newExerciseName, setNewExerciseName] = useState("");

  const applyUpdate = (builder: (prev: Exercise[]) => Exercise[]) => {
    setExerciseState((prev) => recomputeAll(builder(prev.list)));
  };

  useEffect(() => {
    const stored = loadExercises();
    const computed = recomputeAll(stored);
    setExerciseState(computed);
    if (computed.list.length) {
      setSelectedExerciseId(computed.list[0].id);
      setSelectedWeekId(computed.list[0].weeks[0]?.id ?? null);
    }
  }, []);

  useEffect(() => {
    saveExercises(exerciseState.list);
  }, [exerciseState.list]);

  const selectedExercise = useMemo(() => {
    if (!selectedExerciseId) {
      return exerciseState.list[0] ?? null;
    }
    return exerciseState.list.find(
      (exercise) => exercise.id === selectedExerciseId,
    ) ?? exerciseState.list[0] ?? null;
  }, [exerciseState.list, selectedExerciseId]);

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
                          id: createId(),
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

  const metricsForSelected =
    (selectedExercise &&
      exerciseState.metrics[selectedExercise.id]) ||
    {};

  return (
    <div className="min-h-screen bg-transparent px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-2 text-white">
          <p className="text-sm uppercase tracking-[0.4em] text-slate-200">
            GymTrack
          </p>
          <h1 className="text-4xl font-semibold">Liquid Glass Training Log</h1>
          <p className="text-slate-200">
            Track sets, hypertrophic volume load, and next week&apos;s target
            loads with Apple-inspired polish.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <div className="space-y-4">
            <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-2xl">
              <p className="text-sm uppercase tracking-wide text-slate-200">
                Exercises
              </p>
              <div className="space-y-3">
                {exerciseState.list.map((exercise) => (
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
                {!exerciseState.list.length && (
                  <p className="rounded-2xl bg-slate-900/30 p-3 text-sm text-slate-200">
                    No exercises yet. Add your first one below.
                  </p>
                )}
              </div>
            </div>
            <div className="rounded-3xl border border-dashed border-white/30 bg-white/5 p-4 backdrop-blur-xl">
              <p className="text-sm text-slate-200">New exercise</p>
              <input
                type="text"
                placeholder="e.g. Bench Press"
                className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                value={newExerciseName}
                onChange={(event) => setNewExerciseName(event.target.value)}
              />
              <button
                type="button"
                onClick={handleAddExercise}
                className="mt-3 w-full rounded-2xl bg-white/80 py-2 text-slate-900 disabled:cursor-not-allowed disabled:bg-white/30"
                disabled={!newExerciseName.trim()}
              >
                + Add Exercise
              </button>
            </div>
          </div>

          {selectedExercise ? (
            <ExerciseDetail
              exercise={selectedExercise}
              weekMetrics={metricsForSelected}
              selectedWeekId={selectedWeekId}
              onWeekChange={setSelectedWeekId}
              onConfigChange={(patch) =>
                handleExerciseConfigChange(selectedExercise.id, patch)
              }
              onAddSet={(weekId) =>
                handleAddSet(selectedExercise.id, weekId)
              }
              onUpdateSet={(weekId, setId, field, value) =>
                handleUpdateSet(selectedExercise.id, weekId, setId, field, value)
              }
              onRemoveSet={(weekId, setId) =>
                handleRemoveSet(selectedExercise.id, weekId, setId)
              }
              onAddWeek={() => handleAddWeek(selectedExercise.id)}
            />
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-200 backdrop-blur-3xl">
              Select or add an exercise to start logging sets.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
