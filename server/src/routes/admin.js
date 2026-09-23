const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateAdmin } = require('../middleware/adminAuth');

const router = express.Router();

router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'username and password are required' });
  }
  if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ message: 'Invalid admin credentials' });
  }

  const token = jwt.sign({ role: 'admin', username }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
}));

router.get('/elections', authenticateAdmin, asyncHandler(async (req, res) => {
  const [elections] = await pool.query(
    'SELECT id, title, status, start_time, end_time FROM elections ORDER BY id DESC'
  );
  res.json(
    elections.map((e) => ({
      id: e.id,
      title: e.title,
      status: e.status,
      startTime: e.start_time,
      endTime: e.end_time,
    }))
  );
}));

router.post('/elections', authenticateAdmin, asyncHandler(async (req, res) => {
  const { title, description, startTime, endTime, positions } = req.body;
  if (!title || !startTime || !endTime || !Array.isArray(positions) || positions.length === 0) {
    return res.status(400).json({ message: 'title, startTime, endTime and at least one position are required' });
  }
  for (const pos of positions) {
    if (!pos.title || !Array.isArray(pos.candidates) || pos.candidates.length === 0) {
      return res.status(400).json({ message: 'Every position needs a title and at least one candidate' });
    }
    for (const cand of pos.candidates) {
      if (!cand.name) {
        return res.status(400).json({ message: 'Every candidate needs a name' });
      }
    }
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (!(start < end)) {
    return res.status(400).json({ message: 'Opens time must be before closes time' });
  }
  const now = new Date();
  const status = end <= now ? 'closed' : start <= now ? 'active' : 'upcoming';

  const conn = await pool.getConnection();
  let electionId;
  try {
    await conn.beginTransaction();
    const [electionResult] = await conn.query(
      'INSERT INTO elections (title, description, start_time, end_time, status, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description || null, start, end, status, null]
    );
    electionId = electionResult.insertId;

    for (const pos of positions) {
      const [posResult] = await conn.query(
        'INSERT INTO positions (election_id, title, max_winners) VALUES (?, ?, ?)',
        [electionId, pos.title, pos.maxWinners || 1]
      );
      const positionId = posResult.insertId;

      for (const cand of pos.candidates) {
        await conn.query(
          'INSERT INTO candidates (position_id, name, photo_url, manifesto) VALUES (?, ?, ?, ?)',
          [positionId, cand.name, cand.photoUrl || null, cand.manifesto || null]
        );
      }
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  res.status(201).json({ id: electionId, status });
}));

router.post('/elections/:id/close', authenticateAdmin, asyncHandler(async (req, res) => {
  const electionId = Number(req.params.id);
  const [result] = await pool.query("UPDATE elections SET status = 'closed' WHERE id = ?", [electionId]);
  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Election not found' });
  }

  const io = req.app.get('io');
  io.to(`election:${electionId}`).emit('vote:updated', { electionId });

  res.json({ id: electionId, status: 'closed' });
}));

router.get('/elections/:id/turnout', authenticateAdmin, asyncHandler(async (req, res) => {
  const electionId = Number(req.params.id);

  const [electionRows] = await pool.query('SELECT id FROM elections WHERE id = ?', [electionId]);
  if (!electionRows[0]) {
    return res.status(404).json({ message: 'Election not found' });
  }

  const [[{ totalStudents }]] = await pool.query('SELECT COUNT(*) AS totalStudents FROM students');
  const [[{ votesCast }]] = await pool.query(
    'SELECT COUNT(DISTINCT student_id) AS votesCast FROM votes WHERE election_id = ?',
    [electionId]
  );

  const [deptRows] = await pool.query(
    `SELECT s.department AS name,
            COUNT(DISTINCT s.id) AS total,
            COUNT(DISTINCT v.student_id) AS cast_count
     FROM students s
     LEFT JOIN votes v ON v.student_id = s.id AND v.election_id = ?
     GROUP BY s.department`,
    [electionId]
  );

  res.json({
    registeredVoters: totalStudents,
    votesCast,
    turnoutPct: totalStudents > 0 ? Math.round((votesCast / totalStudents) * 100) : 0,
    departments: deptRows.map((d) => ({
      name: d.name || 'Unspecified',
      cast: Number(d.cast_count),
      total: Number(d.total),
      pct: d.total > 0 ? Math.round((Number(d.cast_count) / Number(d.total)) * 100) : 0,
    })),
  });
}));

module.exports = router;
