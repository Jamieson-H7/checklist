// Add checklist items
const checklist = document.getElementById('checklist');
const input = document.getElementById('new-item-input');

// --- Add checked items list below input ---
let checkedLabel = document.createElement('label');
checkedLabel.textContent = 'Checked Items:';
checkedLabel.style.display = 'block';
checkedLabel.style.marginTop = '24px';
checkedLabel.style.cursor = 'pointer';

let checkedList = document.createElement('ul');
checkedList.id = 'checked-list';
checkedList.style.marginTop = '8px';
checkedList.style.paddingLeft = '0';
checkedList.style.listStyleType = 'none';
checkedList.style.display = 'none'; // Start hidden
checkedList.style.overflow = 'auto';
checkedList.style.minHeight = '24px';

// Toggle checked list visibility on label click
checkedLabel.addEventListener('click', function() {
    checkedList.style.display = (checkedList.style.display === 'none' || checkedList.style.display === '') ? 'block' : 'none';
});

input.insertAdjacentElement('afterend', checkedList);
input.insertAdjacentElement('afterend', checkedLabel);

const db = window.firebaseDb;
const ref = window.firebaseRef;
const set = window.firebaseSet;
const onValue = window.firebaseOnValue;

// Helper to add a checklist item to the main list (unchecked)
function addChecklistItem(item, checked = false, skipSave = false, dueDate = null, created = null, autoOpenDueDate = false) {
    if (!item) return;
    // Prevent duplicates
    if (document.getElementById(item)) return;
    if (document.getElementById('checked-' + item)) return;

    if (checked) {
        addCheckedListItem(item, skipSave, dueDate, created);
        return;
    }

    const li = document.createElement('li');
    const createdTimestamp = created ? Number(created) : Date.now();
    li.setAttribute('data-created', createdTimestamp);
    li.setAttribute('auto-due', autoOpenDueDate ? '1' : '0');
    // Show date created on hover (only on label)
    // li.title = 'Created: ' + formatCreatedDate(createdTimestamp); // remove from li

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = item;
    checkbox.checked = checked;

    const detailsContainer = document.createElement('div');
    detailsContainer.style.display = 'inline-grid';
    detailsContainer.style.width = '100%';
    detailsContainer.style.gridTemplateColumns = '1fr 8fr 2fr 1fr'; // checkbox, label, progress bar, button
    detailsContainer.style.columnGap = '8px';
    detailsContainer.style.justifyContent = 'center';
    detailsContainer.style.alignItems = 'center';

    // Label

    const label = document.createElement('label');
    label.htmlFor = item;
    label.appendChild(document.createTextNode(item));
    label.title = 'Created: ' + formatCreatedDate(createdTimestamp);

    // Due date display (now only as tooltip on progress bar)
    // Remove dueDateSpan from visible UI
    // Progress bar
    const progressBar = document.createElement('div');
    progressBar.className = 'due-progress-bar';
    progressBar.style.height = '8px';
    progressBar.style.width = '60px'; // half as wide
    progressBar.style.background = '#eee';
    progressBar.style.borderRadius = '4px';
    progressBar.style.marginLeft = '10px';
    progressBar.style.marginTop = '4px';
    progressBar.style.overflow = 'hidden';
    progressBar.style.display = dueDate ? 'inline-block' : 'none';
    progressBar.style.position = 'relative';
    if (dueDate) progressBar.title = formatDueDate(dueDate);
    const progressFill = document.createElement('div');
    progressFill.style.height = '100%';
    progressFill.style.background = '#4caf50';
    progressFill.style.width = '0%';
    progressFill.style.transition = 'width 0.3s';
    progressFill.style.position = 'absolute';
    progressFill.style.top = '0';
    progressFill.style.right = '0';
    progressBar.appendChild(progressFill);
    // Helper to update progress
    function updateProgressBar() {
        if (!dueDate) {
            progressBar.style.display = 'none';
            progressBar.title = '';
            return;
        }
        const now = Date.now();
        const due = new Date(dueDate).getTime();
        const total = 14 * 24 * 60 * 60 * 1000; // 14 days in ms
        const left = due - now;
        let percent = 100 * (left / total);
        if (percent < 0) percent = 0;
        if (percent > 100) percent = 100;
        // Deplete towards the right
        progressFill.style.width = percent + '%';
        progressFill.style.left = 'auto';
        progressFill.style.right = '0';
        progressBar.style.display = 'inline-block';
        progressBar.title = formatDueDate(dueDate);
        if (percent === 0) progressFill.style.background = '#f44336';
        else if (percent < 30) progressFill.style.background = '#ff9800';
        else progressFill.style.background = '#4caf50';
    }
    if (dueDate) updateProgressBar();

    // Set Due Date button
    const setDueBtn = document.createElement('button');
    setDueBtn.innerHTML = '📅';
    setDueBtn.title = 'Set Due Date';
    setDueBtn.type = 'button';
    setDueBtn.style.marginLeft = '10px';

    // Popup menu for due date
    let popup = null;
    // Refactored: openDueDatePopup now takes li and setDueBtn as arguments
    function openDueDatePopup(targetLi, targetBtn) {
        // Remove any existing popup
        if (popup) popup.remove();
        document.querySelectorAll('.due-date-popup').forEach(el => el.remove());
        popup = document.createElement('div');
        popup.className = 'due-date-popup';
        popup.style.position = 'absolute';
        popup.style.background = '#fff';
        popup.style.border = '1px solid #ccc';
        popup.style.padding = '8px';
        popup.style.borderRadius = '6px';
        popup.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        popup.style.zIndex = 2000;
        // Position popup below the button, relative to the button (fix)
        const rect = targetBtn.getBoundingClientRect();
        popup.style.left = (window.scrollX + rect.left) + 'px';
        popup.style.top = (window.scrollY + rect.bottom + 4) + 'px';
        // Days input
        const daysInput = document.createElement('input');
        daysInput.type = 'number';
        daysInput.min = '0';
        daysInput.placeholder = 'Days until due';
        daysInput.style.width = '110px';
        daysInput.style.marginRight = '8px';
        // Time input
        const timeInput = document.createElement('input');
        timeInput.type = 'time';
        timeInput.step = 1800;
        timeInput.style.marginRight = '8px';
        // Confirm button
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Set';
        confirmBtn.type = 'button';
        confirmBtn.style.marginRight = '4px';
        function setDueDateFromPopup() {
            const days = parseInt(daysInput.value, 10);
            const time = timeInput.value;
            if (!isNaN(days) && time) {
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                const due = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
                const [hh, mm] = time.split(':');
                due.setHours(Number(hh), Number(mm), 0, 0);
                const pad = n => n.toString().padStart(2, '0');
                const isoLocal = `${due.getFullYear()}-${pad(due.getMonth()+1)}-${pad(due.getDate())}T${pad(due.getHours())}:${pad(due.getMinutes())}`;
                targetLi.setAttribute('data-due', isoLocal);
                targetLi.setAttribute('auto-due', '0'); // reset
                // update progress bar for this item
                dueDate = isoLocal;
                updateProgressBar();
                saveChecklistState();
                popup.remove();
            }
        }
        confirmBtn.addEventListener('click', setDueDateFromPopup);
        daysInput.addEventListener('keydown', function(ev) {
            if (ev.key === 'Enter') setDueDateFromPopup();
        });
        timeInput.addEventListener('keydown', function(ev) {
            if (ev.key === 'Enter') setDueDateFromPopup();
        });
        // Close popup on click outside
        setTimeout(() => {
            document.addEventListener('mousedown', function handler(ev) {
                if (!popup.contains(ev.target) && ev.target !== targetBtn) {
                    popup.remove();
                    document.removeEventListener('mousedown', handler);
                }
            });
            document.addEventListener('keydown', function handler(ev) {
                if (ev.key === 'Escape') {
                    popup.remove();
                    document.removeEventListener('keypress', handler);
                }
            });
        }, 0);
        popup.appendChild(daysInput);
        popup.appendChild(timeInput);
        popup.appendChild(confirmBtn);
        document.body.appendChild(popup);
        // Focus the days input
        daysInput.focus();
    }
    setDueBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDueDatePopup(li, setDueBtn);
    });

    // If dueDate exists, set data-due
    if (dueDate) {
        li.setAttribute('data-due', dueDate);
    }

    // Remove inline daysInput, timeInput, setDueBtn from li
    li.appendChild(detailsContainer);
    detailsContainer.appendChild(checkbox);
    detailsContainer.appendChild(label);
    detailsContainer.appendChild(progressBar);
    detailsContainer.appendChild(setDueBtn);

    // Add right-click context menu for delete
    li.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        const existingMenu = document.getElementById('delete-context-menu');
        if (existingMenu) existingMenu.remove();

        const menu = document.createElement('div');
        menu.id = 'delete-context-menu';
        menu.textContent = 'Delete';
        menu.style.position = 'absolute';
        menu.style.top = `${e.clientY}px`;
        menu.style.left = `${e.clientX}px`;
        menu.style.background = '#0e2b39ff';
        menu.style.border = '1px solid #ccc';
        menu.style.padding = '4px 12px';
        menu.style.cursor = 'pointer';
        menu.style.borderRadius = '4px';
        menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        menu.style.zIndex = 1000;

        menu.addEventListener('click', () => {
            li.remove();
            saveChecklistState();
            menu.remove();
        });

        document.addEventListener('click', function handler() {
            menu.remove();
            document.removeEventListener('click', handler);
        });

        document.body.appendChild(menu);
    });

    // Listen for checking
    checkbox.addEventListener('change', function() {
        if (checkbox.checked) {
            addCheckedListItem(item, false, li.getAttribute('data-due') || null);
            li.remove();
        }
        saveChecklistState();
    });

    checklist.appendChild(li);

    // If requested, open the due date popup and focus input
    if (autoOpenDueDate) {
        setTimeout(() => openDueDatePopup(li, setDueBtn), 0);
    }

    if (!skipSave) saveChecklistState();
}

// Helper to add an item to the checked items list
function addCheckedListItem(item, skipSave = false, dueDate = null, created = null) {
    if (document.getElementById('checked-' + item)) return;
    const li = document.createElement('li');
    const createdTimestamp = created ? Number(created) : Date.now();
    li.id = 'checked-' + item;
    li.setAttribute('data-created', createdTimestamp);
    // Show date created on hover (only on label)
    // li.title = 'Created: ' + formatCreatedDate(createdTimestamp); // remove from li

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.id = 'checkedbox-' + item;

    const label = document.createElement('label');
    label.htmlFor = 'checkedbox-' + item;
    label.appendChild(document.createTextNode(item));
    label.title = 'Created: ' + formatCreatedDate(createdTimestamp);

    // Due date display (now only as tooltip on progress bar)
    // Remove dueDateSpan from visible UI
    // Progress bar
    const progressBar = document.createElement('div');
    progressBar.className = 'due-progress-bar';
    progressBar.style.height = '8px';
    progressBar.style.width = '60px'; // half as wide
    progressBar.style.background = '#eee';
    progressBar.style.borderRadius = '4px';
    progressBar.style.marginLeft = '10px';
    progressBar.style.marginTop = '4px';
    progressBar.style.overflow = 'hidden';
    progressBar.style.display = dueDate ? 'inline-block' : 'none';
    progressBar.style.position = 'relative';
    if (dueDate) progressBar.title = formatDueDate(dueDate);
    const progressFill = document.createElement('div');
    progressFill.style.height = '100%';
    progressFill.style.background = '#4caf50';
    progressFill.style.width = '0%';
    progressFill.style.transition = 'width 0.3s';
    progressFill.style.position = 'absolute';
    progressFill.style.top = '0';
    progressFill.style.right = '0';
    progressBar.appendChild(progressFill);
    function updateProgressBar() {
        if (!dueDate) {
            progressBar.style.display = 'none';
            progressBar.title = '';
            return;
        }
        const now = Date.now();
        const due = new Date(dueDate).getTime();
        const total = 14 * 24 * 60 * 60 * 1000; // 14 days in ms
        const left = due - now;
        let percent = 100 * (left / total);
        if (percent < 0) percent = 0;
        if (percent > 100) percent = 100;
        // Deplete towards the right
        progressFill.style.width = percent + '%';
        progressFill.style.left = 'auto';
        progressFill.style.right = '0';
        progressBar.style.display = 'inline-block';
        progressBar.title = formatDueDate(dueDate);
        if (percent === 0) progressFill.style.background = '#f44336';
        else if (percent < 30) progressFill.style.background = '#ff9800';
        else progressFill.style.background = '#4caf50';
    }
    if (dueDate) updateProgressBar();

    // Set Due Date button
    const setDueBtn = document.createElement('button');
    setDueBtn.innerHTML = '📅';
    setDueBtn.title = 'Set Due Date';
    setDueBtn.type = 'button';
    setDueBtn.style.marginLeft = '10px';

    // Popup menu for due date
    let popup = null;
    setDueBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Remove any existing popup
        if (popup) popup.remove();
        document.querySelectorAll('.due-date-popup').forEach(el => el.remove());
        popup = document.createElement('div');
        popup.className = 'due-date-popup';
        popup.style.position = 'absolute';
        popup.style.background = '#fff';
        popup.style.border = '1px solid #ccc';
        popup.style.padding = '8px';
        popup.style.borderRadius = '6px';
        popup.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        popup.style.zIndex = 2000;
        // Position popup below the button
        const rect = setDueBtn.getBoundingClientRect();
        popup.style.left = (window.scrollX + rect.left) + 'px';
        popup.style.top = (window.scrollY + rect.bottom + 4) + 'px';
        // Days input
        const daysInput = document.createElement('input');
        daysInput.type = 'number';
        daysInput.min = '0';
        daysInput.placeholder = 'Days until due';
        daysInput.style.width = '110px';
        daysInput.style.marginRight = '8px';
        // Time input
        const timeInput = document.createElement('input');
        timeInput.type = 'time';
        timeInput.step = 1800;
        timeInput.style.marginRight = '8px';
        // Confirm button
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Set';
        confirmBtn.type = 'button';
        confirmBtn.style.marginRight = '4px';
        function setDueDateFromPopup() {
            const days = parseInt(daysInput.value, 10);
            const time = timeInput.value;
            if (!isNaN(days) && time) {
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                const due = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
                const [hh, mm] = time.split(':');
                due.setHours(Number(hh), Number(mm), 0, 0);
                const pad = n => n.toString().padStart(2, '0');
                const isoLocal = `${due.getFullYear()}-${pad(due.getMonth()+1)}-${pad(due.getDate())}T${pad(due.getHours())}:${pad(due.getMinutes())}`;
                li.setAttribute('data-due', isoLocal);
                dueDate = isoLocal; // update outer variable
                updateProgressBar();
                saveChecklistState();
                popup.remove();
            }
        }
        confirmBtn.addEventListener('click', setDueDateFromPopup);
        daysInput.addEventListener('keydown', function(ev) {
            if (ev.key === 'Enter') setDueDateFromPopup();
        });
        timeInput.addEventListener('keydown', function(ev) {
            if (ev.key === 'Enter') setDueDateFromPopup();
        });
        // Close popup on click outside
        setTimeout(() => {
            document.addEventListener('mousedown', function handler(ev) {
                if (!popup.contains(ev.target) && ev.target !== setDueBtn) {
                    popup.remove();
                    document.removeEventListener('mousedown', handler);
                }
            });
            document.addEventListener('keydown', function handler(ev) {
                if (ev.key === 'Escape') {
                    popup.remove();
                    document.removeEventListener('keypress', handler);
                }
            });
        }, 0);
        popup.appendChild(daysInput);
        popup.appendChild(timeInput);
        popup.appendChild(confirmBtn);
        document.body.appendChild(popup);
    });

    // If dueDate exists, set data-due
    if (dueDate) {
        li.setAttribute('data-due', dueDate);
    }

    // Remove inline daysInput, timeInput, setDueBtn from li
    li.appendChild(checkbox);
    li.appendChild(label);
    li.appendChild(progressBar);
    li.appendChild(setDueBtn);

    // Add right-click context menu for delete
    li.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        const existingMenu = document.getElementById('delete-context-menu');
        if (existingMenu) existingMenu.remove();

        const menu = document.createElement('div');
        menu.id = 'delete-context-menu';
        menu.textContent = 'Delete';
        menu.style.position = 'absolute';
        menu.style.top = `${e.clientY}px`;
        menu.style.left = `${e.clientX}px`;
        menu.style.background = '#fff';
        menu.style.color = '#000';
        menu.style.border = '1px solid #ccc';
        menu.style.padding = '4px 12px';
        menu.style.borderRadius = '4px';
        menu.style.boxShadow = '0 2px 8px rgba(208, 208, 208, 0.15)';
        menu.style.cursor = 'pointer';
        menu.style.zIndex = 1000;

        menu.addEventListener('click', () => {
            li.remove();
            saveChecklistState();
            menu.remove();
        });

        document.addEventListener('click', function handler() {
            menu.remove();
            document.removeEventListener('click', handler);
        });

        document.body.appendChild(menu);
    });

    // Listen for unchecking
    checkbox.addEventListener('change', function() {
        if (!checkbox.checked) {
            li.remove();
            addChecklistItem(item, false, true, li.getAttribute('data-due') || null);
            saveChecklistState();
        } else {
            saveChecklistState();
        }
    });

    checkedList.appendChild(li);

    if (!skipSave) saveChecklistState();
}

// Listen for Enter key to add new item
input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && input.value.trim()) {
        addChecklistItem(input.value.trim(), false, false, null, null, true); // autoOpenDueDate = true
        input.value = '';
    }
});

// Helper function to format due date for display as a readable string
function formatDueDate(dt) {
    if (!dt) return '';
    // dt is in 'YYYY-MM-DDTHH:MM' format (local time)
    const [date, time] = dt.split('T');
    if (!date || !time) return dt;
    const [year, month, day] = date.split('-');
    const [hour, minute] = time.split(':');
    const d = new Date(Number(year), Number(month)-1, Number(day), Number(hour), Number(minute));
    if (isNaN(d.getTime())) return dt;
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return d.toLocaleString(undefined, options);
}

// Helper to format created date for tooltip display
function formatCreatedDate(ts) {
    const d = new Date(Number(ts));
    if (isNaN(d.getTime())) return '';
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return d.toLocaleString(undefined, options);
}

// Save checklist state to Firebase (items and checked state)
function saveChecklistState() {
    const state = {};
    checklist.querySelectorAll('li').forEach(li => {
        const checkbox = li.querySelector('input[type="checkbox"]');
        // Only get the label that is a sibling of the checkbox
        let label = null;
        if (checkbox) {
            label = checkbox.nextSibling;
            // If nextSibling is a text node, skip to nextElementSibling
            if (label && label.nodeType !== 1) label = checkbox.nextElementSibling;
        }
        const dueDate = li.getAttribute('data-due') || null;
        const created = li.getAttribute('data-created') || Date.now();
        const autoOpenDueDate = li.getAttribute('auto-due') === '1' ? true : false;
        state[checkbox.id] = {
            checked: false,
            label: label && label.textContent ? label.textContent : '',
            dueDate: dueDate,
            created: created,
            autoOpenDueDate: autoOpenDueDate
        };
    });
    checkedList.querySelectorAll('li').forEach(li => {
        const checkbox = li.querySelector('input[type="checkbox"]');
        let label = null;
        if (checkbox) {
            label = checkbox.nextSibling;
            if (label && label.nodeType !== 1) label = checkbox.nextElementSibling;
        }
        const dueDate = li.getAttribute('data-due') || null;
        const created = li.getAttribute('data-created') || Date.now();
        const itemId = li.id.replace('checked-', '');
        const autoOpenDueDate = li.getAttribute('auto-due') === '1' ? true : false;
        state[itemId] = {
            checked: true,
            label: label && label.textContent ? label.textContent : '',
            dueDate: dueDate,
            created: created,
            autoOpenDueDate: autoOpenDueDate
        };
    });
    set(ref(db, 'checklist'), state);
}

// Load checklist state from Firebase and render items
onValue(ref(db, 'checklist'), snapshot => {
    const state = snapshot.val() || {};
    checklist.innerHTML = '';
    checkedList.innerHTML = '';
    let hasChecked = false;
    Object.keys(state).forEach(key => {
        if (state[key].checked) hasChecked = true;
        addChecklistItem(key, state[key].checked, true, state[key].dueDate || null, state[key].created || null,state[key].autoOpenDueDate || false);
    });
    // If there are checked items, show the checked list by default
    if (hasChecked) {
        checkedList.style.display = 'block';
    } else {
        checkedList.style.display = 'none';
    }
    sortListByDueDate(checklist);
    sortListByDueDate(checkedList);
});

// Add sort buttons
const sortContainer = document.createElement('div');
sortContainer.style.margin = '16px 0';

const sortCreatedBtn = document.createElement('button');
sortCreatedBtn.textContent = 'Sort by Created';
sortCreatedBtn.type = 'button';
sortCreatedBtn.style.marginRight = '8px';

const sortDueBtn = document.createElement('button');
sortDueBtn.textContent = 'Sort by Due Date';
sortDueBtn.type = 'button';

sortContainer.appendChild(sortCreatedBtn);
sortContainer.appendChild(sortDueBtn);

checklist.parentNode.parentNode.insertBefore(sortContainer, checklist.parentNode);

// Sorting logic

// Sort a list by the created timestamp (ascending)
function sortListByCreated(list) {
    const items = Array.from(list.children);
    items.sort((a, b) => {
        return Number(a.getAttribute('data-created')) - Number(b.getAttribute('data-created'));
    });
    items.forEach(item => list.appendChild(item));
}

// Sort a list by due date (ascending, empty due dates last)
function sortListByDueDate(list) {
    const items = Array.from(list.children);
    items.sort((a, b) => {
        const aDate = a.getAttribute('data-due') || '';
        const bDate = b.getAttribute('data-due') || '';
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return aDate.localeCompare(bDate);
    });
    items.forEach(item => list.appendChild(item));
}

sortCreatedBtn.addEventListener('click', function() {
    sortListByCreated(checklist);
    sortListByCreated(checkedList);
});
sortDueBtn.addEventListener('click', function() {
    sortListByDueDate(checklist);
    sortListByDueDate(checkedList);
});

// Remove legacy event listeners at the end