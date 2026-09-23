const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { generateOtp, otpExpiry, maskPhone } = require('../utils/otp');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
const OTP_DEV_MODE = (process.env.OTP_DEV_MODE ?? 'true') === 'true';

function issueToken(student) {
  return jwt.sign(
    { sub: student.id, rollNumber: student.roll_number, name: student.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
  );
}

// ── Registration: roll number + name + phone + password -> OTP verifies the
// phone before a students row is ever created, so an abandoned/unverified
// attempt can't squat someone else's roll number. ────────────────────────

router.post('/register', asyncHandler(async (req, res) => {
  const { rollNumber, name, phoneNumber, password, department, year } = req.body;
  if (!rollNumber || !name || !phoneNumber || !password) {
    return res.status(400).json({ message: 'rollNumber, name, phoneNumber and password are required' });
  }

  const [existing] = await pool.query('SELECT id FROM students WHERE roll_number = ?', [rollNumber]);
  if (existing.length > 0) {
    return res.status(409).json({ message: 'This roll number is already registered. Please log in instead.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const code = generateOtp();

  // Re-registering before verifying just replaces the previous attempt.
  await pool.query('DELETE FROM pending_registrations WHERE roll_number = ?', [rollNumber]);
  await pool.query(
    `INSERT INTO pending_registrations (roll_number, name, password_hash, phone_number, department, year, otp_code, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [rollNumber, name, passwordHash, phoneNumber, department || null, year || null, code, otpExpiry()]
  );

  console.log(`[MOCK SMS] Registration OTP for ${rollNumber} (${phoneNumber}): ${code}`);

  res.status(201).json({
    message: `OTP sent to ${maskPhone(phoneNumber)} to verify your mobile number`,
    rollNumber,
    ...(OTP_DEV_MODE ? { devOtp: code } : {}),
  });
}));

router.post('/register/verify-otp', asyncHandler(async (req, res) => {
  const { rollNumber, otp } = req.body;
  if (!rollNumber || !otp) {
    return res.status(400).json({ message: 'rollNumber and otp are required' });
  }

  const [pendingRows] = await pool.query('SELECT * FROM pending_registrations WHERE roll_number = ?', [rollNumber]);
  const pending = pendingRows[0];
  if (!pending) {
    return res.status(400).json({ message: 'No pending registration found. Please register again.' });
  }
  if (new Date(pending.expires_at) < new Date()) {
    return res.status(400).json({ message: 'OTP has expired. Please register again.' });
  }
  if (pending.otp_code !== otp) {
    return res.status(400).json({ message: 'Incorrect OTP.' });
  }

  let studentId;
  try {
    const [result] = await pool.query(
      `INSERT INTO students (roll_number, name, password_hash, phone_number, department, year)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [pending.roll_number, pending.name, pending.password_hash, pending.phone_number, pending.department, pending.year]
    );
    studentId = result.insertId;
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'This roll number is already registered. Please log in instead.' });
    }
    throw err;
  }

  await pool.query('DELETE FROM pending_registrations WHERE id = ?', [pending.id]);

  const token = issueToken({ id: studentId, roll_number: pending.roll_number, name: pending.name });

  res.status(201).json({
    token,
    student: {
      id: studentId,
      rollNumber: pending.roll_number,
      name: pending.name,
      department: pending.department,
      year: pending.year,
    },
  });
}));

// ── Login: roll number + password, then OTP as a second factor. ──────────

router.post('/login', asyncHandler(async (req, res) => {
  const { rollNumber, password } = req.body;
  if (!rollNumber || !password) {
    return res.status(400).json({ message: 'rollNumber and password are required' });
  }

  const [rows] = await pool.query('SELECT * FROM students WHERE roll_number = ?', [rollNumber]);
  const student = rows[0];
  if (!student) {
    return res.status(401).json({ message: 'Invalid roll number or password' });
  }

  const passwordOk = await bcrypt.compare(password, student.password_hash);
  if (!passwordOk) {
    return res.status(401).json({ message: 'Invalid roll number or password' });
  }

  const code = generateOtp();
  await pool.query(
    'INSERT INTO otp_codes (student_id, code, expires_at) VALUES (?, ?, ?)',
    [student.id, code, otpExpiry()]
  );

  // Mock SMS delivery — no gateway configured yet, so the OTP is logged
  // server-side and (in dev mode only) echoed back in the response.
  console.log(`[MOCK SMS] OTP for ${student.roll_number} (${student.phone_number}): ${code}`);

  res.json({
    message: `OTP sent to registered mobile number ${maskPhone(student.phone_number)}`,
    rollNumber: student.roll_number,
    ...(OTP_DEV_MODE ? { devOtp: code } : {}),
  });
}));

router.post('/verify-otp', asyncHandler(async (req, res) => {
  const { rollNumber, otp } = req.body;
  if (!rollNumber || !otp) {
    return res.status(400).json({ message: 'rollNumber and otp are required' });
  }

  const [studentRows] = await pool.query('SELECT * FROM students WHERE roll_number = ?', [rollNumber]);
  const student = studentRows[0];
  if (!student) {
    return res.status(401).json({ message: 'Invalid roll number or OTP' });
  }

  const [otpRows] = await pool.query(
    'SELECT * FROM otp_codes WHERE student_id = ? AND consumed_at IS NULL ORDER BY id DESC LIMIT 1',
    [student.id]
  );
  const otpRow = otpRows[0];
  if (!otpRow) {
    return res.status(400).json({ message: 'No OTP requested. Please log in again.' });
  }
  if (new Date(otpRow.expires_at) < new Date()) {
    return res.status(400).json({ message: 'OTP has expired. Please log in again.' });
  }
  if (otpRow.code !== otp) {
    return res.status(400).json({ message: 'Incorrect OTP.' });
  }

  await pool.query('UPDATE otp_codes SET consumed_at = NOW() WHERE id = ?', [otpRow.id]);

  const token = issueToken(student);

  res.json({
    token,
    student: {
      id: student.id,
      rollNumber: student.roll_number,
      name: student.name,
      department: student.department,
      year: student.year,
    },
  });
}));

module.exports = router;
