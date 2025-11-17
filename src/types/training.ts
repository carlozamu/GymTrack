export type VolumeLevel = "Low" | "Moderate";

export interface TrainingSet {
  id: string;
  reps: number;
  weight: number;
}

export interface WeekData {
  id: string;
  label: string;
  sets: TrainingSet[];
  suggestedWeight?: number;
  estimatedOneRM?: number;
}

export interface Exercise {
  id: string;
  name: string;
  oneRM: number;
  minRange: number;
  maxRange: number;
  maxStack: number;
  rounding: number;
  volumeLevel: VolumeLevel;
  maxSets: number;
  weeks: WeekData[];
}
