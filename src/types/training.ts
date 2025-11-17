export type VolumeLevel = "Low" | "Moderate";

/**
 * Actual performance of a single set logged by the lifter.
 * `weight` represents the real load used for that set, not the suggestion.
 */
export interface TrainingSet {
  id: string;
  reps: number;
  weight: number;
}

/**
 * Week data mixes user input (sets[]) with derived values from the logic layer.
 * Derived fields are optional and recalculated whenever sets/config change.
 */
export interface WeekData {
  id: string;
  label: string;
  sets: TrainingSet[];
  /** Suggested working weight for the block/week (derived). */
  suggestedWeight?: number;
  /** e1RM computed from the key set of that week (derived). */
  estimatedOneRM?: number;
  /** Aggregated totals derived from sets. */
  effectiveReps?: number;
  totalHVL?: number;
  completedSets?: number;
  /** Sheet-style set target for this week (derived). */
  suggestedSets?: number;
}

export interface Exercise {
  id: string;
  name: string;
  /** Starting 1RM estimate for the block (user provided). */
  oneRM: number;
  minRange: number;
  maxRange: number;
  maxStack: number;
  rounding: number;
  volumeLevel: VolumeLevel;
  maxSets: number;
  weeks: WeekData[];
}
