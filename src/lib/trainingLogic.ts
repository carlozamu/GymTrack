import type {
  Exercise,
  TrainingSet,
  VolumeLevel,
  WeekData,
} from "../types/training";

export const DELOAD_FREQUENCY = 4;

const EFFECTIVE_REP_VALUES = [
  0, 1, 2, 2.99, 3.94, 4.79, 5.41, 5.64, 5.65,
] as const;

const BASE_EFFECTIVE_REP_TARGET: Record<VolumeLevel, number> = {
  Low: 19.16,
  Moderate: 28.74,
};

export interface RepsSummary {
  totalEffectiveReps: number;
  completedSets: number;
  totalHVL: number;
}

export interface WeekMetrics extends RepsSummary {
  suggestedSets: number;
  suggestedWeight: number;
}

export interface ExerciseComputation {
  updatedExercise: Exercise;
  weekMetrics: Record<string, WeekMetrics>;
}

export const isDeloadTime = (
  blockLabel: string,
  frequency = DELOAD_FREQUENCY,
): boolean => {
  if (!frequency) return false;
  const match = blockLabel.match(/(\d+)/);
  if (!match) return false;
  const blockNumber = Number(match[1]);
  if (!Number.isFinite(blockNumber) || blockNumber <= 0) return false;
  return (blockNumber - 1) % frequency === 0;
};

export const effectiveReps = (reps: number): number => {
  if (!Number.isFinite(reps) || reps <= 0) {
    return 0;
  }
  const index = Math.min(
    EFFECTIVE_REP_VALUES.length - 1,
    Math.round(reps),
  );
  return EFFECTIVE_REP_VALUES[index];
};

export const calculate1RM = (weight: number, reps: number): number => {
  if (!Number.isFinite(weight) || !Number.isFinite(reps)) return 0;
  if (weight <= 0 || reps <= 0 || reps > 36) return 0;
  return weight * (36 / (37 - reps));
};

export const summarizeSets = (sets: TrainingSet[]): RepsSummary => {
  const summary: RepsSummary = {
    totalEffectiveReps: 0,
    completedSets: 0,
    totalHVL: 0,
  };

  for (const set of sets) {
    const reps = Number.isFinite(set.reps) ? Math.round(set.reps) : 0;
    if (reps <= 0) {
      break;
    }

    summary.completedSets += 1;
    const effReps = effectiveReps(reps);
    summary.totalEffectiveReps += effReps;

    if (Number.isFinite(set.weight) && set.weight > 0) {
      summary.totalHVL += calculate1RM(set.weight, reps) * effReps;
    }
  }

  return summary;
};

export const calculateEffectiveRepetitions = (sets: TrainingSet[]): number =>
  summarizeSets(sets).totalEffectiveReps;

export const calculateHVL = (sets: TrainingSet[]): number =>
  summarizeSets(sets).totalHVL;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const calculateSuggestedSets = (
  sets: TrainingSet[],
  blockLabel: string,
  startingEffectiveReps: number,
  goalMultiplier: number,
  volumeLevel: VolumeLevel,
  maxNumberSets: number,
): number => {
  const safeGoalMultiplier =
    typeof goalMultiplier === "number" && goalMultiplier > 0
      ? Math.min(goalMultiplier, 1)
      : 1;
  const safeMaxSets =
    typeof maxNumberSets === "number" && maxNumberSets > 0
      ? Math.min(maxNumberSets, 10)
      : 10;

  const effectiveVolumeLevel = isDeloadTime(blockLabel)
    ? "Low"
    : volumeLevel;
  const effectiveRepsGoal =
    BASE_EFFECTIVE_REP_TARGET[effectiveVolumeLevel] * safeGoalMultiplier;

  const summary = summarizeSets(sets);
  const totalEffectiveReps = startingEffectiveReps + summary.totalEffectiveReps;

  const suggested =
    totalEffectiveReps < effectiveRepsGoal
      ? summary.completedSets + 1
      : summary.completedSets;

  return clamp(suggested || 1, 1, safeMaxSets);
};

export const calculateWeight = (
  e1RM: number,
  minRange: number,
  maxRange: number,
  maxWeightStack: number,
  rounding: number,
  prevWeight: number,
  blockLabel: string,
): number => {
  const inputs = [e1RM, minRange, maxRange, maxWeightStack, rounding];
  if (inputs.some((value) => !Number.isFinite(value) || value <= 0)) {
    return 0;
  }

  const safePrevWeight = Number.isFinite(prevWeight) ? prevWeight : 0;
  const minWeight = Math.max(safePrevWeight, e1RM * minRange);
  const maxWeight = Math.min(e1RM * maxRange, maxWeightStack);
  let calculatedWeight = Math.min(minWeight, maxWeight);

  if (isDeloadTime(blockLabel)) {
    calculatedWeight = Math.min(e1RM * minRange, maxWeightStack);
  }

  const result =
    Math.ceil(calculatedWeight / rounding) * rounding;
  return Number.isFinite(result) ? result : 0;
};

const findKeySet = (sets: TrainingSet[]): TrainingSet | undefined =>
  sets.find((set) => set.reps > 0 && set.weight > 0);

export const recomputeExerciseWeeks = (
  exercise: Exercise,
): ExerciseComputation => {
  let rollingE1RM = exercise.oneRM;
  let previousWeekWeight = 0;

  const weekMetrics: Record<string, WeekMetrics> = {};
  const updatedWeeks: WeekData[] = exercise.weeks.map((week) => {
    const summary = summarizeSets(week.sets);
    const suggestedSets = calculateSuggestedSets(
      week.sets,
      week.label,
      0,
      1,
      exercise.volumeLevel,
      exercise.maxSets,
    );

    const suggestedWeight = calculateWeight(
      rollingE1RM,
      exercise.minRange,
      exercise.maxRange,
      exercise.maxStack,
      exercise.rounding,
      previousWeekWeight,
      week.label,
    );

    const keySet = findKeySet(week.sets);
    const estimatedOneRM = keySet
      ? calculate1RM(keySet.weight, keySet.reps)
      : undefined;

    weekMetrics[week.id] = {
      ...summary,
      suggestedSets,
      suggestedWeight,
    };

    if (estimatedOneRM && estimatedOneRM > 0) {
      rollingE1RM = estimatedOneRM;
    }

    previousWeekWeight = suggestedWeight || previousWeekWeight;

    return {
      ...week,
      suggestedWeight,
      estimatedOneRM,
    };
  });

  return {
    updatedExercise: {
      ...exercise,
      weeks: updatedWeeks,
    },
    weekMetrics,
  };
};
