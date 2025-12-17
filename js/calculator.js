/**
 * GymTrack - Calculator Module
 * Port delle funzioni dal codice Google Apps Script
 * Gestisce tutti i calcoli per 1RM, peso, set, ripetizioni effettive e HVL
 */

const Calculator = (function() {
  'use strict';

  // Configurazione deload
  const DELOAD_FREQUENCY = 4; // Deload ogni 4 blocchi

  // Tabella lookup per ripetizioni effettive (ipertrofiche)
  // Index = reps completate, value = effective reps
  const EFFECTIVE_REPS_TABLE = [0, 1, 2, 2.99, 3.94, 4.79, 5.41, 5.64, 5.65];

  // Goal ripetizioni effettive per volume
  const EFFECTIVE_REPS_GOALS = {
    Low: 19.16,
    Moderate: 28.74
  };

  /**
   * Verifica se è il momento del deload
   * @param {number} blockNumber - Numero del blocco corrente (1-indexed)
   * @returns {boolean} True se è settimana di deload
   */
  function isDeloadTime(blockNumber) {
    if (DELOAD_FREQUENCY === 0 || typeof blockNumber !== 'number') {
      return false;
    }
    return ((blockNumber - 1) % DELOAD_FREQUENCY) === 0;
  }

  /**
   * Calcola il 1RM stimato (formula Brzycki modificata)
   * @param {number} weight - Peso sollevato
   * @param {number} reps - Ripetizioni completate
   * @returns {number} 1RM stimato
   */
  function calculate1RM(weight, reps) {
    if (typeof weight !== 'number' || typeof reps !== 'number' ||
        weight <= 0 || reps <= 0 || reps > 36) {
      return 0;
    }
    return weight * (36 / (37 - reps));
  }

  /**
   * Calcola le ripetizioni effettive per un singolo set
   * @param {number} reps - Ripetizioni completate a cedimento (RIR 0)
   * @returns {number} Ripetizioni effettive
   */
  function calculateSingleEffectiveReps(reps) {
    if (!reps || typeof reps !== 'number' || reps <= 0) {
      return 0;
    }
    const roundedReps = Math.round(reps);
    const index = Math.min(roundedReps, EFFECTIVE_REPS_TABLE.length - 1);
    return EFFECTIVE_REPS_TABLE[index];
  }

  /**
   * Calcola le ripetizioni effettive totali per un array di set
   * @param {number[]} repsArray - Array di ripetizioni per ogni set
   * @returns {number} Totale ripetizioni effettive
   */
  function calculateEffectiveRepetitions(repsArray) {
    if (!Array.isArray(repsArray)) {
      return 0;
    }
    
    let total = 0;
    for (const reps of repsArray) {
      if (typeof reps === 'number' && reps > 0) {
        total += calculateSingleEffectiveReps(reps);
      } else {
        break; // Stop al primo valore non valido
      }
    }
    return total;
  }

  /**
   * Calcola l'Hypertrophic Volume Load (HVL)
   * @param {number[]} repsArray - Array di ripetizioni per ogni set
   * @param {number} weight - Peso usato
   * @returns {number} HVL totale
   */
  function calculateHVL(repsArray, weight) {
    if (!Array.isArray(repsArray) || typeof weight !== 'number' || weight <= 0) {
      return 0;
    }

    let totalHVL = 0;
    for (const reps of repsArray) {
      if (typeof reps === 'number' && reps > 0) {
        const effectiveReps = calculateSingleEffectiveReps(reps);
        const estimated1RM = calculate1RM(weight, reps);
        totalHVL += estimated1RM * effectiveReps;
      } else {
        break;
      }
    }
    return totalHVL;
  }

  /**
   * Calcola il numero di set consigliati basato sul volume
   * @param {number[]} repsArray - Array di ripetizioni completate
   * @param {number} blockNumber - Numero del blocco corrente
   * @param {number} [startingReps=0] - Ripetizioni effettive iniziali (per esercizi precedenti)
   * @param {number} [goalMultiplier=1] - Moltiplicatore del goal
   * @param {string} [trainingVolume='Moderate'] - Volume di allenamento ('Low' | 'Moderate')
   * @param {number} [maxSets=10] - Numero massimo di set
   * @returns {number} Numero di set consigliati
   */
  function calculateSets(repsArray, blockNumber, startingReps = 0, goalMultiplier = 1, trainingVolume = 'Moderate', maxSets = 10) {
    // Validazione parametri
    if (typeof goalMultiplier !== 'number' || goalMultiplier > 1) {
      goalMultiplier = 1;
    }
    if (typeof maxSets !== 'number' || maxSets > 10) {
      maxSets = 10;
    }
    if (typeof startingReps !== 'number' || startingReps < 0) {
      startingReps = 0;
    }

    // Forza volume basso durante deload
    if (isDeloadTime(blockNumber)) {
      trainingVolume = 'Low';
    }

    // Calcola goal
    let effectiveRepsGoal = EFFECTIVE_REPS_GOALS[trainingVolume] || EFFECTIVE_REPS_GOALS.Moderate;
    effectiveRepsGoal *= goalMultiplier;

    // Calcola ripetizioni effettive totali
    let completedSets = 0;
    let totalReps = startingReps;

    if (Array.isArray(repsArray)) {
      for (const reps of repsArray) {
        if (typeof reps === 'number' && reps > 0) {
          completedSets++;
          totalReps += calculateSingleEffectiveReps(reps);
        } else {
          break;
        }
      }
    }

    // Calcola set consigliati
    const suggestedSets = totalReps < effectiveRepsGoal ? completedSets + 1 : completedSets;
    return Math.min(Math.max(suggestedSets, 1), maxSets);
  }

  /**
   * Calcola il peso consigliato per la prossima sessione
   * @param {number} e1RM - 1RM stimato
   * @param {number} minRepRange - Percentuale minima del range (es: 0.83)
   * @param {number} maxRepRange - Percentuale massima del range (es: 0.89)
   * @param {number} maxWeightStack - Peso massimo disponibile
   * @param {number} rounding - Fattore di arrotondamento
   * @param {number} [prevWeight=0] - Peso usato precedentemente
   * @param {number} [blockNumber=1] - Numero del blocco corrente
   * @returns {number} Peso consigliato arrotondato
   */
  function calculateWeight(e1RM, minRepRange, maxRepRange, maxWeightStack, rounding, prevWeight = 0, blockNumber = 1) {
    // Validazione parametri
    if (typeof e1RM !== 'number' || typeof minRepRange !== 'number' ||
        typeof maxRepRange !== 'number' || typeof maxWeightStack !== 'number' ||
        typeof rounding !== 'number') {
      return 0;
    }

    if (typeof prevWeight !== 'number') {
      prevWeight = 0;
    }

    // Funzione helper per arrotondamento
    function roundToMultiple(number, multiple) {
      return Math.ceil(number / multiple) * multiple;
    }

    // Calcola range di peso
    const minWeight = Math.max(prevWeight, e1RM * minRepRange);
    const maxWeight = Math.min(e1RM * maxRepRange, maxWeightStack);
    let calculatedWeight = Math.min(minWeight, maxWeight);

    // Durante deload, usa il peso minimo del range
    if (isDeloadTime(blockNumber)) {
      calculatedWeight = Math.min(e1RM * minRepRange, maxWeightStack);
    }

    return roundToMultiple(calculatedWeight, rounding);
  }

  /**
   * Stima il range di ripetizioni possibili dato un peso
   * @param {number} weight - Peso da usare
   * @param {number} e1RM - 1RM stimato
   * @returns {{min: number, max: number}} Range di ripetizioni
   */
  function estimateRepsRange(weight, e1RM) {
    if (typeof weight !== 'number' || typeof e1RM !== 'number' ||
        weight <= 0 || e1RM <= 0 || weight >= e1RM) {
      return { min: 0, max: 0 };
    }

    // Inverso della formula 1RM: reps = 37 - (36 * weight / 1RM)
    const estimatedReps = 37 - (36 * weight / e1RM);
    const reps = Math.max(1, Math.floor(estimatedReps));
    
    return {
      min: Math.max(1, reps - 2),
      max: Math.min(36, reps + 2)
    };
  }

  /**
   * Calcola il progresso percentuale tra due 1RM
   * @param {number} previous1RM - 1RM precedente
   * @param {number} current1RM - 1RM attuale
   * @returns {number} Percentuale di variazione
   */
  function calculateProgress(previous1RM, current1RM) {
    if (typeof previous1RM !== 'number' || typeof current1RM !== 'number' ||
        previous1RM <= 0) {
      return 0;
    }
    return ((current1RM - previous1RM) / previous1RM) * 100;
  }

  /**
   * Determina lo status del trend di un esercizio
   * @param {number} progressPercentage - Percentuale di progresso
   * @returns {string} 'increase' | 'decrease' | 'stable'
   */
  function getTrendStatus(progressPercentage) {
    if (progressPercentage > 2) return 'increase';
    if (progressPercentage < -2) return 'decrease';
    return 'stable';
  }

  // API pubblica
  return {
    isDeloadTime,
    calculate1RM,
    calculateEffectiveRepetitions,
    calculateHVL,
    calculateSets,
    calculateWeight,
    estimateRepsRange,
    calculateProgress,
    getTrendStatus,
    DELOAD_FREQUENCY,
    EFFECTIVE_REPS_GOALS
  };
})();

// Export per test/moduli
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Calculator;
}
