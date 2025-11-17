import type { Exercise } from "../types/training";

interface ExerciseCardProps {
  exercise: Exercise;
  isActive: boolean;
  onSelect: () => void;
}

const getCurrentE1RM = (exercise: Exercise): number => {
  for (let i = exercise.weeks.length - 1; i >= 0; i -= 1) {
    const week = exercise.weeks[i];
    if (week.estimatedOneRM && week.estimatedOneRM > 0) {
      return week.estimatedOneRM;
    }
  }
  return exercise.oneRM;
};

export const ExerciseCard = ({
  exercise,
  isActive,
  onSelect,
}: ExerciseCardProps) => {
  const currentE1RM = getCurrentE1RM(exercise);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-3xl border border-white/10 p-4 transition hover:scale-[1.01] ${
        isActive ? "bg-white/20 text-slate-900" : "bg-white/10 text-white"
      } backdrop-blur-lg shadow-lg`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-200">
            Exercise
          </p>
          <h2 className="text-xl font-semibold">{exercise.name}</h2>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-200">Current e1RM</p>
          <p className="text-2xl font-bold">
            {currentE1RM ? currentE1RM.toFixed(1) : "—"} kg
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="rounded-full bg-slate-900/30 px-3 py-1 text-slate-100">
          Volume: {exercise.volumeLevel}
        </span>
        <span className="text-slate-200">
          Max sets: {exercise.maxSets.toString()}
        </span>
      </div>
    </button>
  );
};
