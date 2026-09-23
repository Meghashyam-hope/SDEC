require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

// Roll numbers/phone numbers for kashyap and sahel were given in short form
// (only the last 4 digits, sharing the 2473A0 prefix); charan had neither —
// both are placeholders here, fix them up once the real values are known.
const STUDENTS = [
  { roll_number: '2473A05132', name: 'Vamsi', password: 'password123', phone_number: '9999900001', department: 'Computer Science', year: 3 },
  { roll_number: '2473A05133', name: 'Shyam', password: 'password123', phone_number: '9999900002', department: 'Computer Science', year: 3 },
  { roll_number: '2473A05126', name: 'Kashyap', password: 'password123', phone_number: '9999900003', department: 'Computer Science', year: 3 },
  { roll_number: '2473A05085', name: 'Sahel', password: 'password123', phone_number: '9999900004', department: 'Computer Science', year: 3 },
  { roll_number: '2473A05001', name: 'Charan', password: 'password123', phone_number: '9999900005', department: 'Computer Science', year: 3 },
];

const POSITIONS = [
  {
    title: 'President',
    candidates: [
      { name: 'Aditi Sharma', manifesto: 'Transparent budgets and a stronger student voice in academic policy.' },
      { name: 'Rohan Mehta', manifesto: 'Better campus infrastructure and extended library hours.' },
    ],
  },
  {
    title: 'Vice President',
    candidates: [
      { name: 'Priya Nair', manifesto: 'Champion for mental health resources and peer support.' },
      { name: 'Karan Verma', manifesto: 'One unified calendar linking every club and society event.' },
    ],
  },
];

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  await conn.query('TRUNCATE TABLE votes');
  await conn.query('TRUNCATE TABLE candidates');
  await conn.query('TRUNCATE TABLE positions');
  await conn.query('TRUNCATE TABLE elections');
  await conn.query('TRUNCATE TABLE students');
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');

  for (const s of STUDENTS) {
    const passwordHash = await bcrypt.hash(s.password, 10);
    await conn.query(
      'INSERT INTO students (roll_number, name, password_hash, phone_number, department, year) VALUES (?, ?, ?, ?, ?, ?)',
      [s.roll_number, s.name, passwordHash, s.phone_number, s.department, s.year]
    );
  }

  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + 7 * 24 * 60 * 60 * 1000);
  const [electionResult] = await conn.query(
    'INSERT INTO elections (title, description, start_time, end_time, status, created_by) VALUES (?, ?, ?, ?, ?, ?)',
    [
      'Student Council Elections 2026',
      'Annual election for the student council executive positions.',
      startTime,
      endTime,
      'active',
      null,
    ]
  );
  const electionId = electionResult.insertId;

  for (const pos of POSITIONS) {
    const [posResult] = await conn.query(
      'INSERT INTO positions (election_id, title, max_winners) VALUES (?, ?, 1)',
      [electionId, pos.title]
    );
    const positionId = posResult.insertId;

    for (const cand of pos.candidates) {
      await conn.query(
        'INSERT INTO candidates (position_id, name, photo_url, manifesto) VALUES (?, ?, ?, ?)',
        [positionId, cand.name, null, cand.manifesto]
      );
    }
  }

  console.log(`Seeded election #${electionId} "Student Council Elections 2026" with ${POSITIONS.length} positions.`);
  console.log('Test login accounts (roll number / password / phone):');
  for (const s of STUDENTS) {
    console.log(`  ${s.roll_number} / ${s.password} / ${s.phone_number} (${s.name})`);
  }

  await conn.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
