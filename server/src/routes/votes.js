const express = require('express');
const pool = require('../db/pool');
const { authenticateJWT } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

function generateReceiptId() {
  return 'SDEC-' + Math.floor(100000 + Math.random() * 900000);
}

router.post('/', authenticateJWT, asyncHandler(async (req, res) => {
  const { electionId, selections } = req.body;
  if (!electionId || !Array.isArray(selections) || selections.length === 0) {
    return res.status(400).json({ message: 'electionId and selections are required' });
  }

  const [electionRows] = await pool.query('SELECT * FROM elections WHERE id = ?', [electionId]);
  const election = electionRows[0];
  if (!election) {
    return res.status(404).json({ message: 'Election not found' });
  }
  if (election.status !== 'active') {
    return res.status(403).json({ message: 'This election is not currently open for voting' });
  }

  const [positions] = await pool.query('SELECT id FROM positions WHERE election_id = ?', [electionId]);
  const positionIds = new Set(positions.map((p) => p.id));
  if (
    selections.length !== positionIds.size ||
    !selections.every((s) => positionIds.has(s.positionId))
  ) {
    return res.status(400).json({ message: 'A candidate must be selected for every position' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const s of selections) {
      await conn.query(
        'INSERT INTO votes (student_id, position_id, candidate_id, election_id) VALUES (?, ?, ?, ?)',
        [req.student.sub, s.positionId, s.candidateId, electionId]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'You have already voted in this election' });
    }
    throw err;
  } finally {
    conn.release();
  }

  const io = req.app.get('io');
  io.to(`election:${electionId}`).emit('vote:updated', { electionId: Number(electionId) });

  res.status(201).json({ receiptId: generateReceiptId(), votedAt: new Date().toISOString() });
}));

module.exports = router;
