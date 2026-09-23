const express = require('express');
const pool = require('../db/pool');
const { authenticateJWT } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/active', authenticateJWT, asyncHandler(async (req, res) => {
  const [elections] = await pool.query(
    "SELECT id, title, description, start_time, end_time, status FROM elections WHERE status = 'active'"
  );

  const [votedRows] = await pool.query(
    'SELECT DISTINCT election_id FROM votes WHERE student_id = ?',
    [req.student.sub]
  );
  const votedElectionIds = new Set(votedRows.map((r) => r.election_id));

  res.json(
    elections.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      startTime: e.start_time,
      endTime: e.end_time,
      status: e.status,
      alreadyVoted: votedElectionIds.has(e.id),
    }))
  );
}));

router.get('/:id/ballot', authenticateJWT, asyncHandler(async (req, res) => {
  const electionId = Number(req.params.id);

  const [electionRows] = await pool.query('SELECT * FROM elections WHERE id = ?', [electionId]);
  const election = electionRows[0];
  if (!election) {
    return res.status(404).json({ message: 'Election not found' });
  }
  if (election.status !== 'active') {
    return res.status(403).json({ message: 'This election is not currently open for voting' });
  }

  const [voteRows] = await pool.query(
    'SELECT 1 FROM votes WHERE student_id = ? AND election_id = ? LIMIT 1',
    [req.student.sub, electionId]
  );
  if (voteRows.length > 0) {
    return res.status(409).json({ message: 'You have already voted in this election', alreadyVoted: true });
  }

  const [positions] = await pool.query(
    'SELECT id, title, max_winners FROM positions WHERE election_id = ? ORDER BY id',
    [electionId]
  );
  const [candidates] = await pool.query(
    `SELECT c.id, c.position_id, c.name, c.photo_url, c.manifesto
     FROM candidates c
     JOIN positions p ON p.id = c.position_id
     WHERE p.election_id = ?
     ORDER BY c.id`,
    [electionId]
  );

  const candidatesByPosition = new Map();
  for (const c of candidates) {
    if (!candidatesByPosition.has(c.position_id)) candidatesByPosition.set(c.position_id, []);
    candidatesByPosition.get(c.position_id).push({
      id: c.id,
      name: c.name,
      photoUrl: c.photo_url,
      manifesto: c.manifesto,
    });
  }

  res.json({
    election: { id: election.id, title: election.title, description: election.description },
    positions: positions.map((p) => ({
      id: p.id,
      title: p.title,
      maxWinners: p.max_winners,
      candidates: candidatesByPosition.get(p.id) || [],
    })),
  });
}));

router.get('/:id/results', authenticateJWT, asyncHandler(async (req, res) => {
  const electionId = Number(req.params.id);

  const [electionRows] = await pool.query('SELECT * FROM elections WHERE id = ?', [electionId]);
  const election = electionRows[0];
  if (!election) {
    return res.status(404).json({ message: 'Election not found' });
  }

  const [positions] = await pool.query(
    'SELECT id, title FROM positions WHERE election_id = ? ORDER BY id',
    [electionId]
  );
  const [candidates] = await pool.query(
    `SELECT c.id, c.position_id, c.name, COUNT(v.id) AS votes
     FROM candidates c
     JOIN positions p ON p.id = c.position_id
     LEFT JOIN votes v ON v.candidate_id = c.id
     WHERE p.election_id = ?
     GROUP BY c.id, c.position_id, c.name
     ORDER BY c.id`,
    [electionId]
  );

  const [turnoutRows] = await pool.query(
    'SELECT COUNT(DISTINCT student_id) AS voters FROM votes WHERE election_id = ?',
    [electionId]
  );
  const [studentCountRows] = await pool.query('SELECT COUNT(*) AS total FROM students');

  const candidatesByPosition = new Map();
  for (const c of candidates) {
    if (!candidatesByPosition.has(c.position_id)) candidatesByPosition.set(c.position_id, []);
    candidatesByPosition.get(c.position_id).push(c);
  }

  const resultPositions = positions.map((p) => {
    const posCandidates = candidatesByPosition.get(p.id) || [];
    const totalVotes = posCandidates.reduce((sum, c) => sum + Number(c.votes), 0);
    return {
      id: p.id,
      title: p.title,
      totalVotes,
      candidates: posCandidates.map((c) => ({
        id: c.id,
        name: c.name,
        votes: Number(c.votes),
        pct: totalVotes > 0 ? Math.round((Number(c.votes) / totalVotes) * 100) : 0,
      })),
    };
  });

  res.json({
    election: { id: election.id, title: election.title, status: election.status, endTime: election.end_time },
    turnout: { voted: turnoutRows[0].voters, total: studentCountRows[0].total },
    positions: resultPositions,
  });
}));

module.exports = router;
