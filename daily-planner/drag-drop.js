// drag-drop.js - HTML5 Native Drag and Drop Managers

const DragDrop = {
  // Task starts dragging
  handleDragStart: (e) => {
    const taskId = e.currentTarget.getAttribute('data-id');
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    
    // Add visual indicator
    setTimeout(() => {
      e.target.classList.add('dragging');
    }, 0);
  },

  // Task stops dragging
  handleDragEnd: (e) => {
    e.target.classList.remove('dragging');
  },

  // Hovering over a drop zone
  handleDragOver: (e) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
  },

  // Drop task on a date target (Calendar Month cell or Week column)
  handleDrop: (e) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    const task = App.state.tasks.find(t => t.id === taskId);
    if (!task) return;

    // Check if target is a Calendar Cell or Week Column with [data-date]
    const dateTarget = e.currentTarget.closest('[data-date]');
    // Check if target is a Project Kanban Section column with [data-section-id]
    const sectionTarget = e.currentTarget.closest('[data-section-id]');

    let changed = false;

    if (dateTarget) {
      const newDate = dateTarget.getAttribute('data-date');
      task.dueDate = newDate;
      changed = true;
    } else if (sectionTarget) {
      const sectionId = sectionTarget.getAttribute('data-section-id');
      task.sectionId = sectionId;
      task.projectId = App.state.activeProjectId || '';
      
      // If task is dropped into a "Completed" section column (optional custom behavior)
      const section = TaskManager.getSectionNameById(task.projectId, sectionId);
      if (section.toLowerCase().includes('done') || section.toLowerCase().includes('complete')) {
        task.completed = true;
        task.completedDate = new Date().toISOString();
      } else {
        task.completed = false;
        task.completedDate = null;
      }
      changed = true;
    }

    if (changed) {
      App.saveState();
      TaskManager.renderActiveView();
      if (App.state.activeView === 'calendar') {
        Calendar.render();
      }
    }
  },

  // Drop task on Day View timeline row to Time Block
  handleDropTimeBlock: (e) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    const task = App.state.tasks.find(t => t.id === taskId);
    if (!task) return;

    const rowTarget = e.currentTarget.closest('[data-time]');
    if (!rowTarget) return;

    const startTime = rowTarget.getAttribute('data-time'); // e.g. "09:00"
    
    // Set End Time automatically to 1 hour later
    const startHour = parseInt(startTime.split(':')[0]);
    const endHour = String((startHour + 1) % 24).padStart(2, '0');
    const endTime = `${endHour}:00`;

    // Bind task to day of Day timeline and assign block times
    task.dueDate = TaskManager.getLocalDateString(Calendar.currentDate);
    task.timeBlock = {
      start: startTime,
      end: endTime
    };

    App.saveState();
    Calendar.render();
  },

  // Helper utility to get project section name
  getSectionNameById: (projId, secId) => {
    const project = App.state.projects.find(p => p.id === projId);
    if (project && project.sections) {
      const sec = project.sections.find(s => s.id === secId);
      return sec ? sec.name : '';
    }
    return '';
  }
};
