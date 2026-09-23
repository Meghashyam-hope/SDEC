require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const pool = require('./db/pool');
const authRouter = require('./routes/auth');
const electionsRouter = require('./routes/elections');
const votesRouter = require('./routes/votes');
const adminRouter = require('./routes/admin');
const { startElectionScheduler } = require('./jobs/electionScheduler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' },
});

app.set('io', io);
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.use('/auth', authRouter);
app.use('/elections', electionsRouter);
app.use('/votes', votesRouter);
app.use('/admin', adminRouter);

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'connected' });
  } catch (err) {
    res.status(500).json({ ok: false, db: 'error', message: err.message });
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

io.on('connection', (socket) => {
  socket.on('join', (electionId) => {
    socket.join(`election:${electionId}`);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`SDEC server listening on http://localhost:${PORT}`);
  startElectionScheduler(io);
});
