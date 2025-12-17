/**
 * GymTrack - Main Application
 * Gestisce navigazione, UI e logica principale
 */

const App = (function () {
  'use strict';

  // Stato applicazione
  let state = {
    currentPage: 'exercises',
    currentExercise: null,
    sessionData: null,
    isEditing: false
  };

  // Elementi DOM cache
  let elements = {};

  // ---------- Inizializzazione ----------

  function init() {
    cacheElements();
    bindEvents();
    loadInitialPage();
    checkDeloadStatus();
  }

  function cacheElements() {
    elements = {
      // Pages
      pages: document.querySelectorAll('.page'),
      exercisesPage: document.getElementById('page-exercises'),
      workoutPage: document.getElementById('page-workout'),
      progressPage: document.getElementById('page-progress'),

      // Navigation
      navItems: document.querySelectorAll('.nav-item'),

      // Exercise List
      exerciseList: document.getElementById('exercise-list'),
      addExerciseBtn: document.getElementById('add-exercise-btn'),

      // Exercise Modal
      exerciseModal: document.getElementById('exercise-modal'),
      exerciseForm: document.getElementById('exercise-form'),
      modalTitle: document.getElementById('modal-title'),
      closeModalBtn: document.getElementById('close-modal-btn'),
      cancelModalBtn: document.getElementById('cancel-modal-btn'),
      deleteExerciseBtn: document.getElementById('delete-exercise-btn'),

      // Workout
      workoutExerciseSelect: document.getElementById('workout-exercise-select'),
      workoutContent: document.getElementById('workout-content'),
      deloadAlert: document.getElementById('deload-alert'),
      blockWeekDisplay: document.getElementById('block-week-display'),

      // Header
      currentDateDisplay: document.getElementById('current-date')
    };
  }

  function bindEvents() {
    // Navigation
    elements.navItems.forEach(item => {
      item.addEventListener('click', () => navigateTo(item.dataset.page));
    });

    // Exercise Modal
    elements.addExerciseBtn?.addEventListener('click', () => openExerciseModal());
    elements.closeModalBtn?.addEventListener('click', closeExerciseModal);
    elements.cancelModalBtn?.addEventListener('click', closeExerciseModal);
    elements.exerciseModal?.addEventListener('click', (e) => {
      if (e.target === elements.exerciseModal) closeExerciseModal();
    });
    elements.exerciseForm?.addEventListener('submit', handleExerciseSave);
    elements.deleteExerciseBtn?.addEventListener('click', handleExerciseDelete);

    // Exercise Type Toggle
    document.getElementById('exercise-type')?.addEventListener('change', toggleExerciseFields);

    // Workout exercise select
    elements.workoutExerciseSelect?.addEventListener('change', handleExerciseSelect);

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeExerciseModal();
    });
  }

  function toggleExerciseFields() {
    const type = document.getElementById('exercise-type').value;
    document.querySelectorAll('.type-fields').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(`fields-${type}`);
    if (target) target.classList.remove('hidden');
  }

  function loadInitialPage() {
    updateCurrentDate();
    navigateTo('exercises');
  }

  // ---------- Navigation ----------

  function navigateTo(page) {
    state.currentPage = page;

    // Update pages visibility
    elements.pages.forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(`page-${page}`);
    if (targetPage) targetPage.classList.add('active');

    // Update nav active state
    elements.navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    // Load page content
    switch (page) {
      case 'exercises':
        renderExerciseList();
        break;
      case 'workout':
        initWorkoutPage();
        break;
      case 'progress':
        initProgressPage();
        break;
      case 'settings':
        initSettingsPage();
        break;
    }
  }

  // ---------- Exercise List ----------

  function renderExerciseList() {
    const exercises = Storage.getExercises();

    if (exercises.length === 0) {
      elements.exerciseList.innerHTML = `
        <div class="empty-state">
          <div class="icon">🏋️</div>
          <h3>Nessun esercizio</h3>
          <p>Aggiungi il tuo primo esercizio per iniziare</p>
          <button class="btn btn-primary" onclick="App.openExerciseModal()">
            <span>➕</span> Aggiungi Esercizio
          </button>
        </div>
      `;
      return;
    }

    elements.exerciseList.innerHTML = exercises.map(exercise => {
      let suggestedInfo = '';
      if (exercise.type === 'standard') {
        const suggestedWeight = Calculator.calculateWeight(
          exercise.oneRM,
          exercise.minRepRange,
          exercise.maxRepRange,
          exercise.maxWeight,
          exercise.rounding
        );
        suggestedInfo = `
          <div class="exercise-meta">
            1RM: ${exercise.oneRM}kg | Range: ${Math.round(exercise.minRepRange * 100)}-${Math.round(exercise.maxRepRange * 100)}%
          </div>
          <div class="exercise-meta text-accent">
            Peso suggerito: ${suggestedWeight}kg
          </div>
        `;
      } else if (exercise.type === 'isometric') {
        suggestedInfo = `
          <div class="exercise-meta">
            Target Time: ${exercise.targetTime}s | Step: ${exercise.timeStep}s
          </div>
        `;
      } else if (exercise.type === 'progression') {
        suggestedInfo = `
          <div class="exercise-meta">
            Progression: ${exercise.progressionStep} | Rep Goal: ${exercise.repGoal}
          </div>
        `;
      }


      const lastWorkout = Storage.getLastWorkoutForExercise(exercise.id);
      const last1RM = lastWorkout?.estimated1RM || exercise.oneRM;

      return `
        <div class="exercise-item" data-id="${exercise.id}">
          <div class="exercise-info">
            <div class="exercise-name">${exercise.name}</div>
            ${suggestedInfo}
          </div>
          <div class="exercise-actions">
            <button class="btn btn-ghost btn-icon" onclick="App.openExerciseModal('${exercise.id}')" title="Modifica">
              ✏️
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // ---------- Exercise Modal ----------

  function openExerciseModal(exerciseId = null) {
    state.isEditing = !!exerciseId;
    state.currentExercise = exerciseId ? Storage.getExercise(exerciseId) : null;

    // Update modal title
    elements.modalTitle.textContent = state.isEditing ? 'Modifica Esercizio' : 'Nuovo Esercizio';

    // Show/hide delete button
    elements.deleteExerciseBtn.classList.toggle('hidden', !state.isEditing);

    // Populate form
    const form = elements.exerciseForm;
    if (state.currentExercise) {
      form.name.value = state.currentExercise.name;
      form.type.value = state.currentExercise.type || 'standard';

      // Standard fields
      form.oneRM.value = state.currentExercise.oneRM || '';
      form.minRepRange.value = (state.currentExercise.minRepRange || 0.83) * 100;
      form.maxRepRange.value = (state.currentExercise.maxRepRange || 0.89) * 100;
      form.maxWeight.value = state.currentExercise.maxWeight || 150;
      form.rounding.value = state.currentExercise.rounding || 2.5;
      form.volumeMultiplier.value = state.currentExercise.volumeMultiplier || 1;

      // Type-specific fields (Simplified - no inputs to populate)

      form.trainingVolume.value = state.currentExercise.trainingVolume || 'Moderate';
      form.maxSets.value = state.currentExercise.maxSets || 10;
    } else {
      form.reset();
      form.type.value = 'standard';
      // Default values
      form.minRepRange.value = 83;
      form.maxRepRange.value = 89;
      form.maxWeight.value = 150;
      form.rounding.value = 2.5;
      form.volumeMultiplier.value = 1.0;
      form.trainingVolume.value = 'Moderate';
      form.maxSets.value = 10;
    }

    toggleExerciseFields();
    // Show modal
    elements.exerciseModal.classList.add('active');
    form.name.focus();
  }

  function closeExerciseModal() {
    elements.exerciseModal.classList.remove('active');
    elements.exerciseForm.reset();
    state.currentExercise = null;
    state.isEditing = false;
  }

  function handleExerciseSave(e) {
    e.preventDefault();

    const form = e.target;
    const type = form.type.value;

    const exercise = {
      id: state.currentExercise?.id || null,
      name: form.name.value.trim(),
      type: type,
      // Common
      trainingVolume: form.trainingVolume.value,
      maxSets: parseInt(form.maxSets.value),
      // Standard
      oneRM: type === 'standard' ? parseFloat(form.oneRM.value) : null,
      minRepRange: type === 'standard' ? parseFloat(form.minRepRange.value) / 100 : null,
      maxRepRange: type === 'standard' ? parseFloat(form.maxRepRange.value) / 100 : null,
      maxWeight: type === 'standard' ? parseFloat(form.maxWeight.value) : null,
      rounding: type === 'standard' ? parseFloat(form.rounding.value) : null,
      volumeMultiplier: type === 'standard' ? parseFloat(form.volumeMultiplier?.value || 1) : 1,
      // Isometric
      targetTime: null,
      timeStep: null,
      // Progression
      progressionStep: null,
      repGoal: null,
    };

    Storage.saveExercise(exercise);
    closeExerciseModal();
    renderExerciseList();

    // Update workout select if on workout page
    if (state.currentPage === 'workout') {
      populateExerciseSelect();
    }
  }

  function handleExerciseDelete() {
    if (!state.currentExercise) return;

    if (confirm(`Eliminare "${state.currentExercise.name}"?`)) {
      Storage.deleteExercise(state.currentExercise.id);
      closeExerciseModal();
      renderExerciseList();
    }
  }

  // ---------- Workout Page ----------

  function initWorkoutPage() {
    const settings = Storage.getSettings();

    // Update block/week display
    elements.blockWeekDisplay.textContent = `Blocco ${settings.currentBlock} | Settimana ${settings.currentWeek}`;

    // Check deload
    checkDeloadStatus();

    // Populate exercise select
    populateExerciseSelect();

    // Initialize and render timer
    Timer.init();
    Timer.render('timer-container');

    // Load current session or clear
    const session = Storage.getCurrentSession();
    if (session) {
      state.sessionData = session;
      if (session.currentExerciseId) {
        elements.workoutExerciseSelect.value = session.currentExerciseId;
        renderWorkoutExercise(session.currentExerciseId);
      }
    } else {
      elements.workoutContent.innerHTML = `
        <div class="empty-state">
          <div class="icon">💪</div>
          <h3>Seleziona un esercizio</h3>
          <p>Scegli un esercizio dal menu per iniziare</p>
        </div>
      `;
    }
  }

  function populateExerciseSelect() {
    const exercises = Storage.getExercises();

    elements.workoutExerciseSelect.innerHTML = `
      <option value="">Seleziona esercizio...</option>
      ${exercises.map(ex => `<option value="${ex.id}">${ex.name}</option>`).join('')}
    `;
  }

  function handleExerciseSelect(e) {
    const exerciseId = e.target.value;
    if (exerciseId) {
      renderWorkoutExercise(exerciseId);
    } else {
      elements.workoutContent.innerHTML = '';
    }
  }

  function renderWorkoutExercise(exerciseId) {
    const exercise = Storage.getExercise(exerciseId);
    if (!exercise) return;

    if (exercise.type === 'isometric') {
      renderIsometricWorkout(exercise);
    } else if (exercise.type === 'progression') {
      renderProgressionWorkout(exercise);
    } else {
      renderStandardWorkout(exercise);
    }
  }

  function renderIsometricWorkout(exercise) {
    initializeSessionForExercise(exercise.id, 0);
    const exerciseSession = state.sessionData.exercises.find(e => e.exerciseId === exercise.id);
    state.sessionData.currentExerciseId = exercise.id;

    const timesArray = exerciseSession.sets.map(s => s.reps).filter(t => t > 0);
    const bestTime = Math.max(0, ...timesArray);

    // Status Logic (Simple)
    let statusHtml;
    if (timesArray.length === 0) {
      statusHtml = `
        <div class="workout-status workout-status-ready">
          <div class="workout-status-title">Pronto</div>
          <div class="workout-status-subtitle">Registra i tempi di tenuta</div>
        </div>`;
    } else {
      statusHtml = `
        <div class="workout-status workout-status-continue">
          <div class="workout-status-title">In corso</div>
          <div class="workout-status-subtitle">Miglior tempo oggi: ${bestTime}s</div>
        </div>`;
    }

    elements.workoutContent.innerHTML = `
      <div class="workout-header">
        <h3 class="workout-exercise-name">${exercise.name}</h3>
        <div class="workout-meta">
          <span class="workout-weight">Isometria</span>
          <span class="workout-target">Tempo</span>
        </div>
      </div>
      <div style="height: 20px"></div>
      ${statusHtml}
      ${renderSetsHistory(timesArray, 's')}
      <div class="workout-input-section">
        <label class="workout-input-label">Tempo (Secondi)</label>
        <input type="number" id="workout-reps-input" class="workout-reps-input" 
               inputmode="numeric" pattern="[0-9]*" placeholder="0">
        <div class="flex gap-md mt-md">
          <button class="btn btn-secondary" onclick="App.addSet(null, -5)">-5s</button>
          <button class="btn btn-primary" onclick="App.addSet()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Salva Set
          </button>
          <button class="btn btn-secondary" onclick="App.addSet(null, +5)">+5s</button>
        </div>
      </div>
      ${renderWorkoutStats(timesArray.length, 'Sets', bestTime + 's', 'Best', true)}
    `;
    setupInputListeners();
  }

  function renderProgressionWorkout(exercise) {
    initializeSessionForExercise(exercise.id, 0);
    const exerciseSession = state.sessionData.exercises.find(e => e.exerciseId === exercise.id);
    state.sessionData.currentExerciseId = exercise.id;

    const repsArray = exerciseSession.sets.map(s => s.reps).filter(r => r > 0);
    const maxReps = Math.max(0, ...repsArray);

    let statusHtml;
    if (repsArray.length === 0) {
      statusHtml = `
         <div class="workout-status workout-status-ready">
          <div class="workout-status-title">Pronto</div>
          <div class="workout-status-subtitle">Registra le ripetizioni</div>
        </div>`;
    } else {
      statusHtml = `
        <div class="workout-status workout-status-continue">
          <div class="workout-status-title">In corso</div>
          <div class="workout-status-subtitle">Max Reps oggi: ${maxReps}</div>
        </div>`;
    }

    elements.workoutContent.innerHTML = `
      <div class="workout-header">
        <h3 class="workout-exercise-name">${exercise.name}</h3>
        <div class="workout-meta">
          <span class="workout-weight">Corpo Libero</span>
          <span class="workout-target">Reps</span>
        </div>
      </div>
      <div style="height: 20px"></div>
      ${statusHtml}
      ${renderSetsHistory(repsArray, '')}
      <div class="workout-input-section">
        <label class="workout-input-label">Ripetizioni</label>
        <input type="number" id="workout-reps-input" class="workout-reps-input" 
               inputmode="numeric" pattern="[0-9]*" placeholder="0">
        <button class="btn btn-primary btn-lg w-full mt-md" onclick="App.addSet()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> 
          Salva Set
        </button>
      </div>
      ${renderWorkoutStats(repsArray.length, 'Sets', maxReps, 'Max Reps', true)}
    `;
    setupInputListeners();
  }

  function renderStandardWorkout(exercise) {
    const settings = Storage.getSettings();
    const lastWorkout = Storage.getLastWorkoutForExercise(exercise.id);
    const suggestedWeight = Calculator.calculateWeight(
      exercise.oneRM, exercise.minRepRange, exercise.maxRepRange, exercise.maxWeight, exercise.rounding,
      lastWorkout?.weight || 0, settings.currentWeek
    );
    const repsRange = Calculator.estimateRepsRange(suggestedWeight, exercise.oneRM);

    initializeSessionForExercise(exercise.id, suggestedWeight);
    const exerciseSession = state.sessionData.exercises.find(e => e.exerciseId === exercise.id);
    state.sessionData.currentExerciseId = exercise.id;

    const repsArray = exerciseSession.sets.map(s => s.reps).filter(r => r > 0);
    const effectiveReps = Calculator.calculateEffectiveRepetitions(repsArray);
    const completedSets = repsArray.length;

    const isDeload = Calculator.isDeloadTime(settings.currentWeek);
    const effectiveVolume = isDeload ? 'Low' : exercise.trainingVolume;
    let goalMultiplier = exercise.volumeMultiplier || 1.0;
    if (goalMultiplier === 1.0 && (exercise.name.toLowerCase().includes('panca') || exercise.name.toLowerCase().includes('bench'))) {
      goalMultiplier = 0.5;
    }
    const goalReps = (Calculator.EFFECTIVE_REPS_GOALS[effectiveVolume] || 28.74) * goalMultiplier;
    const isComplete = effectiveReps >= goalReps || completedSets >= exercise.maxSets;
    let new1RM = exercise.oneRM;
    if (repsArray.length > 0) {
      new1RM = Calculator.calculate1RM(exerciseSession.weight, repsArray[0]);
    }

    let statusHtml;
    if (completedSets === 0) {
      statusHtml = `
        <div class="workout-status workout-status-ready">
          <div class="workout-status-title">Pronto</div>
          <div class="workout-status-subtitle">Inserisci le ripetizioni del primo set</div>
        </div>`;
    } else if (isComplete) {
      statusHtml = `
        <div class="workout-status workout-status-complete">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" style="margin-bottom:var(--space-sm)">
            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
          </svg>
          <div class="workout-status-title">Obiettivo raggiunto</div>
          <div class="workout-status-subtitle">Puoi salvare e continuare</div>
        </div>`;
    } else {
      const remainingReps = Math.ceil(goalReps - effectiveReps);
      statusHtml = `
        <div class="workout-status workout-status-continue">
          <div class="workout-status-title">Continua</div>
          <div class="workout-status-subtitle">
            ~${remainingReps} reps effettive rimanenti<br>
            <span style="font-size 0.8em; opacity: 0.8">(Tot: ${effectiveReps.toFixed(2)} / Goal: ${goalReps.toFixed(2)})</span>
          </div>
        </div>`;
    }

    elements.workoutContent.innerHTML = `
      <div class="workout-header">
        <h3 class="workout-exercise-name">${exercise.name}</h3>
        <div class="workout-meta">
          <span class="workout-weight">${exerciseSession.weight} kg</span>
          <span class="workout-target">${repsRange.min}-${repsRange.max} reps</span>
        </div>
      </div>
      <div class="workout-weight-section">
        <button class="weight-btn" onclick="App.adjustWeight(-${exercise.rounding})">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div class="weight-display">
          <input type="number" id="weight-input-large" class="weight-input-large" 
                 value="${exerciseSession.weight}" onchange="App.handleWeightChange(this.value)">
          <span class="weight-unit">kg</span>
        </div>
        <button class="weight-btn" onclick="App.adjustWeight(${exercise.rounding})">
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
        </button>
      </div>
      <div class="weight-suggestion-text">(1RM: ${exercise.oneRM}kg)</div>
      ${statusHtml}
      ${renderSetsHistory(repsArray, '')}
      <div class="workout-input-section">
        <label class="workout-input-label">Ripetizioni</label>
        <input type="number" id="workout-reps-input" class="workout-reps-input" 
               inputmode="numeric" pattern="[0-9]*" placeholder="0">
        <button class="btn btn-primary btn-lg w-full mt-md" onclick="App.addSet()">
          Salva Set
        </button>
      </div>
      ${renderWorkoutStats(effectiveReps.toFixed(1), 'Eff. Reps', Math.round(new1RM) + 'kg', 'Est. 1RM')}
    `;
    setupInputListeners();
  }

  // --- ACTIONS & HELPERS ---

  function initializeSessionForExercise(exerciseId, initialWeight) {
    const settings = Storage.getSettings();
    if (!state.sessionData) {
      state.sessionData = {
        date: new Date().toISOString().split('T')[0],
        block: settings.currentBlock,
        week: settings.currentWeek,
        exercises: []
      };
    }
    let exerciseSession = state.sessionData.exercises.find(e => e.exerciseId === exerciseId);
    if (!exerciseSession) {
      exerciseSession = {
        exerciseId: exerciseId,
        weight: initialWeight,
        sets: []
      };
      state.sessionData.exercises.push(exerciseSession);
    }
  }

  function renderSetsHistory(valuesArray, suffix) {
    if (valuesArray.length === 0) return '';
    return `
      <div class="workout-history">
        ${valuesArray.map((val, i) => `
          <div class="history-chip" onclick="App.removeSet(${i})" title="Clicca per eliminare">
            <span>${val}${suffix}</span>
            <svg class="chip-delete" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderWorkoutStats(val1, label1, val2, label2, isSimple = false) {
    return `
      <div class="workout-stats" style="${isSimple ? 'background:var(--color-bg-card);' : ''}">
        <div class="workout-stat">
          <div class="workout-stat-value">${val1}</div>
          <div class="workout-stat-label">${label1}</div>
        </div>
        <div class="workout-stat">
          <div class="workout-stat-value">${val2}</div>
          <div class="workout-stat-label">${label2}</div>
        </div>
      </div>
    `;
  }

  function setupInputListeners() {
    const input = document.getElementById('workout-reps-input');
    if (input) {
      input.focus();
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') App.addSet();
      });
    }
  }

  function updateSetReps(index, value) {
    const reps = parseInt(value) || 0;
    if (!state.sessionData?.currentExerciseId) return;

    const exerciseSession = state.sessionData.exercises.find(
      e => e.exerciseId === state.sessionData.currentExerciseId
    );
    if (exerciseSession) {
      // Ensure sets array is large enough
      while (exerciseSession.sets.length <= index) {
        exerciseSession.sets.push({ reps: 0, rir: 0 });
      }
      exerciseSession.sets[index].reps = reps;
      Storage.saveCurrentSession(state.sessionData);
      // Refresh to recalculate stats
      renderWorkoutExercise(state.sessionData.currentExerciseId);
    }
  }

  function updateSetRIR(index, value) {
    const rir = parseInt(value) || 0;
    if (!state.sessionData?.currentExerciseId) return;

    const exerciseSession = state.sessionData.exercises.find(
      e => e.exerciseId === state.sessionData.currentExerciseId
    );
    if (exerciseSession && exerciseSession.sets[index]) {
      exerciseSession.sets[index].rir = rir;
      Storage.saveCurrentSession(state.sessionData);
    }
  }

  function handleWeightChange(value) {
    updateWeight(parseFloat(value));
  }

  function addSet(repsOverride = null, timeDelta = null) {
    if (!state.sessionData?.currentExerciseId) return;

    const exerciseSession = state.sessionData.exercises.find(
      e => e.exerciseId === state.sessionData.currentExerciseId
    );
    if (!exerciseSession) return;

    let value;
    const input = document.getElementById('workout-reps-input');

    // Logic for +/- time buttons in Isometric
    if (timeDelta !== null && input) {
      const currentVal = parseInt(input.value) || 0;
      input.value = Math.max(0, currentVal + timeDelta);
      input.focus();
      return; // Just update input, don't submit yet
    }

    if (repsOverride !== null) {
      value = repsOverride;
    } else {
      value = parseInt(input?.value);
    }

    if (!value || value <= 0) return;

    exerciseSession.sets.push({ reps: value, rir: 0 });
    Storage.saveCurrentSession(state.sessionData);
    renderWorkoutExercise(state.sessionData.currentExerciseId);
  }

  function submitSet() { addSet(); }

  function adjustWeight(delta) {
    const input = document.getElementById('weight-input-large');
    if (!input) return;
    const newWeight = Math.max(0, parseFloat(input.value) + delta);
    input.value = newWeight;
    updateWeight(newWeight);
  }

  function handleWeightChange(value) {
    updateWeight(parseFloat(value));
  }

  function updateWeight(weight) {
    if (!state.sessionData?.currentExerciseId || isNaN(weight)) return;
    const exerciseSession = state.sessionData.exercises.find(
      e => e.exerciseId === state.sessionData.currentExerciseId
    );
    if (exerciseSession) {
      exerciseSession.weight = weight;
      Storage.saveCurrentSession(state.sessionData);
      renderWorkoutExercise(state.sessionData.currentExerciseId);
    }
  }

  function removeSet(index) {
    if (!state.sessionData?.currentExerciseId) return;
    const exerciseSession = state.sessionData.exercises.find(
      e => e.exerciseId === state.sessionData.currentExerciseId
    );
    if (exerciseSession && exerciseSession.sets[index]) {
      exerciseSession.sets.splice(index, 1);
      Storage.saveCurrentSession(state.sessionData);
      renderWorkoutExercise(state.sessionData.currentExerciseId);
    }
  }

  function saveWorkoutExercise() {
    if (!state.sessionData?.currentExerciseId) return;
    const exerciseSession = state.sessionData.exercises.find(
      e => e.exerciseId === state.sessionData.currentExerciseId
    );
    if (!exerciseSession || exerciseSession.sets.filter(s => s.reps > 0).length === 0) {
      alert('Inserisci almeno un set per salvare.');
      return;
    }

    // Logic for 1RM update only for Standard exercises?
    // For now, only calculate 1RM if we have weight > 0
    if (exerciseSession.weight > 0) {
      const repsArray = exerciseSession.sets.map(s => s.reps).filter(r => r > 0);
      const estimated1RM = Calculator.calculate1RM(exerciseSession.weight, repsArray[0]);
      exerciseSession.estimated1RM = estimated1RM;

      const exercise = Storage.getExercise(state.sessionData.currentExerciseId);
      if (exercise.type === 'standard' && estimated1RM > exercise.oneRM) {
        exercise.oneRM = estimated1RM;
        Storage.saveExercise(exercise);
      }
    }

    Storage.saveWorkout(state.sessionData);
    state.sessionData.currentExerciseId = null;
    elements.workoutExerciseSelect.value = '';
    alert('✅ Esercizio salvato!');

    // Clear Content
    elements.workoutContent.innerHTML = `
      <div class="empty-state">
        <div class="icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#A5D6A7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <h3>Esercizio salvato!</h3>
        <p>Seleziona un altro esercizio o termina la sessione</p>
      </div>
    `;
  }

  // ---------- Progress Page ----------

  function initProgressPage() {
    const exercises = Storage.getExercises();
    const progressContent = document.getElementById('progress-content');

    if (exercises.length === 0) {
      progressContent.innerHTML = `
      <div class="empty-state">
        <div class="icon">📊</div>
        <h3>Nessun dato</h3>
        <p>Completa qualche allenamento per vedere i progressi</p>
      </div>
    `;
      return;
    }

    let html = '';

    exercises.forEach(exercise => {
      const workouts = Storage.getWorkoutsByExercise(exercise.id);
      const recentWorkouts = workouts.slice(0, 8);

      // Calculate progress
      let trendHtml = '';
      let chartHtml = '';

      if (recentWorkouts.length > 0) {
        const first1RM = recentWorkouts[recentWorkouts.length - 1]?.estimated1RM || exercise.oneRM;
        const last1RM = recentWorkouts[0]?.estimated1RM || exercise.oneRM;
        const progress = Calculator.calculateProgress(first1RM, last1RM);
        const trend = Calculator.getTrendStatus(progress);

        const trendIcon = trend === 'increase' ? '📈' : trend === 'decrease' ? '📉' : '➡️';

        trendHtml = `
          <span class="badge ${trend === 'increase' ? 'badge-success' : trend === 'decrease' ? 'badge-danger' : 'badge-accent'}">
            ${trendIcon} ${progress > 0 ? '+' : ''}${progress.toFixed(1)}%
          </span>
        `;

        // Create chart bars
        const max1RM = Math.max(...recentWorkouts.map(w => w.estimated1RM || 0), exercise.oneRM);
        chartHtml = `
          <div class="chart-line">
            ${recentWorkouts.reverse().map((w, i) => {
          const height = ((w.estimated1RM || exercise.oneRM) / max1RM) * 100;
          const isCurrent = i === recentWorkouts.length - 1;
          return `<div class="chart-line-bar ${isCurrent ? 'current' : ''}" style="height: ${height}%" title="${(w.estimated1RM || 0).toFixed(1)}kg"></div>`;
        }).join('')}
          </div>
        `;
      }

      html += `
        <div class="card">
          <div class="card-header">
            <div class="card-title">${exercise.name}</div>
            ${trendHtml}
          </div>
          ${chartHtml}
          <div class="stats-row" style="border-top: ${chartHtml ? '1px solid var(--color-border)' : 'none'}; padding-top: ${chartHtml ? 'var(--space-md)' : '0'}; margin-top: ${chartHtml ? 'var(--space-md)' : '0'};">
            <div class="stat-item">
              <div class="stat-value">${exercise.oneRM.toFixed(1)}kg</div>
              <div class="stat-label">1RM Attuale</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${workouts.length}</div>
              <div class="stat-label">Sessioni</div>
            </div>
          </div>
        </div>
      `;
    });

    progressContent.innerHTML = html;
  }

  // ---------- Settings Page ----------

  function initSettingsPage() {
    const settings = Storage.getSettings();
    const settingsContent = document.getElementById('settings-content');

    settingsContent.innerHTML = `
      <div class="settings-section">
        <div class="settings-section-title">Progressione</div>
        <div class="card">
          <div class="settings-item">
            <div>
              <div class="settings-item-label">Blocco Corrente</div>
              <div class="settings-item-description">Numero del blocco di allenamento</div>
            </div>
            <div class="stepper">
              <button class="stepper-btn" onclick="App.updateBlock(-1)">−</button>
              <span class="stepper-value" id="block-value">${settings.currentBlock}</span>
              <button class="stepper-btn" onclick="App.updateBlock(1)">+</button>
            </div>
          </div>
          <div class="settings-item">
            <div>
              <div class="settings-item-label">Settimana Corrente</div>
              <div class="settings-item-description">Settimana nel blocco (1-4)</div>
            </div>
            <div class="stepper">
              <button class="stepper-btn" onclick="App.updateWeek(-1)">−</button>
              <span class="stepper-value" id="week-value">${settings.currentWeek}</span>
              <button class="stepper-btn" onclick="App.updateWeek(1)">+</button>
            </div>
          </div>
          <div class="settings-item">
            <div>
              <div class="settings-item-label">Frequenza Deload</div>
              <div class="settings-item-description">Deload ogni N blocchi (0 = disabilitato)</div>
            </div>
            <div class="stepper">
              <button class="stepper-btn" onclick="App.updateDeloadFreq(-1)">−</button>
              <span class="stepper-value" id="deload-freq-value">${settings.deloadFrequency}</span>
              <button class="stepper-btn" onclick="App.updateDeloadFreq(1)">+</button>
            </div>
          </div>
        </div>
      </div >

      <div class="settings-section">
        <div class="settings-section-title">Timer</div>
        <div class="card">
          <div class="settings-item">
            <div>
              <div class="settings-item-label">Tempo di Recupero</div>
              <div class="settings-item-description">Durata default del timer (secondi)</div>
            </div>
            <div class="stepper">
              <button class="stepper-btn" onclick="App.updateRestTimer(-30)">−</button>
              <span class="stepper-value" id="rest-timer-value">${settings.restTimerSeconds}s</span>
              <button class="stepper-btn" onclick="App.updateRestTimer(30)">+</button>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Dati</div>
        <div class="card">
          <div class="settings-item">
            <div>
              <div class="settings-item-label">Esporta Dati</div>
              <div class="settings-item-description">Scarica backup JSON</div>
            </div>
            <button class="btn btn-secondary" onclick="App.exportData()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Esporta
            </button>
          </div>
          <div class="settings-item">
            <div>
              <div class="settings-item-label">Importa Dati</div>
              <div class="settings-item-description">Ripristina da backup</div>
            </div>
            <label class="btn btn-secondary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Importa
              <input type="file" accept=".json" onchange="App.importData(event)" style="display: none">
            </label>
          </div>
          <div class="settings-item">
            <div>
              <div class="settings-item-label text-danger">Cancella Tutto</div>
              <div class="settings-item-description">Elimina tutti i dati salvati</div>
            </div>
            <button class="btn btn-danger" onclick="App.clearAllData()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Cancella
            </button>
          </div>
        </div>
      </div>

      <div class="text-center text-muted mt-lg">
        <small>GymTrack v1.0 | Dati salvati localmente</small>
      </div>
`;
  }

  // Settings handlers
  function updateBlock(delta) {
    const settings = Storage.getSettings();
    settings.currentBlock = Math.max(1, settings.currentBlock + delta);
    Storage.updateSettings(settings);
    document.getElementById('block-value').textContent = settings.currentBlock;
    checkDeloadStatus();
  }

  function updateWeek(delta) {
    const settings = Storage.getSettings();
    settings.currentWeek = Math.max(1, Math.min(4, settings.currentWeek + delta));
    Storage.updateSettings(settings);
    document.getElementById('week-value').textContent = settings.currentWeek;
  }

  function updateDeloadFreq(delta) {
    const settings = Storage.getSettings();
    settings.deloadFrequency = Math.max(0, settings.deloadFrequency + delta);
    Storage.updateSettings(settings);
    document.getElementById('deload-freq-value').textContent = settings.deloadFrequency;
    checkDeloadStatus();
  }

  function updateRestTimer(delta) {
    const settings = Storage.getSettings();
    settings.restTimerSeconds = Math.max(30, Math.min(300, settings.restTimerSeconds + delta));
    Storage.updateSettings(settings);
    document.getElementById('rest-timer-value').textContent = settings.restTimerSeconds + 's';
    Timer.init();
  }

  function exportData() {
    const data = Storage.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gymtrack - backup - ${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      if (Storage.importData(e.target.result)) {
        alert('✅ Dati importati con successo!');
        navigateTo('exercises');
      } else {
        alert('❌ Errore durante l\'importazione');
      }
    };
    reader.readAsText(file);
  }

  function clearAllData() {
    if (confirm('⚠️ Eliminare TUTTI i dati? Questa azione non può essere annullata.')) {
      if (confirm('Sei sicuro? Tutti gli esercizi e allenamenti verranno eliminati.')) {
        Storage.clearAll();
        alert('Dati eliminati.');
        navigateTo('exercises');
      }
    }
  }

  // ---------- Utilities ----------

  function updateCurrentDate() {
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const dateStr = new Date().toLocaleDateString('it-IT', options);
    if (elements.currentDateDisplay) {
      elements.currentDateDisplay.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    }
  }

  function checkDeloadStatus() {
    const settings = Storage.getSettings();
    const isDeload = Calculator.isDeloadTime(settings.currentWeek);

    if (elements.deloadAlert) {
      elements.deloadAlert.classList.toggle('hidden', !isDeload);
    }
  }

  // API pubblica
  return {
    init,
    navigateTo,
    openExerciseModal,
    updateWeight,
    updateSetReps,
    updateSetRIR,
    addSet,
    submitSet,
    handleWeightChange,
    adjustWeight,
    removeSet,
    saveWorkoutExercise,
    // Settings
    updateBlock,
    updateWeek,
    updateDeloadFreq,
    updateRestTimer,
    exportData,
    importData,
    clearAllData
  };
})();

// Inizializza app quando DOM è pronto
document.addEventListener('DOMContentLoaded', App.init);

