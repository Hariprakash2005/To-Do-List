const API_BASE = 'http://localhost:5001/api';

const elements = {
  newTodoInput: document.getElementById('newTodoInput'),
  addTodoBtn: document.getElementById('addTodoBtn'),
  todoList: document.getElementById('todoList'),
  itemsLeft: document.getElementById('itemsLeft'),
  clearCompletedBtn: document.getElementById('clearCompletedBtn'),
  filters: Array.from(document.querySelectorAll('.filter')),
  template: document.getElementById('todoItemTemplate'),
  themeToggle: document.getElementById('themeToggle')
};

let currentFilter = 'all'; // 'all' | 'active' | 'completed'

function setTheme() {
  const current = document.documentElement.dataset.theme;
  document.documentElement.dataset.theme = current === 'light' ? '' : 'light';
}

elements.themeToggle.addEventListener('click', setTheme);

async function fetchJSON(url, options) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return null;
  return res.json();
}

async function loadTodos() {
  const todos = await fetchJSON(`${API_BASE}/todos?status=${currentFilter}`);
  renderList(todos);
}

function renderList(todos) {
  elements.todoList.innerHTML = '';
  let activeCount = 0;
  for (const todo of todos) {
    if (!todo.completed) activeCount += 1;
    const node = renderItem(todo);
    elements.todoList.appendChild(node);
  }
  elements.itemsLeft.textContent = `${activeCount} item${activeCount === 1 ? '' : 's'} left`;
}

function renderItem(todo) {
  const node = elements.template.content.firstElementChild.cloneNode(true);
  const checkbox = node.querySelector('input.toggle');
  const titleEl = node.querySelector('.title');
  const editBtn = node.querySelector('.edit');
  const deleteBtn = node.querySelector('.delete');

  node.dataset.id = todo.id;
  titleEl.textContent = todo.title;
  checkbox.checked = !!todo.completed;
  if (todo.completed) node.classList.add('completed');

  checkbox.addEventListener('change', async () => {
    try {
      await updateTodo(todo.id, { completed: checkbox.checked });
      node.classList.toggle('completed', checkbox.checked);
      await loadTodos();
    } catch (e) { console.error(e); }
  });

  editBtn.addEventListener('click', async () => {
    const editing = titleEl.getAttribute('contenteditable') === 'true';
    if (!editing) {
      titleEl.setAttribute('contenteditable', 'true');
      titleEl.focus();
      placeCaretAtEnd(titleEl);
      editBtn.textContent = '💾';
    } else {
      const newTitle = titleEl.textContent.trim();
      if (newTitle && newTitle !== todo.title) {
        try {
          await updateTodo(todo.id, { title: newTitle });
          await loadTodos();
        } catch (e) { console.error(e); }
      }
      titleEl.setAttribute('contenteditable', 'false');
      editBtn.textContent = '✏️';
    }
  });

  titleEl.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      editBtn.click();
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      titleEl.setAttribute('contenteditable', 'false');
      editBtn.textContent = '✏️';
      titleEl.textContent = todo.title;
    }
  });

  deleteBtn.addEventListener('click', async () => {
    try {
      await deleteTodo(todo.id);
      node.remove();
      await loadTodos();
    } catch (e) { console.error(e); }
  });

  return node;
}

function placeCaretAtEnd(el) {
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(el);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

async function addTodo(title) {
  return fetchJSON(`${API_BASE}/todos`, {
    method: 'POST',
    body: JSON.stringify({ title })
  });
}

async function updateTodo(id, payload) {
  return fetchJSON(`${API_BASE}/todos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

async function deleteTodo(id) {
  return fetchJSON(`${API_BASE}/todos/${id}`, { method: 'DELETE' });
}

async function clearCompleted() {
  return fetchJSON(`${API_BASE}/todos`, { method: 'DELETE' });
}

elements.addTodoBtn.addEventListener('click', async () => {
  const title = elements.newTodoInput.value.trim();
  if (!title) return;
  try {
    await addTodo(title);
    elements.newTodoInput.value = '';
    await loadTodos();
  } catch (e) { console.error(e); }
});

elements.newTodoInput.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter') {
    elements.addTodoBtn.click();
  }
});

elements.clearCompletedBtn.addEventListener('click', async () => {
  try {
    await clearCompleted();
    await loadTodos();
  } catch (e) { console.error(e); }
});

elements.filters.forEach(btn => {
  btn.addEventListener('click', async () => {
    elements.filters.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    await loadTodos();
  });
});

// Initial load
loadTodos();


