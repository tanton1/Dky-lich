import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';

const db = new Database('app.db');

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT,
    sessionsPerWeek INTEGER,
    availableSlots TEXT
  );
  CREATE TABLE IF NOT EXISTS trainers (
    id TEXT PRIMARY KEY,
    name TEXT
  );
  CREATE TABLE IF NOT EXISTS schedule_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    schedule TEXT,
    warnings TEXT
  );
  INSERT OR IGNORE INTO schedule_state (id, schedule, warnings) VALUES (1, '{}', '[]');
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/data', (req, res) => {
    try {
      const students = db.prepare('SELECT * FROM students').all().map((s: any) => ({
        ...s,
        availableSlots: JSON.parse(s.availableSlots)
      }));
      const trainers = db.prepare('SELECT * FROM trainers').all();
      const state = db.prepare('SELECT * FROM schedule_state WHERE id = 1').get() as any;
      
      res.json({
        students,
        trainers,
        schedule: JSON.parse(state.schedule),
        warnings: JSON.parse(state.warnings)
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/students', (req, res) => {
    try {
      const { id, name, sessionsPerWeek, availableSlots } = req.body;
      db.prepare('INSERT OR REPLACE INTO students (id, name, sessionsPerWeek, availableSlots) VALUES (?, ?, ?, ?)').run(
        id, name, sessionsPerWeek, JSON.stringify(availableSlots)
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.delete('/api/students/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/trainers', (req, res) => {
    try {
      const { id, name } = req.body;
      db.prepare('INSERT OR REPLACE INTO trainers (id, name) VALUES (?, ?)').run(id, name);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.delete('/api/trainers/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM trainers WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/schedule', (req, res) => {
    try {
      const { schedule, warnings } = req.body;
      db.prepare('UPDATE schedule_state SET schedule = ?, warnings = ? WHERE id = 1').run(
        JSON.stringify(schedule), JSON.stringify(warnings)
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/clear', (req, res) => {
    try {
      db.prepare('DELETE FROM students').run();
      db.prepare('DELETE FROM trainers').run();
      db.prepare('UPDATE schedule_state SET schedule = ?, warnings = ? WHERE id = 1').run('{}', '[]');
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
