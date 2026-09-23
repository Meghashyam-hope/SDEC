const cron = require('node-cron');
const pool = require('../db/pool');

async function tick(io) {
  const [toActivate] = await pool.query(
    "SELECT id FROM elections WHERE status = 'upcoming' AND start_time <= NOW()"
  );
  if (toActivate.length > 0) {
    const ids = toActivate.map((r) => r.id);
    await pool.query("UPDATE elections SET status = 'active' WHERE id IN (?)", [ids]);
    console.log(`[cron] Activated election(s): ${ids.join(', ')}`);
  }

  const [toClose] = await pool.query(
    "SELECT id FROM elections WHERE status = 'active' AND end_time <= NOW()"
  );
  if (toClose.length > 0) {
    const ids = toClose.map((r) => r.id);
    await pool.query("UPDATE elections SET status = 'closed' WHERE id IN (?)", [ids]);
    console.log(`[cron] Closed election(s): ${ids.join(', ')}`);
    for (const id of ids) {
      io.to(`election:${id}`).emit('vote:updated', { electionId: id });
    }
  }
}

function startElectionScheduler(io) {
  tick(io).catch((err) => console.error('[cron] Election scheduler error:', err));
  cron.schedule('* * * * *', () => {
    tick(io).catch((err) => console.error('[cron] Election scheduler error:', err));
  });
}

module.exports = { startElectionScheduler };
