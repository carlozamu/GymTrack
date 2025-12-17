
const Calculator = require('./js/calculator.js');

// Mock data
const mockRepsWeek1 = [8, 8, 7, 5]; // From user example
const mockRepsStrong = [10, 10, 10]; // 5.65 * 3 = 16.95

console.log("--- Testing Deload Logic ---");
console.log("isDeloadTime(1) [Week 1]:", Calculator.isDeloadTime(1)); // Expect True
console.log("isDeloadTime(2) [Week 2]:", Calculator.isDeloadTime(2)); // Expect False

console.log("\n--- Testing Effective Reps Calculation ---");
const effRepsW1 = Calculator.calculateEffectiveRepetitions(mockRepsWeek1);
console.log(`Reps [${mockRepsWeek1}] -> Effective: ${effRepsW1.toFixed(2)}`);
// 5.65 + 5.65 + 5.64 + 4.79 = 21.73

console.log("\n--- Testing Target Goals ---");
// Week 1 (Deload) with Rounding 0.5 (Multiplier 0.5)
// Goal = 19.16 * 0.5 = 9.58.
// Total Reps = 4.79 + 5.65 = ~10.4 (Wait, 8 reps=5.65. 6 reps=5.41. Total 11.06).
// 11.06 > 9.58 -> Should return completed sets (2).
const setsW1_Mult05 = Calculator.calculateSets([8, 6], 1, 0, 0.5); // Multiplier 0.5
console.log("Sets Week 1 (Deload, Mult 0.5) with [8,6]:", setsW1_Mult05, "(Expected: 2)");

// Week 1 (Deload) with Rounding 2.5 (Multiplier 1.0)
// Goal = 19.16 * 1.0 = 19.16.
// 11.06 < 19.16 -> Should return 3.
const setsW1_Mult10 = Calculator.calculateSets([8, 6], 1, 0, 2.5 > 1 ? 1 : 2.5);
console.log("Sets Week 1 (Deload, Mult 1.0) with [8,6]:", setsW1_Mult10, "(Expected: 3)");

console.log("\n--- Testing Weight Calculation ---");
// 1RM 100, Range 80-85%.
// Week 1: Should be Min (80)
const weightW1 = Calculator.calculateWeight(100, 0.8, 0.85, 180, 2.5, 0, 1);
console.log("Weight Week 1 (Deload):", weightW1);

// Week 2: Should be Max (85) (if fit)
const weightW2 = Calculator.calculateWeight(100, 0.8, 0.85, 180, 2.5, 0, 2);
console.log("Weight Week 2 (Normal):", weightW2);
