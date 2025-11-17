import { describe, expect, it } from "vitest";
import type { Exercise } from "../types/training";
import {
  calculate1RM,
  calculateSuggestedSets,
  calculateWeight,
  effectiveReps,
  isDeloadTime,
  recomputeExerciseWeeks,
  summarizeSets,
} from "./trainingLogic";

const buildSets = (entries: Array<{ reps: number; weight: number }>) =>
  entries.map((entry, index) => ({
    id: `set-${index}`,
    reps: entry.reps,
    weight: entry.weight,
  }));

describe("training logic", () => {
  it("detects deload weeks", () => {
    expect(isDeloadTime("Week 1")).toBe(true);
    expect(isDeloadTime("Week 2")).toBe(false);
    expect(isDeloadTime("Week 5")).toBe(true);
  });

  it("maps reps to effective reps lookup", () => {
    expect(effectiveReps(0)).toBe(0);
    expect(effectiveReps(5)).toBeCloseTo(4.79, 2);
    expect(effectiveReps(10)).toBeCloseTo(5.65, 2);
  });

  it("summarizes sets with HVL", () => {
    const result = summarizeSets(
      buildSets([
        { reps: 6, weight: 100 },
        { reps: 8, weight: 95 },
      ]),
    );
    expect(result.completedSets).toBe(2);
    expect(result.totalEffectiveReps).toBeGreaterThan(8);
    expect(result.totalHVL).toBeGreaterThan(0);
  });

  it("calculates suggested sets respecting deload", () => {
    const sets = buildSets([{ reps: 5, weight: 80 }]);
    const lowVolume = calculateSuggestedSets(
      sets,
      "Week 1",
      0,
      1,
      "Moderate",
      8,
    );
    expect(lowVolume).toBeGreaterThanOrEqual(1);
  });

  it("estimates 1RM and weight targets", () => {
    expect(calculate1RM(100, 5)).toBeCloseTo(112.5, 2);
    const suggestion = calculateWeight(120, 0.83, 0.9, 200, 2.5, 100, "Week 2");
    expect(suggestion).toBeGreaterThan(0);
  });

  it("recomputes week summaries and progressive suggestions", () => {
    const exercise: Exercise = {
      id: "ex-1",
      name: "Bench",
      oneRM: 120,
      minRange: 0.83,
      maxRange: 0.89,
      maxStack: 200,
      rounding: 2.5,
      volumeLevel: "Moderate",
      maxSets: 8,
      weeks: [
        {
          id: "week-1",
          label: "Week 1",
          sets: buildSets([
            { reps: 6, weight: 100 },
            { reps: 8, weight: 95 },
          ]),
        },
        {
          id: "week-2",
          label: "Week 2",
          sets: [],
        },
      ],
    };

    const updated = recomputeExerciseWeeks(exercise);
    const week1 = updated.weeks[0]!;
    const week2 = updated.weeks[1]!;

    expect(week1.suggestedWeight).toBeGreaterThan(0);
    expect(week1.effectiveReps).toBeGreaterThan(0);
    expect(week1.estimatedOneRM).toBeGreaterThan(0);
    expect(week1.suggestedSets).toBeGreaterThan(0);
    expect(week2.suggestedWeight).toBeGreaterThan(0);
  });
});
