import type { Exercise } from "../types/training";

const STORAGE_KEY = "gymtrack:exercises";
const memoryStore: { value: Exercise[] } = { value: [] };

const isBrowser = (): boolean => typeof window !== "undefined";

export const loadExercises = (): Exercise[] => {
  if (!isBrowser()) {
    return memoryStore.value;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as Exercise[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveExercises = (exercises: Exercise[]): void => {
  if (!isBrowser()) {
    memoryStore.value = exercises;
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(exercises));
};
