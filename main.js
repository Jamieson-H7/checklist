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

// Start hidden
checkedList.style.display = 'none';

// Toggle checked list visibility on label click
checkedLabel.addEventListener('click', function() {
    checkedList.style.display = (checkedList.style.display === 'none') ? 'block' : 'none';
});

input.insertAdjacentElement('afterend', checkedList);
input.insertAdjacentElement('afterend', checkedLabel);

const db = window.firebaseDb;
const ref = window.firebaseRef;
const set = window.firebaseSet;
const onValue = window.firebaseOnValue;

// Helper to add a checklist item
function addChecklistItem(item, checked = false, skipSave = false) {
    if (!item) return;
    // Prevent duplicates
    if (document.getElementById(item)) return;
    if (document.getElementById('checked-' + item)) return;

    if (checked) {
        addCheckedListItem(item, skipSave);
        return;
    }

    const li = document.createElement('li');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = item;
    checkbox.checked = checked;

    const label = document.createElement('label');
    label.htmlFor = item;
    label.appendChild(document.createTextNode(item));

    li.appendChild(checkbox);
    li.appendChild(label);

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
        menu.style.border = '1px solid #ccc';
        menu.style.padding = '4px 12px';
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

    // Listen for checking
    checkbox.addEventListener('change', function() {
        if (checkbox.checked) {
            addCheckedListItem(item);
            li.remove();
        }
        saveChecklistState();
    });

    checklist.appendChild(li);

    if (!skipSave) saveChecklistState();
}

// Helper to add an item to the checked items list
function addCheckedListItem(item, skipSave = false) {
    if (document.getElementById('checked-' + item)) return;
    const li = document.createElement('li');
    li.id = 'checked-' + item;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.id = 'checkedbox-' + item;

    const label = document.createElement('label');
    label.htmlFor = 'checkedbox-' + item;
    label.appendChild(document.createTextNode(item));

    li.appendChild(checkbox);
    li.appendChild(label);

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
        menu.style.border = '1px solid #ccc';
        menu.style.padding = '4px 12px';
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
            addChecklistItem(item, false, true); // skipSave true to avoid double save
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
        addChecklistItem(input.value.trim());
        input.value = '';
    }
});

// Save checklist state to Firebase (items and checked state)
function saveChecklistState() {
    const state = {};
    // Unchecked items
    checklist.querySelectorAll('li').forEach(li => {
        const checkbox = li.querySelector('input[type="checkbox"]');
        const label = li.querySelector('label');
        state[checkbox.id] = {
            checked: false,
            label: label.textContent
        };
    });
    // Checked items
    checkedList.querySelectorAll('li').forEach(li => {
        const checkbox = li.querySelector('input[type="checkbox"]');
        const label = li.querySelector('label');
        // Remove 'checked-' prefix for id
        const itemId = li.id.replace('checked-', '');
        state[itemId] = {
            checked: true,
            label: label.textContent
        };
    });
    set(ref(db, 'checklist'), state);
}

// Load checklist state from Firebase (items and checked state)
onValue(ref(db, 'checklist'), snapshot => {
    const state = snapshot.val() || {};
    checklist.innerHTML = '';
    checkedList.innerHTML = '';
    Object.keys(state).forEach(key => {
        addChecklistItem(key, state[key].checked, true);
    });
});

// Add event listeners to checkboxes (for legacy support)
checklist.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
        const li = checkbox.closest('li');
        if (checkbox.checked) {
            // Move to checked list
            addCheckedListItem(li.id);
            li.remove();
        } else {
            // Move back to checklist
            addChecklistItem(li.id, false);
            li.remove();
        }
        saveChecklistState();
    });
});