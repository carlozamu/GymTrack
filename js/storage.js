/**
 * GymTrack - Storage Module
 * Gestione persistenza dati con LocalStorage
 */

const Storage = (function () {
    'use strict';

    const STORAGE_KEYS = {
        EXERCISES: 'gymtrack_exercises',
        WORKOUTS: 'gymtrack_workouts',
        SETTINGS: 'gymtrack_settings',
        CURRENT_SESSION: 'gymtrack_current_session'
    };

    // Struttura settings di default
    const DEFAULT_SETTINGS = {
        deloadFrequency: 4,
        currentBlock: 1,
        currentWeek: 1,
        defaultTrainingVolume: 'Moderate',
        restTimerSeconds: 120
    };

    // ---------- Helper Functions ----------

    /**
     * Genera un UUID v4
     * @returns {string} UUID
     */
    function generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Legge dati dal LocalStorage
     * @param {string} key - Chiave storage
     * @param {*} defaultValue - Valore di default
     * @returns {*} Dati parsati o default
     */
    function read(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error('Storage read error:', e);
            return defaultValue;
        }
    }

    /**
     * Scrive dati nel LocalStorage
     * @param {string} key - Chiave storage
     * @param {*} data - Dati da salvare
     * @returns {boolean} Successo operazione
     */
    function write(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Storage write error:', e);
            return false;
        }
    }

    // ---------- Exercises API ----------

    /**
     * Ottiene tutti gli esercizi
     * @returns {Array} Lista esercizi
     */
    function getExercises() {
        return read(STORAGE_KEYS.EXERCISES, []);
    }

    /**
     * Ottiene un esercizio per ID
     * @param {string} id - ID esercizio
     * @returns {Object|null} Esercizio o null
     */
    function getExercise(id) {
        const exercises = getExercises();
        return exercises.find(ex => ex.id === id) || null;
    }

    /**
     * Salva un nuovo esercizio o aggiorna esistente
     * @param {Object} exercise - Dati esercizio
     * @returns {Object} Esercizio salvato con ID
     */
    function saveExercise(exercise) {
        const exercises = getExercises();

        if (exercise.id) {
            // Aggiorna esistente
            const index = exercises.findIndex(ex => ex.id === exercise.id);
            if (index !== -1) {
                exercises[index] = { ...exercises[index], ...exercise, updatedAt: new Date().toISOString() };
            }
        } else {
            // Nuovo esercizio
            exercise.id = generateId();
            exercise.createdAt = new Date().toISOString();
            exercise.updatedAt = exercise.createdAt;
            exercises.push(exercise);
        }

        write(STORAGE_KEYS.EXERCISES, exercises);
        return exercise;
    }

    /**
     * Elimina un esercizio
     * @param {string} id - ID esercizio
     * @returns {boolean} Successo operazione
     */
    function deleteExercise(id) {
        const exercises = getExercises().filter(ex => ex.id !== id);
        return write(STORAGE_KEYS.EXERCISES, exercises);
    }

    // ---------- Workouts API ----------

    /**
     * Ottiene tutti gli allenamenti
     * @returns {Array} Lista allenamenti
     */
    function getWorkouts() {
        return read(STORAGE_KEYS.WORKOUTS, []);
    }

    /**
     * Ottiene allenamenti per un esercizio specifico
     * @param {string} exerciseId - ID esercizio
     * @returns {Array} Lista allenamenti filtrati
     */
    function getWorkoutsByExercise(exerciseId) {
        const workouts = getWorkouts();
        return workouts
            .filter(w => w.exercises && w.exercises.some(e => e.exerciseId === exerciseId))
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    /**
     * Ottiene l'ultimo allenamento per un esercizio
     * @param {string} exerciseId - ID esercizio
     * @returns {Object|null} Ultimo allenamento o null
     */
    function getLastWorkoutForExercise(exerciseId) {
        const workouts = getWorkoutsByExercise(exerciseId);
        if (workouts.length === 0) return null;

        const lastWorkout = workouts[0];
        const exerciseData = lastWorkout.exercises.find(e => e.exerciseId === exerciseId);
        return {
            date: lastWorkout.date,
            block: lastWorkout.block,
            week: lastWorkout.week,
            ...exerciseData
        };
    }

    /**
     * Salva un nuovo allenamento
     * @param {Object} workout - Dati allenamento
     * @returns {Object} Allenamento salvato con ID
     */
    function saveWorkout(workout) {
        const workouts = getWorkouts();

        if (!workout.id) {
            workout.id = generateId();
        }
        workout.savedAt = new Date().toISOString();

        // Controlla se esiste già un workout per la stessa data
        const existingIndex = workouts.findIndex(w => w.date === workout.date);
        if (existingIndex !== -1) {
            // Merge esercizi
            const existing = workouts[existingIndex];
            workout.exercises.forEach(newEx => {
                const exIdx = existing.exercises.findIndex(e => e.exerciseId === newEx.exerciseId);
                if (exIdx !== -1) {
                    existing.exercises[exIdx] = newEx;
                } else {
                    existing.exercises.push(newEx);
                }
            });
            workouts[existingIndex] = { ...existing, ...workout, exercises: existing.exercises };
        } else {
            workouts.push(workout);
        }

        write(STORAGE_KEYS.WORKOUTS, workouts);
        return workout;
    }

    /**
     * Elimina un allenamento
     * @param {string} id - ID allenamento
     * @returns {boolean} Successo operazione
     */
    function deleteWorkout(id) {
        const workouts = getWorkouts().filter(w => w.id !== id);
        return write(STORAGE_KEYS.WORKOUTS, workouts);
    }

    // ---------- Current Session API ----------

    /**
     * Ottiene la sessione corrente (in corso)
     * @returns {Object|null} Sessione corrente
     */
    function getCurrentSession() {
        return read(STORAGE_KEYS.CURRENT_SESSION, null);
    }

    /**
     * Salva la sessione corrente
     * @param {Object} session - Dati sessione
     * @returns {boolean} Successo
     */
    function saveCurrentSession(session) {
        return write(STORAGE_KEYS.CURRENT_SESSION, session);
    }

    /**
     * Pulisce la sessione corrente
     * @returns {boolean} Successo
     */
    function clearCurrentSession() {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
        return true;
    }

    // ---------- Settings API ----------

    /**
     * Ottiene le impostazioni
     * @returns {Object} Impostazioni
     */
    function getSettings() {
        return { ...DEFAULT_SETTINGS, ...read(STORAGE_KEYS.SETTINGS, {}) };
    }

    /**
     * Aggiorna le impostazioni
     * @param {Object} updates - Aggiornamenti parziali
     * @returns {Object} Impostazioni aggiornate
     */
    function updateSettings(updates) {
        const settings = { ...getSettings(), ...updates };
        write(STORAGE_KEYS.SETTINGS, settings);
        return settings;
    }

    /**
     * Incrementa blocco/settimana
     */
    function advanceWeek() {
        const settings = getSettings();
        settings.currentWeek++;
        if (settings.currentWeek > 4) {
            settings.currentWeek = 1;
            settings.currentBlock++;
        }
        return updateSettings(settings);
    }

    // ---------- Export/Import API ----------

    /**
     * Esporta tutti i dati come JSON
     * @returns {string} JSON string
     */
    function exportData() {
        return JSON.stringify({
            version: '1.0',
            exportedAt: new Date().toISOString(),
            exercises: getExercises(),
            workouts: getWorkouts(),
            settings: getSettings()
        }, null, 2);
    }

    /**
     * Importa dati da JSON
     * @param {string} jsonString - JSON da importare
     * @returns {boolean} Successo operazione
     */
    function importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);

            if (data.exercises) {
                write(STORAGE_KEYS.EXERCISES, data.exercises);
            }
            if (data.workouts) {
                write(STORAGE_KEYS.WORKOUTS, data.workouts);
            }
            if (data.settings) {
                write(STORAGE_KEYS.SETTINGS, data.settings);
            }

            return true;
        } catch (e) {
            console.error('Import error:', e);
            return false;
        }
    }

    /**
     * Pulisce tutti i dati (reset)
     * @returns {boolean} Successo
     */
    function clearAll() {
        Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
        return true;
    }

    // API pubblica
    return {
        // Exercises
        getExercises,
        getExercise,
        saveExercise,
        deleteExercise,

        // Workouts
        getWorkouts,
        getWorkoutsByExercise,
        getLastWorkoutForExercise,
        saveWorkout,
        deleteWorkout,

        // Session
        getCurrentSession,
        saveCurrentSession,
        clearCurrentSession,

        // Settings
        getSettings,
        updateSettings,
        advanceWeek,

        // Export/Import
        exportData,
        importData,
        clearAll,

        // Utils
        generateId
    };
})();

// Export per test/moduli
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}
