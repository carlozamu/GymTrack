const DELOAD_FREQUENCY = 4; // Deload every 4 blocks, starting from Week 1. Set to 0 to disable.

/**
 * PRIVATE FUNCTION: Check if it's time for a deload block given a string like "Block 1" or "Week 1".
 * A deload block occurs every DELOAD_FREQUENCY blocks.
 * If DELOAD_FREQUENCY is set to 0, deload is prevented.
 * 
 * This function is meant to be used internally and should not be called directly.
 *
 * @param {string} input The string containing the block number like "Block 1" or "Week 1".
 * @return {boolean} True if it's time for a deload block, false otherwise.
 */
function isDeloadTime(input) {
  return DELOAD_FREQUENCY !== 0 && typeof input === 'string' && ((parseInt(input.match(/\d+/), 10) - 1) % DELOAD_FREQUENCY === 0);
}


/**
 * PRIVATE FUNCTION: Calculate the effective repetitions for a given number of repetitions.
 * The repetitions should be performed to failure (RIR 0) for the calculation to be accurate. 
 * This function is meant to be used internally and should not be called directly.
 *  
 * @param {number} repetitions The number of completed repetitions to failure (RIR 0).
 * @return {number} The calculated effective repetitions.
 */
function _calculateEffectiveRepetitions(repetitions) {
   if (!repetitions || typeof repetitions !== 'number') return 0;

   var values = [0, 1, 2, 2.99, 3.94, 4.79, 5.41, 5.64, 5.65]; 
   var roundedRepetitions = Math.round(repetitions);

   return values[roundedRepetitions < values.length ? roundedRepetitions : values.length - 1];
}


/**
 * PRIVATE FUNCTION: Calculate the total effective repetitions, completed sets, and hypertrophic volume load (HVL) for a range of cells.
 * 
 * This function is meant to be used internally and should not be called directly.
 *
 * @param {A1:C1} range The range of cells containing the number of repetitions.
 * @param {number} weight The weight used for the repetitions (optional).
 * @param {number} totalRepetitions The starting value for totalRepetitions (optional, default is 0).
 * @return {Object} An object containing the total effective repetitions, completed sets, and HVL.
 */
function _calculateRepetitionsAndSets(range, weight, totalRepetitions) {
  if (typeof totalRepetitions !== 'number' || totalRepetitions < 0) {
    totalRepetitions = 0;
  }
  
  var completedSets = 0;
  var totalHVL = 0;
  var calculateHVL = typeof weight === 'number' && weight > 0;

  outerLoop: for (var i = 0; i < range.length; i++) {
    for (var j = 0; j < range[i].length; j++) {
      if (typeof range[i][j] === 'number' && range[i][j] > 0) {
        completedSets++;
        var effectiveRepetitions = _calculateEffectiveRepetitions(range[i][j]);
        totalRepetitions += effectiveRepetitions;

        if (calculateHVL) {
          totalHVL += calculate1RM(weight, range[i][j]) * effectiveRepetitions;
        }
      } else {
        break outerLoop;
      }
    }
  }

  return {
    totalRepetitions: totalRepetitions,
    completedSets: completedSets,
    totalHVL: totalHVL
  };
}


/**
 * Calculate the number of sets for a range of cells.
 *
 * @param {A1:C1} range The range of cells containing the number of repetitions.
 * @param {string} blockString The string containing the block or week number (e.g. "Week 1" or "Block 1").
 * @param {number} totalRepetitions The starting value for totalRepetitions (optional, default is 0).
 * @param {number} goalMultiplier The multiplier for the effective repetitions goal (optional, default is 1).
 * @param {string} trainingVolume The training volume, which can be "Low" or "Moderate".
 * @param {number} maxNumberSets The maximum number of sets (optional, default is 10).
 * @return The calculated number of sets for the provided range.
 * @customfunction
 */
function calculateSets(range, blockString, totalRepetitions = 0, goalMultiplier, trainingVolume, maxNumberSets) {

  if (typeof goalMultiplier !== 'number' || goalMultiplier > 1) {
    goalMultiplier = 1;
  }

  if (typeof maxNumberSets !== 'number' || maxNumberSets > 10) {
    maxNumberSets = 10;
  }
  
  if (isDeloadTime(blockString)) {
    trainingVolume = "Low";
  }

  var effectiveRepsGoal;

  switch (trainingVolume) {
    case "Low":
      effectiveRepsGoal = 19.16;
      break;
    default: // Moderate
      effectiveRepsGoal = 28.74;
      break;
  }

  effectiveRepsGoal *= goalMultiplier;

  var result = _calculateRepetitionsAndSets(range, 0, totalRepetitions);
  var completedSets = result.completedSets;
  var totalRepetitions = result.totalRepetitions;

  return Math.min(Math.max(totalRepetitions < effectiveRepsGoal ? completedSets + 1 : completedSets, 1), maxNumberSets);
}


/**
 * Calculate the effective repetitions for a range of cells.
 *
 * @param {A1:C1} range The range of cells containing the number of repetitions.
 * @return The calculated effective repetitions for the provided range.
 * @customfunction
 */
function calculateEffectiveRepetitions(range) {
  var result = _calculateRepetitionsAndSets(range);
  return result.totalRepetitions;
}


/**
 * Calculate the hypertrophic volume load (HVL) for a range of cells.
 *
 * @param {A1:C1} range The range of cells containing the number of repetitions.
 * @param {number} weight The weight used for the repetitions.
 * @return The calculated hypertrophic volume load (HVL) for the provided range and weight.
 * @customfunction
 */
function calculateHVL(range, weight) {
  var result = _calculateRepetitionsAndSets(range, weight);
  return result.totalHVL;
}


/**
 * Calculate 1RM given weight and repetitions.
 *
 * @param {number} weight The weight lifted.
 * @param {number} reps The number of completed repetitions.
 * @return The estimated 1RM for the provided data.
 * @customfunction
 */
function calculate1RM(weight, reps) {
  return (typeof weight === "number" && typeof reps === "number" && weight > 0 && reps > 0 && reps <= 36) ? weight * (36 / (37 - reps)) : 0;
}


/**
 * Calculate the weight based on e1RM, rep ranges, max weight stack, rounding, and previous weight.
 *
 * @param {number} e1RM The estimated 1RM.
 * @param {number} minRepRange The minimum rep range.
 * @param {number} maxRepRange The maximum rep range.
 * @param {number} maxWeightStack The maximum weight stack.
 * @param {number} rounding The rounding factor.
 * @param {number} prevWeight The previous weight (optional).
 * @param {string} blockString The string containing the block or week number (e.g. "Week 1" or "Block 1").
 * @return The calculated weight for the provided data.
 * @customfunction
 */
function calculateWeight(e1RM, minRepRange, maxRepRange, maxWeightStack, rounding, prevWeight, blockString) {
  if (typeof prevWeight !== 'number') {
    prevWeight = 0;
  }

  if (typeof e1RM !== 'number' || typeof minRepRange !== 'number' || typeof maxRepRange !== 'number' ||
      typeof maxWeightStack !== 'number' || typeof rounding !== 'number') {
    return 0;
  }

  function roundToMultiple(number, multiple) {
    return Math.ceil(number / multiple) * multiple;
  }

  var minWeight = Math.max(prevWeight, e1RM * minRepRange);
  var maxWeight = Math.min(e1RM * maxRepRange, maxWeightStack);
  var calculatedWeight = Math.min(minWeight, maxWeight);

  calculatedWeight = isDeloadTime(blockString) ? Math.min(e1RM * minRepRange, maxWeightStack) : calculatedWeight;

  return roundToMultiple(calculatedWeight, rounding);
}