// task-manager.js - Task, Project and List Manager

const TaskManager = {
  activeTaskId: null,
  projectLayout: 'list', // 'list' or 'kanban'

  // Initialize and load tasks list
  init: () => {
    // Register sidebar listeners or specific handlers if needed
  },

  // Renders the appropriate lists based on the active view
  renderActiveView: () => {
    const state = App.state;
    const view = state.activeView;

    // Reset list HTML containers
    const todayList = document.getElementById('today-tasks-list');
    const tomorrowList = document.getElementById('tomorrow-tasks-list');
    const somedayList = document.getElementById('someday-tasks-list');
    const completedList = document.getElementById('completed-tasks-list');

    // Counts for sidebar badges
    TaskManager.updateSidebarBadges();

    // Toggle specific views rendering
    if (view === 'today' && todayList) {
      TaskManager.renderTaskList(todayList, t => !t.completed && TaskManager.isToday(t.dueDate), 'today');
    } else if (view === 'tomorrow' && tomorrowList) {
      TaskManager.renderTaskList(tomorrowList, t => !t.completed && TaskManager.isTomorrow(t.dueDate), 'tomorrow');
    } else if (view === 'someday' && somedayList) {
      TaskManager.renderTaskList(somedayList, t => !t.completed && (!t.dueDate || t.dueDate === ''), 'someday');
    } else if (view === 'completed' && completedList) {
      TaskManager.renderTaskList(completedList, t => t.completed);
    } else if (view === 'project') {
      TaskManager.renderProjectView();
    } else if (view === 'dashboard') {
      App.renderDashboard();
    }
  },

  // Updates the counters on the sidebar navigation items
  updateSidebarBadges: () => {
    const state = App.state;
    const tasks = state.tasks || [];

    const todayCount = tasks.filter(t => !t.completed && TaskManager.isToday(t.dueDate)).length;
    const tomorrowCount = tasks.filter(t => !t.completed && TaskManager.isTomorrow(t.dueDate)).length;
    const somedayCount = tasks.filter(t => !t.completed && (!t.dueDate || t.dueDate === '')).length;

    document.getElementById('count-today').textContent = todayCount;
    document.getElementById('count-tomorrow').textContent = tomorrowCount;
    document.getElementById('count-someday').textContent = somedayCount;
  },

  // General list rendering engine with HTML template
  renderTaskList: (container, filterFn, defaultDateKey = '') => {
    container.innerHTML = '';
    const state = App.state;
    const filteredTasks = (state.tasks || []).filter(filterFn);

    // Apply sorting: Priority P1 -> P4, then completed status
    filteredTasks.sort((a, b) => {
      const pMap = { P1: 1, P2: 2, P3: 3, P4: 4 };
      const pa = pMap[a.priority] || 4;
      const pb = pMap[b.priority] || 4;
      if (pa !== pb) return pa - pb;
      return new Date(a.created || 0) - new Date(b.created || 0);
    });

    if (filteredTasks.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 12px; padding: 24px;">No tasks here. Add one below!</div>`;
      return;
    }

    filteredTasks.forEach(task => {
      const itemEl = document.createElement('div');
      itemEl.className = `task-item ${task.priority.toLowerCase()} ${task.completed ? 'completed' : ''}`;
      itemEl.setAttribute('draggable', 'true');
      itemEl.setAttribute('data-id', task.id);
      
      // Bind click on task card to open detail panel, except clicking the checkbox
      itemEl.addEventListener('click', (e) => {
        if (e.target.closest('.task-checkbox-wrapper')) return;
        TaskManager.openDetailPanel(task.id);
      });

      // Drag and drop listeners binding
      itemEl.addEventListener('dragstart', DragDrop.handleDragStart);
      itemEl.addEventListener('dragend', DragDrop.handleDragEnd);

      const formattedDate = task.dueDate ? TaskManager.formatFriendlyDate(task.dueDate) : '';
      const projName = task.projectId ? TaskManager.getProjectName(task.projectId) : '';
      const projColor = task.projectId ? TaskManager.getProjectColor(task.projectId) : '';
      
      const subtaskCount = task.subtasks ? task.subtasks.length : 0;
      const doneSubtaskCount = task.subtasks ? task.subtasks.filter(s => s.completed).length : 0;
      const subtaskStr = subtaskCount > 0 ? `
        <div class="task-subtasks-summary">
          <i data-lucide="check-square" style="width: 10px; height: 10px;"></i>
          <span>${doneSubtaskCount}/${subtaskCount}</span>
        </div>` : '';

      itemEl.innerHTML = `
        <div class="task-drag-handle">
          <i data-lucide="grip-vertical" style="width: 14px; height: 14px;"></i>
        </div>
        <div class="task-checkbox-wrapper" onclick="TaskManager.toggleTask('${task.id}')">
          <div class="task-checkbox">✓</div>
        </div>
        <div class="task-body">
          <div class="task-title">${TaskManager.escapeHTML(task.title)}</div>
          <div class="task-meta">
            ${formattedDate ? `<span class="meta-badge date"><i data-lucide="calendar" style="width: 9px; height: 9px;"></i>${formattedDate}</span>` : ''}
            ${projName ? `<span class="meta-badge project" style="border: 1px solid ${projColor}; color: ${projColor};"><span class="color-dot" style="background: ${projColor}; margin-right: 4px;"></span>${TaskManager.escapeHTML(projName)}</span>` : ''}
            ${(task.tags || []).map(t => `<span class="meta-badge tag">#${TaskManager.escapeHTML(t)}</span>`).join('')}
            ${subtaskStr}
          </div>
        </div>
      `;
      
      container.appendChild(itemEl);
    });

    // Re-initialize Lucide Icons for dynamic content
    lucide.createIcons();
  },

  // Handlers for quick addition of a task
  handleQuickAdd: (event, type) => {
    if (event.key !== 'Enter') return;
    const inputEl = event.target;
    const title = inputEl.value.trim();
    if (!title) return;

    let dueDate = '';
    const today = TaskManager.getLocalDateString(new Date());
    const tomorrow = TaskManager.getLocalDateString(new Date(Date.now() + 86400000));

    if (type === 'today') {
      dueDate = today;
    } else if (type === 'tomorrow') {
      dueDate = tomorrow;
    }

    const newTask = {
      id: TaskManager.generateUUID(),
      title,
      dueDate,
      priority: 'P4',
      tags: [],
      notes: '',
      projectId: App.state.activeProjectId || '', // default to active project if viewing a custom list
      sectionId: '',
      completed: false,
      completedDate: null,
      subtasks: [],
      recurrence: 'none',
      timeBlock: null,
      created: new Date().toISOString()
    };

    App.state.tasks.push(newTask);
    inputEl.value = '';
    
    // Auto-sync & redraw
    App.saveState();
    TaskManager.renderActiveView();
  },

  // Check off/uncheck a task
  toggleTask: (id) => {
    const task = App.state.tasks.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;
    task.completedDate = task.completed ? new Date().toISOString() : null;

    // Recurrence logic handling
    if (task.completed && task.recurrence !== 'none') {
      TaskManager.handleTaskRecurrence(task);
    }

    App.saveState();
    TaskManager.renderActiveView();

    // If detail panel is open for this task, refresh it
    if (TaskManager.activeTaskId === id) {
      TaskManager.openDetailPanel(id);
    }
  },

  // Handle task recurrence upon completion
  handleTaskRecurrence: (task) => {
    // Clone task before checking off, and calculate next date
    if (!task.dueDate) return;
    const currentDueDate = new Date(task.dueDate);
    let nextDueDate = new Date(task.dueDate);

    if (task.recurrence === 'daily') {
      nextDueDate.setDate(currentDueDate.getDate() + 1);
    } else if (task.recurrence === 'weekly') {
      nextDueDate.setDate(currentDueDate.getDate() + 7);
    } else if (task.recurrence === 'monthly') {
      nextDueDate.setMonth(currentDueDate.getMonth() + 1);
    }

    const recurredTask = {
      ...task,
      id: TaskManager.generateUUID(),
      completed: false,
      completedDate: null,
      dueDate: TaskManager.getLocalDateString(nextDueDate),
      subtasks: (task.subtasks || []).map(s => ({ ...s, completed: false })),
      created: new Date().toISOString()
    };

    App.state.tasks.push(recurredTask);
  },

  // Opens right-hand detail editor panel
  openDetailPanel: (id) => {
    const task = App.state.tasks.find(t => t.id === id);
    if (!task) return;

    TaskManager.activeTaskId = id;
    const panel = document.getElementById('task-detail-panel');
    panel.classList.add('open');

    // Populate inputs
    document.getElementById('detail-task-title').value = task.title;
    document.getElementById('detail-task-priority').value = task.priority;
    document.getElementById('detail-task-date').value = task.dueDate || '';
    document.getElementById('detail-task-recurrence').value = task.recurrence || 'none';
    document.getElementById('detail-task-notes').value = task.notes || '';
    document.getElementById('detail-task-tags').value = (task.tags || []).join(', ');
    
    // Time block fields
    document.getElementById('detail-task-time-start').value = (task.timeBlock && task.timeBlock.start) ? task.timeBlock.start : '';
    document.getElementById('detail-task-time-end').value = (task.timeBlock && task.timeBlock.end) ? task.timeBlock.end : '';

    // Projects list select box populate
    const projSelect = document.getElementById('detail-task-project');
    projSelect.innerHTML = `<option value="">(Inbox / No Project)</option>`;
    (App.state.projects || []).forEach(p => {
      projSelect.innerHTML += `<option value="${p.id}" ${task.projectId === p.id ? 'selected' : ''}>${TaskManager.escapeHTML(p.name)}</option>`;
    });

    TaskManager.populateSectionSelector(task.projectId, task.sectionId);
    TaskManager.renderSubtasksList(task);
    
    lucide.createIcons();
  },

  populateSectionSelector: (projectId, activeSectionId = '') => {
    const sectionRow = document.getElementById('detail-section-row');
    const sectionSelect = document.getElementById('detail-task-section');
    sectionSelect.innerHTML = '';

    if (!projectId) {
      sectionRow.style.display = 'none';
      return;
    }

    const project = App.state.projects.find(p => p.id === projectId);
    if (!project || !project.sections || project.sections.length === 0) {
      sectionRow.style.display = 'none';
      return;
    }

    sectionRow.style.display = 'flex';
    sectionSelect.innerHTML = `<option value="">(No Section)</option>`;
    project.sections.forEach(s => {
      sectionSelect.innerHTML += `<option value="${s.id}" ${activeSectionId === s.id ? 'selected' : ''}>${TaskManager.escapeHTML(s.name)}</option>`;
    });
  },

  handleDetailProjectChange: (projectId) => {
    const task = App.state.tasks.find(t => t.id === TaskManager.activeTaskId);
    if (!task) return;

    task.projectId = projectId;
    task.sectionId = ''; // Reset section
    
    TaskManager.populateSectionSelector(projectId, '');
    App.saveState();
    TaskManager.renderActiveView();
  },

  closeDetailPanel: () => {
    TaskManager.activeTaskId = null;
    const panel = document.getElementById('task-detail-panel');
    panel.classList.remove('open');
  },

  // Update active task specific attribute
  updateActiveTaskDetail: (field, value) => {
    const task = App.state.tasks.find(t => t.id === TaskManager.activeTaskId);
    if (!task) return;

    task[field] = value;
    App.saveState();
    TaskManager.renderActiveView();
  },

  updateActiveTaskTimeBlock: (type, value) => {
    const task = App.state.tasks.find(t => t.id === TaskManager.activeTaskId);
    if (!task) return;

    if (!task.timeBlock) {
      task.timeBlock = { start: '', end: '' };
    }
    task.timeBlock[type] = value;
    
    // Clean structure if empty
    if (!task.timeBlock.start && !task.timeBlock.end) {
      task.timeBlock = null;
    }

    App.saveState();
    TaskManager.renderActiveView();
  },

  updateActiveTaskTags: (tagString) => {
    const task = App.state.tasks.find(t => t.id === TaskManager.activeTaskId);
    if (!task) return;

    task.tags = tagString.split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    // Track dynamic tags in App state
    task.tags.forEach(t => {
      if (!App.state.tags.includes(t)) {
        App.state.tags.push(t);
      }
    });

    App.saveState();
    TaskManager.renderActiveView();
  },

  // Render detail checklist (subtasks)
  renderSubtasksList: (task) => {
    const container = document.getElementById('detail-task-subtasks');
    container.innerHTML = '';

    (task.subtasks || []).forEach(sub => {
      const subEl = document.createElement('div');
      subEl.className = `subtask-item ${sub.completed ? 'completed' : ''}`;
      subEl.innerHTML = `
        <div class="subtask-checkbox" onclick="TaskManager.toggleSubtask('${sub.id}')">✓</div>
        <div class="subtask-title">${TaskManager.escapeHTML(sub.title)}</div>
        <i data-lucide="trash" class="delete-subtask-btn" onclick="TaskManager.deleteSubtask('${sub.id}')" style="width: 12px; height: 12px;"></i>
      `;
      
      if (sub.completed) {
        subEl.querySelector('.subtask-checkbox').style.background = 'var(--done-color)';
        subEl.querySelector('.subtask-checkbox').style.borderColor = 'var(--done-color)';
        subEl.querySelector('.subtask-checkbox').style.color = '#fff';
      }

      container.appendChild(subEl);
    });

    lucide.createIcons();
  },

  handleAddSubtask: (event) => {
    if (event.key !== 'Enter') return;
    const input = event.target;
    const title = input.value.trim();
    if (!title) return;

    const task = App.state.tasks.find(t => t.id === TaskManager.activeTaskId);
    if (!task) return;

    if (!task.subtasks) task.subtasks = [];
    
    task.subtasks.push({
      id: TaskManager.generateUUID(),
      title,
      completed: false
    });

    input.value = '';
    App.saveState();
    TaskManager.renderSubtasksList(task);
    TaskManager.renderActiveView();
  },

  toggleSubtask: (subId) => {
    const task = App.state.tasks.find(t => t.id === TaskManager.activeTaskId);
    if (!task) return;

    const sub = task.subtasks.find(s => s.id === subId);
    if (sub) {
      sub.completed = !sub.completed;
      App.saveState();
      TaskManager.renderSubtasksList(task);
      TaskManager.renderActiveView();
    }
  },

  deleteSubtask: (subId) => {
    const task = App.state.tasks.find(t => t.id === TaskManager.activeTaskId);
    if (!task) return;

    task.subtasks = task.subtasks.filter(s => s.id !== subId);
    App.saveState();
    TaskManager.renderSubtasksList(task);
    TaskManager.renderActiveView();
  },

  deleteActiveTask: () => {
    if (!TaskManager.activeTaskId) return;
    
    if (confirm("Are you sure you want to delete this task?")) {
      App.state.tasks = App.state.tasks.filter(t => t.id !== TaskManager.activeTaskId);
      TaskManager.closeDetailPanel();
      App.saveState();
      TaskManager.renderActiveView();
    }
  },

  // ==========================================
  // PROJECTS & SECTIONS CRUD
  // ==========================================
  
  // Renders the list of custom projects in the sidebar navigation
  renderProjectsListSidebar: () => {
    const containers = [
      document.getElementById('sidebar-projects-list'),
      document.getElementById('mobile-projects-list')
    ];
    
    containers.forEach(container => {
      if (!container) return;
      container.innerHTML = '';
      const state = App.state;

      (state.projects || []).forEach(proj => {
        const itemEl = document.createElement('div');
        itemEl.className = `nav-item ${state.activeView === 'project' && state.activeProjectId === proj.id ? 'active' : ''}`;
        
        itemEl.onclick = () => {
          App.switchView('project', proj.id);
          if (container.id === 'mobile-projects-list') {
            App.toggleMobileMenu();
          }
        };
        
        const count = (state.tasks || []).filter(t => !t.completed && t.projectId === proj.id).length;
        
        itemEl.innerHTML = `
          <span class="color-dot" style="background: ${proj.color || 'var(--accent)'};"></span>
          <span style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${TaskManager.escapeHTML(proj.name)}</span>
          <span class="nav-item-count">${count}</span>
        `;
        
        container.appendChild(itemEl);
      });
    });
  },

  createNewProject: () => {
    const nameInput = document.getElementById('new-project-name');
    const colorInput = document.getElementById('new-project-color');
    const name = nameInput.value.trim();
    if (!name) return;

    const newProj = {
      id: TaskManager.generateUUID(),
      name,
      color: colorInput.value,
      sections: [
        { id: TaskManager.generateUUID(), name: 'To Do' },
        { id: TaskManager.generateUUID(), name: 'In Progress' },
        { id: TaskManager.generateUUID(), name: 'Completed' }
      ]
    };

    App.state.projects.push(newProj);
    nameInput.value = '';
    
    closeAddProjectModal();
    App.saveState();
    TaskManager.renderProjectsListSidebar();
    
    // Automatically navigate to new project
    App.switchView('project', newProj.id);
  },

  addNewSectionToProject: () => {
    const activeProjId = App.state.activeProjectId;
    if (!activeProjId) return;

    const sectionName = prompt("Enter Section name:");
    if (!sectionName || !sectionName.trim()) return;

    const project = App.state.projects.find(p => p.id === activeProjId);
    if (project) {
      if (!project.sections) project.sections = [];
      project.sections.push({
        id: TaskManager.generateUUID(),
        name: sectionName.trim()
      });
      
      App.saveState();
      TaskManager.renderActiveView();
    }
  },

  switchProjectLayout: (layout) => {
    TaskManager.projectLayout = layout;
    document.getElementById('proj-tab-list').classList.toggle('active', layout === 'list');
    document.getElementById('proj-tab-kanban').classList.toggle('active', layout === 'kanban');
    TaskManager.renderProjectView();
  },

  // Renders the details of the active project
  renderProjectView: () => {
    const activeProjId = App.state.activeProjectId;
    const container = document.getElementById('project-sections-main-container');
    container.innerHTML = '';

    const project = App.state.projects.find(p => p.id === activeProjId);
    if (!project) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px;">Project not found.</div>`;
      return;
    }

    // Dynamic Title Update
    document.getElementById('view-title').textContent = project.name;
    document.getElementById('view-subtitle').style.color = project.color;
    document.getElementById('view-subtitle').textContent = `Custom Project Tracker`;

    const sections = project.sections || [];

    if (TaskManager.projectLayout === 'list') {
      // LIST LAYOUT
      const listWrapper = document.createElement('div');
      listWrapper.className = 'task-list-wrapper';

      // Quick add task for general project tasks
      const quickAdd = document.createElement('div');
      quickAdd.className = 'quick-add-task';
      quickAdd.innerHTML = `
        <i data-lucide="plus" style="width: 16px; color: var(--text-muted);"></i>
        <input type="text" class="quick-add-input" placeholder="Add a task to Project... Press Enter" onkeydown="TaskManager.handleProjectQuickAdd(event, '${project.id}', '')">
      `;
      listWrapper.appendChild(quickAdd);

      const listContainer = document.createElement('div');
      listContainer.className = 'task-list';
      TaskManager.renderTaskList(listContainer, t => t.projectId === project.id);
      listWrapper.appendChild(listContainer);
      
      container.appendChild(listWrapper);
    } else {
      // KANBAN BOARD LAYOUT
      const boardWrapper = document.createElement('div');
      boardWrapper.className = 'project-sections-container';

      sections.forEach(section => {
        const colEl = document.createElement('div');
        colEl.className = 'project-section-column';
        colEl.setAttribute('data-section-id', section.id);
        
        // Drag Over listener for column drops
        colEl.addEventListener('dragover', DragDrop.handleDragOver);
        colEl.addEventListener('drop', DragDrop.handleDrop);

        const sectionTasks = App.state.tasks.filter(t => t.projectId === project.id && t.sectionId === section.id);

        colEl.innerHTML = `
          <div class="section-col-header">
            <span class="section-col-title">${TaskManager.escapeHTML(section.name)}</span>
            <span class="section-col-count">${sectionTasks.length}</span>
          </div>
          <div class="quick-add-task" style="padding: 8px 12px; margin-bottom: 12px;">
            <input type="text" class="quick-add-input" style="font-size: 11px;" placeholder="+ Add Card..." onkeydown="TaskManager.handleProjectQuickAdd(event, '${project.id}', '${section.id}')">
          </div>
          <div class="task-list" id="section-list-${section.id}" data-section="${section.id}" style="flex: 1; overflow-y: auto;">
            <!-- Rendered below -->
          </div>
        `;
        
        boardWrapper.appendChild(colEl);
        
        // Render Tasks specifically inside this section column
        const columnListContainer = colEl.querySelector(`#section-list-${section.id}`);
        TaskManager.renderTaskList(columnListContainer, t => t.projectId === project.id && t.sectionId === section.id);
      });
      
      container.appendChild(boardWrapper);
    }

    lucide.createIcons();
  },

  handleProjectQuickAdd: (event, projectId, sectionId = '') => {
    if (event.key !== 'Enter') return;
    const input = event.target;
    const title = input.value.trim();
    if (!title) return;

    const newTask = {
      id: TaskManager.generateUUID(),
      title,
      dueDate: '',
      priority: 'P4',
      tags: [],
      notes: '',
      projectId,
      sectionId,
      completed: false,
      completedDate: null,
      subtasks: [],
      recurrence: 'none',
      timeBlock: null,
      created: new Date().toISOString()
    };

    App.state.tasks.push(newTask);
    input.value = '';

    App.saveState();
    TaskManager.renderActiveView();
  },

  // ==========================================
  // HELPERS & DATES
  // ==========================================
  isToday: (dateStr) => {
    if (!dateStr) return false;
    const today = TaskManager.getLocalDateString(new Date());
    return dateStr === today;
  },

  isTomorrow: (dateStr) => {
    if (!dateStr) return false;
    const tomorrow = TaskManager.getLocalDateString(new Date(Date.now() + 86400000));
    return dateStr === tomorrow;
  },

  getLocalDateString: (dateObj) => {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  },

  formatFriendlyDate: (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const today = TaskManager.getLocalDateString(new Date());
    const tomorrow = TaskManager.getLocalDateString(new Date(Date.now() + 86400000));
    
    if (dateStr === today) return 'Today';
    if (dateStr === tomorrow) return 'Tomorrow';
    
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  },

  getProjectName: (projId) => {
    const p = App.state.projects.find(proj => proj.id === projId);
    return p ? p.name : '';
  },

  getProjectColor: (projId) => {
    const p = App.state.projects.find(proj => proj.id === projId);
    return p ? p.color : 'var(--accent)';
  },

  escapeHTML: (str) => {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  },

  generateUUID: () => {
    return 'task-xx4xx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};
