import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'todos.json');

// Ensure data directory and file exist
function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([] , null, 2));
  }
}

function readTodos() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function writeTodos(todos) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(todos, null, 2));
}

app.use(cors());
app.use(express.json());

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get all todos with optional filters
app.get('/api/todos', (req, res) => {
  const { status } = req.query; // 'all' | 'active' | 'completed'
  let todos = readTodos();
  if (status === 'active') {
    todos = todos.filter(t => !t.completed);
  } else if (status === 'completed') {
    todos = todos.filter(t => t.completed);
  }
  res.json(todos);
});

// Create todo
app.post('/api/todos', (req, res) => {
  const { title } = req.body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const todos = readTodos();
  const newTodo = {
    id: uuidv4(),
    title: title.trim(),
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  todos.unshift(newTodo);
  writeTodos(todos);
  res.status(201).json(newTodo);
});

// Update todo (title and/or completed)
app.put('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  const { title, completed } = req.body;
  const todos = readTodos();
  const idx = todos.findIndex(t => t.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Todo not found' });
  }
  if (title !== undefined) {
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title must be a non-empty string' });
    }
    todos[idx].title = title.trim();
  }
  if (completed !== undefined) {
    if (typeof completed !== 'boolean') {
      return res.status(400).json({ error: 'Completed must be boolean' });
    }
    todos[idx].completed = completed;
  }
  todos[idx].updatedAt = new Date().toISOString();
  writeTodos(todos);
  res.json(todos[idx]);
});

// Delete todo
app.delete('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  const todos = readTodos();
  const exists = todos.some(t => t.id === id);
  if (!exists) {
    return res.status(404).json({ error: 'Todo not found' });
  }
  const next = todos.filter(t => t.id !== id);
  writeTodos(next);
  res.status(204).send();
});

// Bulk: clear completed
app.delete('/api/todos', (req, res) => {
  const todos = readTodos();
  const active = todos.filter(t => !t.completed);
  writeTodos(active);
  res.json({ removed: todos.length - active.length });
});

app.listen(PORT, () => {
  console.log(`Todo backend running on http://localhost:${PORT}`);
});


