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
      className={`w-full rounded-3xl border px-4 py-3 text-left shadow-card transition ${
        isActive
          ? "border-accent bg-accent/5"
          : "border-outline bg-white hover:border-accent/50"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-secondary">
            Exercise
          </p>
          <p className="text-lg font-semibold text-text-primary">
            {exercise.name}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-secondary">Current e1RM</p>
          <p className="text-xl font-semibold text-text-primary">
            {currentE1RM ? currentE1RM.toFixed(1) : "—"} kg
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-text-secondary">
        <span className="rounded-full bg-base px-3 py-1 text-text-primary">
          {exercise.volumeLevel} volume
        </span>
        <span>Max sets: {exercise.maxSets}</span>
      </div>
    </button>
  );
};
