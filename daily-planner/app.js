// app.js - Central Orchestrator & State Manager

const App = {
  // Global Application State
  state: {
    routines: [],             // Custom daily routine definition list
    routineCompletions: {},   // Completion logs by date: { "YYYY-M-D": { wake: true, gym: false } }
    routineStreak: {},        // Count of completed blocks by date: { "YYYY-M-D": 12 }
    tasks: [],                // Dynamic checklist tasks
    projects: [],             // Custom lists & Kanban projects
    tags: [],                 // Registered tags
    activeView: 'today',      // Current panel shown: today, dashboard, tomorrow, calendar, someday, completed, project
    activeProjectId: '',      // ID of custom project list if activeView === 'project'
    settings: {
      theme: 'light'
    }
  },

  // Save debounce timer
  saveTimer: null,

  // Initialize application
  init: async () => {
    App.registerSidebarListeners();
    App.loadTheme();
    App.setSyncBadge('connecting…', 'syncing');

    // 1. Initial State Fallback values
    App.state.projects = [
      { id: 'work', name: 'Work', color: '#4a90e2', sections: [{ id: 'w-todo', name: 'To Do' }, { id: 'w-done', name: 'Done' }] },
      { id: 'personal', name: 'Personal', color: '#c17f3b', sections: [{ id: 'p-todo', name: 'To Do' }, { id: 'p-done', name: 'Done' }] }
    ];
    App.state.routines = [...RoutineManager.DEFAULT_ROUTINES];

    // 2. Fetch data from Firestore
    try {
      const data = await FirebaseSync.loadData();
      if (data) {
        // Map Firestore keys back to internal state parameters to maintain backwards compatibility
        App.state.routineCompletions = data.state || {}; // maps from historical 'state' key
        App.state.routineStreak = data.streak || {};      // maps from historical 'streak' key
        
        // Load routines, fallback to default if none configured
        if (data.routines && data.routines.length > 0) {
          App.state.routines = data.routines;
        }
        
        App.state.tasks = data.tasks || [];
        
        if (data.projects && data.projects.length > 0) {
          App.state.projects = data.projects;
        }
        
        App.state.tags = data.tags || [];
        if (data.settings) {
          App.state.settings = { ...App.state.settings, ...data.settings };
        }
      }
      App.setSyncBadge('synced ✓', 'synced');
    } catch (err) {
      console.error(err);
      App.setSyncBadge('offline mode', 'error');
    }

    // 3. Setup views and run initial render
    App.switchView(App.state.activeView);
    TaskManager.renderProjectsListSidebar();
    lucide.createIcons();
  },

  // Trigger state persistence with debounce to prevent Firestore spamming
  saveState: () => {
    App.setSyncBadge('saving…', 'syncing');
    clearTimeout(App.saveTimer);
    
    App.saveTimer = setTimeout(async () => {
      try {
        const payload = {
          state: App.state.routineCompletions, // save to historical 'state' collection
          streak: App.state.routineStreak,      // save to historical 'streak' collection
          routines: App.state.routines,
          tasks: App.state.tasks,
          projects: App.state.projects,
          tags: App.state.tags,
          settings: App.state.settings
        };
        
        await FirebaseSync.saveData(payload);
        App.setSyncBadge('synced ✓', 'synced');
      } catch (err) {
        console.error(err);
        App.setSyncBadge('sync failed', 'error');
      }
    }, 800);
  },

  // Manage UI synchronization indicator
  setSyncBadge: (text, statusClass) => {
    const badge = document.getElementById('sync-status-badge');
    if (!badge) return;
    badge.textContent = text;
    badge.className = `sync-badge ${statusClass}`;
  },

  // Navigation Panel Routing click registers
  registerSidebarListeners: () => {
    const navItems = document.querySelectorAll('.sidebar .nav-item[data-view]');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const view = e.currentTarget.getAttribute('data-view');
        App.switchView(view);
      });
    });
  },

  // Routing View Switcher
  switchView: (view, projectId = '') => {
    App.state.activeView = view;
    App.state.activeProjectId = projectId;

    // Remove active styles from sidebar items
    document.querySelectorAll('.sidebar .nav-item').forEach(el => el.classList.remove('active'));

    // Add active styling
    if (view === 'project') {
      const activeSidebarItem = document.querySelector(`#sidebar-projects-list .nav-item`);
      // Highlighting is done inside renderProjectsListSidebar as items are custom
      TaskManager.renderProjectsListSidebar();
    } else {
      const activeNav = document.getElementById(`nav-${view}`);
      if (activeNav) activeNav.classList.add('active');
    }

    // Highlight mobile bottom nav items
    document.querySelectorAll('.mobile-nav-item').forEach(el => el.classList.remove('active'));
    const activeMobileNav = document.getElementById(`m-nav-${view}`);
    if (activeMobileNav) activeMobileNav.classList.add('active');

    // Toggle main content view panels
    document.querySelectorAll('.view-panel').forEach(panel => panel.classList.remove('active'));
    const targetPanel = document.getElementById(`view-${view}`);
    if (targetPanel) targetPanel.classList.add('active');

    // Title settings based on current view
    const titleEl = document.getElementById('view-title');
    const subtitleEl = document.getElementById('view-subtitle');

    const today = new Date();
    const weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    if (view === 'today') {
      titleEl.textContent = "Today's Focus";
      subtitleEl.style.color = 'var(--text-muted)';
      subtitleEl.textContent = `${weekdays[today.getDay()]} · ${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
      RoutineManager.renderTodayChecklist();
    } else if (view === 'tomorrow') {
      titleEl.textContent = "Tomorrow's Schedule";
      const tomorrow = new Date(Date.now() + 86400000);
      subtitleEl.textContent = `${weekdays[tomorrow.getDay()]} · ${tomorrow.getDate()} ${months[tomorrow.getMonth()]} ${tomorrow.getFullYear()}`;
    } else if (view === 'calendar') {
      titleEl.textContent = "Calendar Planner";
      subtitleEl.textContent = "Schedule tasks visually";
      Calendar.render();
    } else if (view === 'someday') {
      titleEl.textContent = "Someday Backlog";
      subtitleEl.textContent = "Ideas to build or complete eventually";
    } else if (view === 'completed') {
      titleEl.textContent = "Completed Logs";
      subtitleEl.textContent = "History of achievements";
    } else if (view === 'dashboard') {
      titleEl.textContent = "Productivity Hub";
      subtitleEl.textContent = "Your performance analytics overview";
    }

    // Close detail panel when shifting views
    TaskManager.closeDetailPanel();
    
    // Render current active view tasks
    TaskManager.renderActiveView();
  },

  // ==========================================
  // DASHBOARD ANALYTICS RENDER
  // ==========================================
  renderDashboard: () => {
    const state = App.state;
    const tasks = state.tasks || [];

    // 1. Total Completed Tasks
    const completedCount = tasks.filter(t => t.completed).length;
    document.getElementById('dash-completed-count').textContent = completedCount;
    document.getElementById('dash-completed-sub').textContent = `Out of ${tasks.length} total tasks registered`;

    // 2. Preserved Streak Log rendering
    RoutineManager.renderStreakGrid('dash-streak-dots', 'dash-streak-metric');

    // 3. Up Next (Overdue/Today P1/P2 priorities)
    const upNextContainer = document.getElementById('dash-up-next');
    upNextContainer.innerHTML = '';
    const todayStr = TaskManager.getLocalDateString(new Date());
    
    const urgentTasks = tasks.filter(t => {
      return !t.completed && 
             (t.priority === 'P1' || t.priority === 'P2') && 
             (t.dueDate === todayStr || (t.dueDate && t.dueDate < todayStr) || !t.dueDate);
    });

    // Limit to top 3 urgent tasks
    const topUrgent = urgentTasks.slice(0, 3);
    if (topUrgent.length === 0) {
      upNextContainer.innerHTML = `<div style="font-size: 12px; color: var(--text-muted); padding: 8px 0;">All high priority tasks cleared! 🎉</div>`;
    } else {
      topUrgent.forEach(t => {
        const item = document.createElement('div');
        item.className = 'up-next-item';
        item.onclick = () => {
          App.switchView('today');
          TaskManager.openDetailPanel(t.id);
        };
        
        const priorityColor = t.priority === 'P1' ? 'var(--p1-color)' : 'var(--p2-color)';
        item.style.borderLeftColor = priorityColor;
        
        item.innerHTML = `
          <strong style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${TaskManager.escapeHTML(t.title)}</strong>
          <span style="font-size: 10px; color: ${priorityColor}; font-weight: 600;">${t.priority}</span>
        `;
        upNextContainer.appendChild(item);
      });
    }

    // 4. Weekly Productivity Trend Chart
    const trendChart = document.getElementById('dash-trend-chart');
    trendChart.innerHTML = '';
    
    // Loop last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = TaskManager.getLocalDateString(d);
      
      const dayCompletions = tasks.filter(t => t.completed && t.completedDate && t.completedDate.startsWith(dateStr)).length;
      
      // Calculate height percentage (max count reference is 10 tasks)
      const maxTasksRef = 6;
      const heightPct = Math.min((dayCompletions / maxTasksRef) * 100, 100);

      const col = document.createElement('div');
      col.className = 'chart-bar-col';
      
      const dayNames = ['S','M','T','W','T','F','S'];
      const dayName = dayNames[d.getDay()];

      col.innerHTML = `
        <div class="chart-bar-fill ${i === 0 ? 'active' : ''}" style="height: ${heightPct}%;" title="${dayCompletions} tasks completed"></div>
        <span class="chart-label">${dayName}</span>
      `;
      trendChart.appendChild(col);
    }
  },

  // ==========================================
  // THEME MANAGEMENT
  // ==========================================
  toggleTheme: () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    App.state.settings.theme = newTheme;
    
    // Update toggle icon
    const icon = document.getElementById('theme-icon');
    if (newTheme === 'dark') {
      icon.setAttribute('data-lucide', 'sun');
    } else {
      icon.setAttribute('data-lucide', 'moon');
    }
    
    lucide.createIcons();
    App.saveState();
  },

  loadTheme: () => {
    const theme = App.state.settings.theme || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    
    const icon = document.getElementById('theme-icon');
    if (icon) {
      icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
    }
  },

  toggleMobileMenu: () => {
    const drawer = document.getElementById('mobile-drawer');
    if (drawer) {
      drawer.classList.toggle('active');
    }
  }
};

// ==========================================
// MODAL DIALOG CONTROLLERS
// ==========================================

function openSettingsModal() {
  const modal = document.getElementById('settings-modal');
  const docPath = FirebaseSync.getDocPath();
  
  document.getElementById('settings-collection').value = docPath.collection;
  document.getElementById('settings-doc').value = docPath.doc;
  
  modal.classList.add('active');
}

function closeSettingsModal() {
  document.getElementById('settings-modal').classList.remove('active');
}

function saveSettings() {
  const collection = document.getElementById('settings-collection').value.trim();
  const doc = document.getElementById('settings-doc').value.trim();
  
  if (collection && doc) {
    FirebaseSync.setDocPath(collection, doc);
    closeSettingsModal();
    
    // Force reload app state with new firebase collection references
    App.init();
  }
}

function openAddProjectModal() {
  document.getElementById('add-project-modal').classList.add('active');
}

function closeAddProjectModal() {
  document.getElementById('add-project-modal').classList.remove('active');
}

// Window Onload Trigger Initializer
window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
