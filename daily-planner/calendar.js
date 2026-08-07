// calendar.js - Calendar Component (Month, Week, Day Timeline Views)

const Calendar = {
  currentDate: new Date(),
  currentView: 'month', // 'month', 'week', 'day'

  init: () => {
    // Basic setups
  },

  // Navigate calendar date viewport
  navigate: (direction) => {
    if (Calendar.currentView === 'month') {
      Calendar.currentDate.setMonth(Calendar.currentDate.getMonth() + direction);
    } else if (Calendar.currentView === 'week') {
      Calendar.currentDate.setDate(Calendar.currentDate.getDate() + (direction * 7));
    } else if (Calendar.currentView === 'day') {
      Calendar.currentDate.setDate(Calendar.currentDate.getDate() + direction);
    }
    Calendar.render();
  },

  switchView: (viewType) => {
    Calendar.currentView = viewType;
    
    // Toggle active state in UI tabs
    document.getElementById('cal-tab-month').classList.toggle('active', viewType === 'month');
    document.getElementById('cal-tab-week').classList.toggle('active', viewType === 'week');
    document.getElementById('cal-tab-day').classList.toggle('active', viewType === 'day');

    // Toggle container views visibility
    document.getElementById('calendar-month-view').style.display = viewType === 'month' ? 'grid' : 'none';
    document.getElementById('calendar-week-view').style.display = viewType === 'week' ? 'grid' : 'none';
    document.getElementById('calendar-day-view').style.display = viewType === 'day' ? 'flex' : 'none';

    Calendar.render();
  },

  // Main rendering director
  render: () => {
    if (Calendar.currentView === 'month') {
      Calendar.renderMonth();
    } else if (Calendar.currentView === 'week') {
      Calendar.renderWeek();
    } else if (Calendar.currentView === 'day') {
      Calendar.renderDay();
    }
  },

  // Renders Month View Grid
  renderMonth: () => {
    const monthGrid = document.getElementById('calendar-month-view');
    const label = document.getElementById('calendar-month-year-label');
    if (!monthGrid) return;

    monthGrid.innerHTML = '';
    const tempDate = new Date(Calendar.currentDate.getFullYear(), Calendar.currentDate.getMonth(), 1);
    
    const year = tempDate.getFullYear();
    const month = tempDate.getMonth();

    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    label.textContent = `${monthNames[month]} ${year}`;

    // Get index of first day of the week (0 = Sun, 6 = Sat)
    const firstDayIndex = tempDate.getDay();
    
    // Days in current month
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    // Days in previous month
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    // Week day headers
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    weekdays.forEach(day => {
      const dayHeader = document.createElement('div');
      dayHeader.className = 'calendar-day-header';
      dayHeader.textContent = day;
      monthGrid.appendChild(dayHeader);
    });

    // 1. Previous month padded days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthTotalDays - i;
      const prevMonthDate = new Date(year, month - 1, dayNum);
      Calendar.createCell(monthGrid, prevMonthDate, true);
    }

    // 2. Active month days
    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const activeDate = new Date(year, month, dayNum);
      Calendar.createCell(monthGrid, activeDate, false);
    }

    // 3. Next month padded days (fill out a grid of 6 weeks total = 42 cells)
    const currentCellsCount = firstDayIndex + totalDays;
    const paddingNeeded = 42 - currentCellsCount;
    for (let dayNum = 1; dayNum <= paddingNeeded; dayNum++) {
      const nextMonthDate = new Date(year, month + 1, dayNum);
      Calendar.createCell(monthGrid, nextMonthDate, true);
    }

    lucide.createIcons();
  },

  createCell: (gridEl, date, isOtherMonth) => {
    const cell = document.createElement('div');
    cell.className = `calendar-cell ${isOtherMonth ? 'other-month' : ''}`;
    
    const dateKey = TaskManager.getLocalDateString(date);
    const todayStr = TaskManager.getLocalDateString(new Date());
    
    if (dateKey === todayStr) {
      cell.classList.add('today');
    }

    // Double-click grid cell to quick add task on that date
    cell.addEventListener('dblclick', () => {
      const title = prompt(`Quick add task for ${date.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][date.getMonth()]}:`);
      if (title && title.trim()) {
        const newTask = {
          id: TaskManager.generateUUID(),
          title: title.trim(),
          dueDate: dateKey,
          priority: 'P4',
          tags: [],
          notes: '',
          projectId: '',
          sectionId: '',
          completed: false,
          completedDate: null,
          subtasks: [],
          recurrence: 'none',
          timeBlock: null,
          created: new Date().toISOString()
        };
        App.state.tasks.push(newTask);
        App.saveState();
        Calendar.render();
      }
    });

    // Drag-Drop Drop Zone
    cell.setAttribute('data-date', dateKey);
    cell.addEventListener('dragover', DragDrop.handleDragOver);
    cell.addEventListener('drop', DragDrop.handleDrop);

    const cellTasks = App.state.tasks.filter(t => t.dueDate === dateKey);

    cell.innerHTML = `
      <div class="cell-date">${date.getDate()}</div>
      <div class="cell-tasks">
        ${cellTasks.map(t => `
          <div class="cell-task-chip ${t.priority.toLowerCase()} ${t.completed ? 'completed' : ''}" onclick="TaskManager.openDetailPanel('${t.id}')">
            ${TaskManager.escapeHTML(t.title)}
          </div>
        `).join('')}
      </div>
    `;

    gridEl.appendChild(cell);
  },

  // Renders Week View columns
  renderWeek: () => {
    const weekGrid = document.getElementById('calendar-week-view');
    const label = document.getElementById('calendar-month-year-label');
    if (!weekGrid) return;

    weekGrid.innerHTML = '';
    
    // Find the first day of the active week (Sunday)
    const activeDate = new Date(Calendar.currentDate);
    const dayOfWeek = activeDate.getDay();
    const startOfWeek = new Date(activeDate.setDate(activeDate.getDate() - dayOfWeek));

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    label.textContent = `${startOfWeek.getDate()} ${months[startOfWeek.getMonth()]} - ${endOfWeek.getDate()} ${months[endOfWeek.getMonth()]} ${endOfWeek.getFullYear()}`;

    // Loop Sunday to Saturday
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      const dateKey = TaskManager.getLocalDateString(day);

      const isToday = dateKey === TaskManager.getLocalDateString(new Date());

      const colEl = document.createElement('div');
      colEl.className = `week-col ${isToday ? 'today' : ''}`;
      colEl.setAttribute('data-date', dateKey);
      colEl.addEventListener('dragover', DragDrop.handleDragOver);
      colEl.addEventListener('drop', DragDrop.handleDrop);

      const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayTasks = App.state.tasks.filter(t => t.dueDate === dateKey);

      colEl.innerHTML = `
        <div class="week-col-header">
          <div class="week-col-day">${weekdays[i]}</div>
          <div class="week-col-date">${day.getDate()}</div>
        </div>
        <div class="task-list" id="week-task-list-${i}" style="height: 100%;">
          <!-- Rendered below -->
        </div>
      `;

      weekGrid.appendChild(colEl);
      
      const listContainer = colEl.querySelector(`#week-task-list-${i}`);
      TaskManager.renderTaskList(listContainer, t => t.dueDate === dateKey);
    }

    lucide.createIcons();
  },

  // Renders Day Timeline View
  renderDay: () => {
    const timeline = document.getElementById('calendar-day-view');
    const label = document.getElementById('calendar-month-year-label');
    if (!timeline) return;

    timeline.innerHTML = '';
    const activeDateStr = TaskManager.getLocalDateString(Calendar.currentDate);
    const prettyDate = new Date(Calendar.currentDate);
    
    const weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    
    label.textContent = `${weekdays[prettyDate.getDay()]}, ${prettyDate.getDate()} ${months[prettyDate.getMonth()]} ${prettyDate.getFullYear()}`;

    // Load active routine blocks and tasks scheduled for today
    const routines = App.state.routines && App.state.routines.length > 0 ? App.state.routines : RoutineManager.DEFAULT_ROUTINES;
    const tasksForDay = App.state.tasks.filter(t => t.dueDate === activeDateStr);

    // Draw 24 hours of timeline blocks
    for (let hour = 0; hour < 24; hour++) {
      const hourStr = String(hour).padStart(2, '0');
      const timeVal = `${hourStr}:00`;
      
      const hourRow = document.createElement('div');
      hourRow.className = 'timeline-hour-row';
      hourRow.setAttribute('data-time', timeVal);

      // Drag over bindings for Time Blocking drops
      hourRow.addEventListener('dragover', DragDrop.handleDragOver);
      hourRow.addEventListener('drop', DragDrop.handleDropTimeBlock);

      // Check if any routines are scheduled in this hour block (e.g. 05:30 is in 05:00 block)
      const routinesInHour = routines.filter(r => {
        const rHour = parseInt(r.time.split(':')[0]);
        return rHour === hour;
      });

      // Check if any tasks are scheduled in this hour block
      const tasksInHour = tasksForDay.filter(t => {
        if (!t.timeBlock || !t.timeBlock.start) return false;
        const tHour = parseInt(t.timeBlock.start.split(':')[0]);
        return tHour === hour;
      });

      hourRow.innerHTML = `
        <div class="timeline-hour-label">${RoutineManager.formatTime(timeVal)}</div>
        <div class="timeline-block-area">
          ${routinesInHour.map(r => `
            <div style="font-size: 10px; background: var(--bg-hover); padding: 4px 8px; border-radius: 4px; display: flex; align-items: center; gap: 6px;">
              <span>${r.time}</span>
              <span>${r.icon}</span>
              <strong style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;">${TaskManager.escapeHTML(r.title)}</strong>
            </div>
          `).join('')}
          
          ${tasksInHour.map(t => `
            <div class="time-blocked-task ${t.priority.toLowerCase()} ${t.completed ? 'completed' : ''}" onclick="TaskManager.openDetailPanel('${t.id}')">
              <span>${t.timeBlock.start} - ${t.timeBlock.end || 'End'}</span> | 
              <strong>${TaskManager.escapeHTML(t.title)}</strong>
            </div>
          `).join('')}
        </div>
      `;

      timeline.appendChild(hourRow);
    }
  }
};
