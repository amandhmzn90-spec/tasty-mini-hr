-- ================================================================
-- ATTENDANCE APP v2 — Supabase Schema
-- Run this in your Supabase SQL editor to set up all tables
-- ================================================================

-- Roles
CREATE TABLE IF NOT EXISTS roles (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  base_salary   NUMERIC DEFAULT 0,
  ot_multiplier NUMERIC DEFAULT 1.5,
  std_hours     NUMERIC DEFAULT 8,
  created_at    TEXT
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  role_id      TEXT REFERENCES roles(id),
  type         TEXT DEFAULT 'full-time',   -- 'full-time' | 'part-time'
  hourly_wage  NUMERIC DEFAULT 0,
  allowed_off  INTEGER DEFAULT 4,
  active       BOOLEAN DEFAULT true,
  created_at   TEXT
);

-- Users (app login accounts)
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL,             -- 'admin' | 'owner' | 'employee'
  display_name  TEXT,
  created_at    TEXT
);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id              TEXT PRIMARY KEY,
  employee_id     TEXT REFERENCES employees(id) ON DELETE CASCADE,
  date            TEXT NOT NULL,
  month           TEXT NOT NULL,           -- 'YYYY-MM'
  check_in        TEXT,
  check_out       TEXT,
  total_hours     NUMERIC DEFAULT 0,
  overtime_hours  NUMERIC DEFAULT 0,
  status          TEXT DEFAULT 'hadir',
  lat_lng         TEXT,
  notes           TEXT,
  updated_at      TEXT
);

-- Leave
CREATE TABLE IF NOT EXISTS leave (
  id           TEXT PRIMARY KEY,
  employee_id  TEXT REFERENCES employees(id) ON DELETE CASCADE,
  date         TEXT NOT NULL,
  month        TEXT NOT NULL,              -- 'YYYY-MM'
  leave_type   TEXT,                       -- 'izin' | 'sakit' | 'libur'
  notes        TEXT,
  approved_by  TEXT,
  created_at   TEXT
);

-- Payroll periods
CREATE TABLE IF NOT EXISTS payroll_periods (
  id            TEXT PRIMARY KEY,
  month_year    TEXT NOT NULL UNIQUE,      -- 'YYYY-MM'
  revenue_bonus NUMERIC DEFAULT 0,
  status        TEXT DEFAULT 'draft',
  generated_by  TEXT,
  generated_at  TEXT
);

-- Payroll records (one per employee per period)
CREATE TABLE IF NOT EXISTS payroll_records (
  id               TEXT PRIMARY KEY,
  period_id        TEXT REFERENCES payroll_periods(id) ON DELETE CASCADE,
  employee_id      TEXT REFERENCES employees(id) ON DELETE CASCADE,
  name             TEXT,
  role_name        TEXT,
  type             TEXT,
  base_salary      NUMERIC DEFAULT 0,
  worked_days      INTEGER DEFAULT 0,
  total_hours      NUMERIC DEFAULT 0,
  daily_ot_hours   NUMERIC DEFAULT 0,
  total_ot_hours   NUMERIC DEFAULT 0,
  ot_pay           NUMERIC DEFAULT 0,
  allowed_off      INTEGER DEFAULT 4,
  used_off         INTEGER DEFAULT 0,
  extra_off        INTEGER DEFAULT 0,
  off_deduction    NUMERIC DEFAULT 0,
  bonus            NUMERIC DEFAULT 0,
  rev_share        NUMERIC DEFAULT 0,
  extra_deductions NUMERIC DEFAULT 0,
  total_pay        NUMERIC DEFAULT 0,
  notes            TEXT,
  updated_at       TEXT
);

-- ── Row Level Security ─────────────────────────────────────────
-- Since you're using the service role key server-side, RLS won't
-- block your API. But you can enable it for safety:
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- (add policies as needed for direct client access)

-- ── Default admin accounts ─────────────────────────────────────
-- Password hashes below are SHA-256 of 'admin123' and 'owner123'
-- Change passwords after first login!
INSERT INTO users (id, username, password_hash, role, display_name, created_at)
VALUES
  (gen_random_uuid()::text, 'admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin', 'Admin',   now()::text),
  (gen_random_uuid()::text, 'owner', 'b2d6ec2cc2b9df11c4e7d00fa5eb92e48fe1d4b3a9a12a7b40a85ad7d29491c7', 'owner', 'Owner', now()::text)
ON CONFLICT (username) DO NOTHING;
