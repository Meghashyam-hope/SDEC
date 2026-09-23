# SDEC — Student Digital Election Commission

Monorepo with a React (Vite) client and a Node/Express + MySQL server, real-time
results over Socket.IO, and a node-cron job that auto-activates elections at
`start_time` and auto-closes them at `end_time`.

```
/client   React (Vite) — login, register, home, ballot, confirmation, success, results, admin
/server   Express + MySQL (mysql2) + Socket.IO + node-cron
```

## Prerequisites

- Node.js 18+
- MySQL running via XAMPP (or any MySQL 8 / MariaDB server) on `localhost:3306`

## 1. Database

Start MySQL in XAMPP, then create the schema and seed data:

```bash
cd server
npm install
npm run migrate
npm run seed
```

`npm run migrate` runs `db/schema.sql` against the `sdec` database (drops and
recreates every table, so it's safe to re-run after a schema change — don't
run it against a database with real votes you want to keep). `npm run seed`
runs `db/seed.js`, which inserts one sample election ("Student Council
Elections 2026"), two positions, their candidates, and a few test student
accounts.

Copy `server/.env.example` to `server/.env` and adjust `DB_USER` /
`DB_PASSWORD` if your XAMPP MySQL isn't the default `root` with no password.
It also holds:

- `JWT_SECRET` / `JWT_EXPIRES_IN` — used for both student and admin tokens
- `OTP_DEV_MODE` — while `true`, login/registration OTPs are logged to the
  server console *and* echoed back in the API response (and shown on-screen
  in the client) since no real SMS gateway is wired up yet
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — the single shared admin login for
  `/admin`

## 2. Server

```bash
cd server
npm run dev
```

Runs on `http://localhost:4000`. Check `http://localhost:4000/health` to
confirm the DB connection is live.

## 3. Client

```bash
cd client
npm install
npm run dev
```

Runs on `http://localhost:5173`, proxies `/api/*` to the server for regular
requests, and connects to `VITE_SERVER_URL` (see `client/.env`, defaults to
`http://localhost:4000`) directly for the Socket.IO live-results connection.

## Auth flow

- **Students**: `/register` (roll number, name, phone, password → OTP
  verifies the phone before the account is created) or `/login` (roll number
  + password → OTP as a second factor) → JWT.
- **Admin**: `/admin` has its own login gate using `ADMIN_USERNAME` /
  `ADMIN_PASSWORD` from `server/.env`, issuing a separate admin JWT. From
  there, create elections (with positions/candidates) and view live turnout,
  including a manual "close this election" action.

## Seeded test accounts

See `server/db/seed.js` for the current roll numbers / passwords / phone
numbers created for local testing (all password `password123`).
