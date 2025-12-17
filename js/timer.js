/**
 * GymTrack - Timer Module
 * Timer per pausa tra i set con notifiche audio/vibrazione
 */

const Timer = (function () {
    'use strict';

    // Stato timer
    let state = {
        seconds: 0,
        targetSeconds: 120,
        isRunning: false,
        intervalId: null
    };

    // Audio context per beep
    let audioContext = null;

    // Elementi DOM
    let elements = {};

    /**
     * Inizializza il timer
     */
    function init() {
        const settings = Storage.getSettings();
        state.targetSeconds = settings.restTimerSeconds || 120;
        state.seconds = state.targetSeconds;
    }

    /**
     * Crea e rende il timer nel container specificato
     * @param {string} containerId - ID del container
     */
    function render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
      <div class="timer-card card">
        <div class="timer-header">
          <span class="timer-title">⏱️ Pausa</span>
          <div class="timer-presets">
            <button class="btn btn-ghost timer-preset" data-seconds="60">1:00</button>
            <button class="btn btn-ghost timer-preset" data-seconds="90">1:30</button>
            <button class="btn btn-ghost timer-preset active" data-seconds="120">2:00</button>
            <button class="btn btn-ghost timer-preset" data-seconds="180">3:00</button>
          </div>
        </div>
        
        <div class="timer-display">
          <span id="timer-minutes">02</span>
          <span class="timer-separator">:</span>
          <span id="timer-seconds">00</span>
        </div>
        
        <div class="timer-progress">
          <div class="progress-bar">
            <div class="progress-bar-fill" id="timer-progress-bar" style="width: 100%"></div>
          </div>
        </div>
        
        <div class="timer-controls">
          <button class="btn btn-secondary btn-lg" id="timer-reset-btn">
            🔄 Reset
          </button>
          <button class="btn btn-primary btn-lg" id="timer-toggle-btn">
            ▶️ Avvia
          </button>
        </div>
      </div>
    `;

        // Cache elementi
        elements = {
            minutes: document.getElementById('timer-minutes'),
            seconds: document.getElementById('timer-seconds'),
            progressBar: document.getElementById('timer-progress-bar'),
            toggleBtn: document.getElementById('timer-toggle-btn'),
            resetBtn: document.getElementById('timer-reset-btn'),
            presets: container.querySelectorAll('.timer-preset')
        };

        // Bind events
        elements.toggleBtn.addEventListener('click', toggle);
        elements.resetBtn.addEventListener('click', reset);
        elements.presets.forEach(btn => {
            btn.addEventListener('click', () => setPreset(parseInt(btn.dataset.seconds)));
        });

        updateDisplay();
    }

    /**
     * Imposta un preset di tempo
     * @param {number} seconds - Secondi del preset
     */
    function setPreset(seconds) {
        state.targetSeconds = seconds;
        state.seconds = seconds;

        // Aggiorna UI presets
        elements.presets.forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.seconds) === seconds);
        });

        // Salva nelle impostazioni
        Storage.updateSettings({ restTimerSeconds: seconds });

        updateDisplay();

        if (state.isRunning) {
            stop();
        }
    }

    /**
     * Toggle start/stop
     */
    function toggle() {
        if (state.isRunning) {
            stop();
        } else {
            start();
        }
    }

    /**
     * Avvia il timer
     */
    function start() {
        if (state.isRunning) return;

        state.isRunning = true;
        elements.toggleBtn.innerHTML = '⏸️ Pausa';
        elements.toggleBtn.classList.remove('btn-primary');
        elements.toggleBtn.classList.add('btn-secondary');

        state.intervalId = setInterval(() => {
            state.seconds--;
            updateDisplay();

            if (state.seconds <= 0) {
                complete();
            }
        }, 1000);
    }

    /**
     * Ferma il timer
     */
    function stop() {
        if (!state.isRunning) return;

        state.isRunning = false;
        elements.toggleBtn.innerHTML = '▶️ Avvia';
        elements.toggleBtn.classList.add('btn-primary');
        elements.toggleBtn.classList.remove('btn-secondary');

        if (state.intervalId) {
            clearInterval(state.intervalId);
            state.intervalId = null;
        }
    }

    /**
     * Reset del timer
     */
    function reset() {
        stop();
        state.seconds = state.targetSeconds;
        updateDisplay();
    }

    /**
     * Timer completato
     */
    function complete() {
        stop();
        state.seconds = 0;
        updateDisplay();

        // Notifica
        playBeep();
        vibrate();

        // Flash visivo
        if (elements.progressBar) {
            elements.progressBar.classList.add('success');
            setTimeout(() => {
                elements.progressBar.classList.remove('success');
                reset();
            }, 2000);
        }
    }

    /**
     * Aggiorna display
     */
    function updateDisplay() {
        if (!elements.minutes || !elements.seconds) return;

        const mins = Math.floor(state.seconds / 60);
        const secs = state.seconds % 60;

        elements.minutes.textContent = mins.toString().padStart(2, '0');
        elements.seconds.textContent = secs.toString().padStart(2, '0');

        // Aggiorna progress bar
        const progress = (state.seconds / state.targetSeconds) * 100;
        elements.progressBar.style.width = `${progress}%`;

        // Colore warning ultimi 10 secondi
        if (state.seconds <= 10 && state.seconds > 0) {
            elements.progressBar.style.background = 'var(--color-warning)';
        } else if (state.seconds === 0) {
            elements.progressBar.style.background = 'var(--color-success)';
        } else {
            elements.progressBar.style.background = '';
        }
    }

    /**
     * Suona beep di notifica
     */
    function playBeep() {
        try {
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);

            // Secondo beep
            setTimeout(() => {
                const osc2 = audioContext.createOscillator();
                const gain2 = audioContext.createGain();
                osc2.connect(gain2);
                gain2.connect(audioContext.destination);
                osc2.frequency.value = 1000;
                osc2.type = 'sine';
                gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                osc2.start(audioContext.currentTime);
                osc2.stop(audioContext.currentTime + 0.5);
            }, 300);

        } catch (e) {
            console.log('Audio not supported');
        }
    }

    /**
     * Vibrazione (mobile)
     */
    function vibrate() {
        if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200, 100, 300]);
        }
    }

    /**
     * Cleanup
     */
    function destroy() {
        stop();
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }
    }

    // API pubblica
    return {
        init,
        render,
        start,
        stop,
        reset,
        toggle,
        destroy
    };
})();

// Export per test/moduli
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Timer;
}
