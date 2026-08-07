// routine-manager.js - Daily Routine Schedule and Streak Tracker

const RoutineManager = {
  COMPLETE_THRESHOLD: 0.7, // 70% or more completed = "Complete Streak Day"

  // 16 Default routines to initialize if Firestore has none
  DEFAULT_ROUTINES: [
    { id: "wake", title: "Wake Up", time: "05:30", icon: "🌅", desc: "No snooze. Feet on floor. Begin.", optional: false },
    { id: "fresh", title: "Fresh Up", time: "05:35", icon: "🚿", desc: "Brush, wash face, cold splash. 15 min.", optional: false },
    { id: "medmorn", title: "Morning Meditation", time: "05:50", icon: "🧘", desc: "20 min. Silent sit. Breathe and anchor the day.", optional: false },
    { id: "reading", title: "Book Reading", time: "06:15", icon: "📖", desc: "30–45 min. No phone. One book at a time.", optional: false },
    { id: "gym", title: "Gym / Workout", time: "07:00", icon: "💪", desc: "60 min. Strength or cardio. Body is the first project.", optional: false },
    { id: "breakfast", title: "Breakfast", time: "08:15", icon: "🍳", desc: "Eat slowly. No screen at the table.", optional: false },
    { id: "deepwork1", title: "Trioviz Work Block 1", time: "09:00", icon: "⚙️", desc: "Client delivery, code, proposals, or skill-building. Phone on silent.", optional: false },
    { id: "deepwork2", title: "Trioviz Work Block 2", time: "11:00", icon: "📝", desc: "Writing, research, learning, Playbook updates, or new ideas. 2 hrs.", optional: false },
    { id: "lunch", title: "Lunch + Rest", time: "13:00", icon: "🍱", desc: "Eat. 20 min rest or short walk. No reels, no movies.", optional: false },
    { id: "deepwork3", title: "Trioviz Work Block 3", time: "14:00", icon: "🔧", desc: "Build, ship, or document. Or: social service / community call. 2 hrs.", optional: false },
    { id: "refresh", title: "Evening Refreshment", time: "16:30", icon: "🚶", desc: "Walk outside, tea, or light stretching. No screens. 30 min.", optional: false },
    { id: "review", title: "Reflect + Plan Tomorrow", time: "17:00", icon: "🗒️", desc: "What did I build today? What's the one priority tomorrow?", optional: false },
    { id: "medevn", title: "Evening Meditation", time: "18:00", icon: "🕯️", desc: "20 min. Release the day. Return to stillness.", optional: false },
    { id: "dinner", title: "Dinner", time: "20:00", icon: "🍽️", desc: "Light meal. Eat with gratitude. Screen-free table.", optional: false },
    { id: "wind", title: "Wind-Down", time: "20:30", icon: "📵", desc: "Read, journal, or light spiritual text. No reels after 9 PM.", optional: false },
    { id: "sleep", title: "Sleep", time: "22:00", icon: "🌙", desc: "Lights out. Phone away. 7–8 hrs non-negotiable.", optional: false }
  ],

  // Get date key matching historical format: "YYYY-M-D"
  getTodayKey: (d = new Date()) => {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  },

  // Renders the checklist in Today View
  renderTodayChecklist: () => {
    const state = App.state;
    const routines = state.routines && state.routines.length > 0 ? state.routines : RoutineManager.DEFAULT_ROUTINES;
    const todayKey = RoutineManager.getTodayKey();
    
    // Retrieve completions for today
    if (!state.routineCompletions) state.routineCompletions = {};
    if (!state.routineCompletions[todayKey]) state.routineCompletions[todayKey] = {};
    const todayCompletions = state.routineCompletions[todayKey];

    const container = document.getElementById('today-routines-checklist');
    if (!container) return;
    container.innerHTML = '';

    let completedCount = 0;
    // We only count non-optional routines for streak calculations, or all routines if they are all marked optional
    const activeRoutines = routines.filter(r => !r.optional);
    const divisor = activeRoutines.length > 0 ? activeRoutines.length : routines.length;

    routines.forEach(routine => {
      const isDone = !!todayCompletions[routine.id];
      if (isDone) completedCount++;

      const itemEl = document.createElement('div');
      itemEl.className = `routine-item ${isDone ? 'done' : ''} ${routine.optional ? 'optional' : ''}`;
      itemEl.onclick = () => RoutineManager.toggleRoutine(routine.id);

      itemEl.innerHTML = `
        <div class="routine-time">${RoutineManager.formatTime(routine.time)}</div>
        <div class="routine-icon">${routine.icon || '📌'}</div>
        <div class="routine-body">
          <div class="routine-title">${TaskManager.escapeHTML(routine.title)}</div>
          <div class="routine-desc">${TaskManager.escapeHTML(routine.desc || '')}</div>
        </div>
        <div class="routine-checkbox">✓</div>
      `;

      container.appendChild(itemEl);
    });

    // Update Progress Bar
    const pct = divisor > 0 ? Math.round((completedCount / divisor) * 100) : 0;
    const boundedPct = Math.min(pct, 100); // cap display at 100
    
    const progressFill = document.getElementById('today-routine-progress');
    const progressText = document.getElementById('today-routine-text');
    
    if (progressFill) progressFill.style.width = `${boundedPct}%`;
    if (progressText) progressText.textContent = `${completedCount} / ${divisor}`;

    // Renders the grids
    RoutineManager.renderStreakGrid('today-streak-dots', 'today-streak-text');
  },

  // Toggles the completion of a specific routine
  toggleRoutine: (id) => {
    const state = App.state;
    const todayKey = RoutineManager.getTodayKey();

    if (!state.routineCompletions[todayKey]) {
      state.routineCompletions[todayKey] = {};
    }

    state.routineCompletions[todayKey][id] = !state.routineCompletions[todayKey][id];
    
    // Update streak metrics count
    const routines = state.routines && state.routines.length > 0 ? state.routines : RoutineManager.DEFAULT_ROUTINES;
    const completedCount = Object.values(state.routineCompletions[todayKey]).filter(Boolean).length;
    
    if (!state.routineStreak) state.routineStreak = {};
    state.routineStreak[todayKey] = completedCount;

    App.saveState();
    RoutineManager.renderTodayChecklist();
    
    // If viewing Dashboard, re-draw dashboard items as well
    if (state.activeView === 'dashboard') {
      App.renderDashboard();
    }
  },

  // Reset completions for today
  resetTodayCompletions: () => {
    if (confirm("Reset all daily discipline blocks for today?")) {
      const state = App.state;
      const todayKey = RoutineManager.getTodayKey();

      if (state.routineCompletions && state.routineCompletions[todayKey]) {
        delete state.routineCompletions[todayKey];
      }
      if (state.routineStreak && state.routineStreak[todayKey]) {
        delete state.routineStreak[todayKey];
      }

      App.saveState();
      RoutineManager.renderTodayChecklist();
      if (state.activeView === 'dashboard') {
        App.renderDashboard();
      }
    }
  },

  // Renders the 30-day streak grids (both Dashboard and Today views)
  renderStreakGrid: (gridId, metricLabelId) => {
    const container = document.getElementById(gridId);
    const label = document.getElementById(metricLabelId);
    if (!container) return;
    
    container.innerHTML = '';
    const state = App.state;
    const streak = state.routineStreak || {};
    const routines = state.routines && state.routines.length > 0 ? state.routines : RoutineManager.DEFAULT_ROUTINES;
    
    // Active routines count to calculate divisor
    const activeRoutines = routines.filter(r => !r.optional);
    const divisor = activeRoutines.length > 0 ? activeRoutines.length : routines.length;
    const todayKey = RoutineManager.getTodayKey();

    let consecutiveDays = 0;
    let computedCompletedDaysCount = 0;
    let streakBroken = false;

    // We build backwards: from 29 days ago to today (index 0 is 29 days ago, index 29 is today)
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const k = RoutineManager.getTodayKey(d);
      
      const dayDoneCount = streak[k] || 0;
      const dayPct = divisor > 0 ? (dayDoneCount / divisor) : 0;
      const isComplete = dayPct >= RoutineManager.COMPLETE_THRESHOLD;

      const dot = document.createElement('div');
      dot.className = 'streak-dot';
      
      if (k === todayKey) {
        dot.classList.add('today');
      }
      
      if (isComplete) {
        dot.classList.add('complete');
        computedCompletedDaysCount++;
      } else if (dayDoneCount > 0) {
        dot.classList.add('partial');
      }

      const readableDate = `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}`;
      dot.setAttribute('data-tooltip', `${readableDate}: ${dayDoneCount}/${divisor} Blocks`);
      dot.textContent = d.getDate();
      
      container.appendChild(dot);
    }

    // Compute Consecutive Streak Days (looking backwards starting from today/yesterday)
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = RoutineManager.getTodayKey(d);
      
      const count = streak[k] || 0;
      const dayPct = divisor > 0 ? (count / divisor) : 0;
      
      if (dayPct >= RoutineManager.COMPLETE_THRESHOLD) {
        consecutiveDays++;
      } else {
        // If it's today and it's not complete yet, we don't break the streak immediately; we check yesterday
        if (i === 0) continue;
        break;
      }
    }

    if (label) {
      if (metricLabelId.includes('streak-metric')) {
        label.textContent = `${consecutiveDays} Days Consecutive`;
      } else {
        label.textContent = `${computedCompletedDaysCount} of 30 Days Completed`;
      }
    }
  },

  // ==========================================
  // ROUTINE EDITOR MODAL HANDLERS
  // ==========================================
  openRoutineEditor: () => {
    const modal = document.getElementById('edit-routines-modal');
    modal.classList.add('active');
    
    const container = document.getElementById('routine-editor-rows-container');
    container.innerHTML = '';

    const state = App.state;
    const routines = state.routines && state.routines.length > 0 ? state.routines : RoutineManager.DEFAULT_ROUTINES;

    routines.forEach((r, idx) => {
      RoutineManager.addRoutineRowHTML(container, r, idx);
    });
  },

  addRoutineRowHTML: (container, r = {}, index) => {
    const rowId = `routine-row-${index || Date.now()}`;
    const row = document.createElement('div');
    row.className = 'routine-editor-row';
    row.id = rowId;
    row.style = 'display: flex; gap: 8px; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;';
    
    row.innerHTML = `
      <input type="text" class="modal-input" placeholder="🌅" value="${r.icon || '🌅'}" style="width: 44px; text-align: center;" data-field="icon">
      <input type="time" class="modal-input" value="${r.time || '08:00'}" style="width: 100px;" data-field="time">
      <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
        <input type="text" class="modal-input" placeholder="Activity Title" value="${TaskManager.escapeHTML(r.title || '')}" style="font-weight: 600;" data-field="title">
        <input type="text" class="modal-input" placeholder="Short description..." value="${TaskManager.escapeHTML(r.desc || '')}" style="font-size: 11px;" data-field="desc">
      </div>
      <label style="display: flex; flex-direction: column; align-items: center; font-size: 9px; color: var(--text-muted); cursor: pointer;">
        <input type="checkbox" ${r.optional ? 'checked' : ''} data-field="optional">
        <span>Opt</span>
      </label>
      <i data-lucide="trash" class="icon-btn" style="color: var(--p1-color); width: 16px; height: 16px;" onclick="document.getElementById('${rowId}').remove(); lucide.createIcons();"></i>
    `;

    container.appendChild(row);
    lucide.createIcons();
  },

  addNewRoutineFormItem: () => {
    const container = document.getElementById('routine-editor-rows-container');
    RoutineManager.addRoutineRowHTML(container, {
      icon: '📌',
      time: '08:00',
      title: '',
      desc: '',
      optional: false
    }, Date.now());
  },

  closeRoutineEditor: () => {
    document.getElementById('edit-routines-modal').classList.remove('active');
  },

  saveRoutinesFromEditor: () => {
    const container = document.getElementById('routine-editor-rows-container');
    const rows = container.querySelectorAll('.routine-editor-row');
    const updatedRoutines = [];

    rows.forEach(row => {
      const icon = row.querySelector('[data-field="icon"]').value.trim();
      const time = row.querySelector('[data-field="time"]').value;
      const title = row.querySelector('[data-field="title"]').value.trim();
      const desc = row.querySelector('[data-field="desc"]').value.trim();
      const optional = row.querySelector('[data-field="optional"]').checked;
      
      if (title) {
        // Generate an ID if it's new
        const id = title.toLowerCase().replace(/[^a-z0-9]/g, '') || `r-${Date.now()}`;
        updatedRoutines.push({ id, icon, time, title, desc, optional });
      }
    });

    // Save to App State
    App.state.routines = updatedRoutines;
    
    // Sort routines chronologically by time
    App.state.routines.sort((a, b) => a.time.localeCompare(b.time));

    App.saveState();
    RoutineManager.closeRoutineEditor();
    RoutineManager.renderTodayChecklist();
    if (App.state.activeView === 'dashboard') {
      App.renderDashboard();
    }
  },

  // Format time helper (24h input to 12h readable)
  formatTime: (timeStr) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    
    let hours = parseInt(parts[0]);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    return `${hours}:${minutes}\n${ampm}`;
  }
};
