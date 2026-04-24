// ================================================================
// ATTENDANCE APP v2 — Supabase Backend (replaces Google Apps Script)
// ================================================================
import { createClient } from '@supabase/supabase-js';
import express from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import 'dotenv/config' // Baris ini WAJIB di paling atas
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';



const app = express();
app.use(express.json());
const __dirname = dirname(fileURLToPath(import.meta.url));
app.use(express.static(join(__dirname, '../public')));


// ── Supabase client ─────────────────────────────────────────────
const supabase = createClient(
  process.env.supabase_url,
  process.env.supabase_service_role_key // use service role key for server-side access
);

// ── Helpers ─────────────────────────────────────────────────────
const uid   = () => uuidv4();
const nowJkt = () => {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).replace('T', ' ');
};
const todayJkt = () => {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
};
const monOf = d => String(d).slice(0, 7);

function digest(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

function calcH(a, b) {
  if (!a || !b) return 0;
  const [ah, am] = String(a).split(':').map(Number);
  const [bh, bm] = String(b).split(':').map(Number);
  const d = (bh * 60 + bm) - (ah * 60 + am);
  return d > 0 ? Math.round(d / 60 * 100) / 100 : 0;
}

function ok(res, data)  { res.json({ ok: true,  data }); }
function fail(res, msg) { res.json({ ok: false, error: msg }); }

// ── CORS ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── GET endpoints ────────────────────────────────────────────────
app.get('/api', async (req, res) => {
  const { a, u, pw, month, eid, pid } = req.query;
  try {
    let data;
    switch (a) {
      case 'login': {
        if (!u || !pw) throw new Error('Username & password required');
        const h = digest(pw);
        const { data: users, error } = await supabase
          .from('users')
          .select('*')
          .ilike('username', u)
          .eq('password_hash', h)
          .limit(1);
        if (error) throw error;
        if (!users || users.length === 0) throw new Error('Username atau password salah');
        const user = users[0];
        data = { id: user.id, username: user.username, role: user.role, display_name: user.display_name };
        break;
      }
      case 'employees': {
        const { data: rows, error } = await supabase.from('employees').select('*').order('name');
        if (error) throw error;
        data = rows;
        break;
      }
      case 'roles': {
        const { data: rows, error } = await supabase.from('roles').select('*').order('name');
        if (error) throw error;
        data = rows;
        break;
      }
      case 'users': {
        const { data: rows, error } = await supabase.from('users').select('id, username, role, display_name, created_at');
        if (error) throw error;
        data = rows;
        break;
      }
      case 'attendance': {
        let q = supabase.from('attendance').select('*');
        if (month) q = q.eq('month', month);
        if (eid)   q = q.eq('employee_id', eid);
        const { data: rows, error } = await q.order('date', { ascending: false });
        if (error) throw error;
        data = rows;
        break;
      }
      case 'leave': {
        let q = supabase.from('leave').select('*');
        if (month) q = q.eq('month', month);
        if (eid)   q = q.eq('employee_id', eid);
        const { data: rows, error } = await q.order('date', { ascending: false });
        if (error) throw error;
        data = rows;
        break;
      }
      case 'payPeriods': {
        const { data: rows, error } = await supabase.from('payroll_periods').select('*').order('month_year', { ascending: false });
        if (error) throw error;
        data = rows;
        break;
      }
      case 'payRecords': {
        let q = supabase.from('payroll_records').select('*');
        if (pid) q = q.eq('period_id', pid);
        const { data: rows, error } = await q.order('name');
        if (error) throw error;
        data = rows;
        break;
      }
      default:
        data = null;
    }
    ok(res, data);
  } catch (e) {
    fail(res, e.message);
  }
});

// ── POST endpoints ───────────────────────────────────────────────
app.post('/api', async (req, res) => {
  const b = req.body;
  try {
    let data = null;
    switch (b.action) {

      // ── Roles ────────────────────────────────────────────────
      case 'upsertRole': {
        const row = { ...b.row };
        if (!row.id) row.id = uid();
        if (!row.created_at) row.created_at = nowJkt();
        const { error } = await supabase.from('roles').upsert(row, { onConflict: 'id' });
        if (error) throw error;
        break;
      }
      case 'deleteRole': {
        const { error } = await supabase.from('roles').delete().eq('id', b.id);
        if (error) throw error;
        break;
      }

      // ── Employees ────────────────────────────────────────────
      case 'upsertEmployee': {
        const row = { ...b.row };
        if (!row.id) row.id = uid();
        if (!row.created_at) row.created_at = nowJkt();
        // Frontend inputs daily wage for PT; store as hourly (daily÷8) for calculations
        if (row.type === 'part-time' && row.hourly_wage) {
          row.hourly_wage = Math.round(Number(row.hourly_wage) / 8 * 100) / 100;
        }
        const { error } = await supabase.from('employees').upsert(row, { onConflict: 'id' });
        if (error) throw error;
        break;
      }
      case 'deleteEmployee': {
        const { error } = await supabase.from('employees').delete().eq('id', b.id);
        if (error) throw error;
        break;
      }

      // ── Users ────────────────────────────────────────────────
      case 'upsertUser': {
        const row = { ...b.row };
        if (!row.id) row.id = uid();
        // Fetch existing hash if no new password given
        if (row.password && row.password !== '') {
          row.password_hash = digest(row.password);
        } else if (row.id) {
          const { data: existing } = await supabase
            .from('users').select('password_hash').eq('id', row.id).single();
          row.password_hash = existing?.password_hash || '';
        }
        delete row.password;
        row.created_at = nowJkt();
        const { error } = await supabase.from('users').upsert(row, { onConflict: 'id' });
        if (error) throw error;
        break;
      }
      case 'deleteUser': {
        const { error } = await supabase.from('users').delete().eq('id', b.id);
        if (error) throw error;
        break;
      }

      // ── Attendance ───────────────────────────────────────────
      case 'upsertAttendance': {
        const row = { ...b.row };
        if (!row.id) row.id = uid();
        row.updated_at = nowJkt();
        const { error } = await supabase.from('attendance').upsert(row, { onConflict: 'id' });
        if (error) throw error;
        break;
      }
      case 'deleteAttendance': {
        const { error } = await supabase.from('attendance').delete().eq('id', b.id);
        if (error) throw error;
        break;
      }
      case 'checkIn': {
        const today_ = todayJkt();
        const { data: existing } = await supabase
          .from('attendance')
          .select('*')
          .eq('employee_id', b.employee_id)
          .eq('date', today_)
          .maybeSingle();
        if (existing) { data = { already: true, record: existing }; break; }
        const id = uid();
        const { error } = await supabase.from('attendance').insert({
          id, employee_id: b.employee_id, date: today_, month: monOf(today_),
          check_in: b.time, check_out: null, total_hours: 0, overtime_hours: 0,
          status: 'hadir', lat_lng: b.lat_lng || null, notes: null, updated_at: nowJkt()
        });
        if (error) throw error;
        data = { id, time: b.time };
        break;
      }
      case 'checkOut': {
        const today_ = todayJkt();
        const { data: rec, error: e1 } = await supabase
          .from('attendance')
          .select('*, employees(role_id, roles(std_hours))')
          .eq('employee_id', b.employee_id)
          .eq('date', today_)
          .single();
       
        if (e1 || !rec) throw new Error('Tidak ada record check-in hari ini');
        const hours = calcH(rec.check_in, b.time);



        // Get std_hours from role
        const { data: emp } = await supabase
          .from('employees').select('role_id').eq('id', b.employee_id).single();
        let std = 8;
        if (emp?.role_id) {
          const { data: role } = await supabase
            .from('roles').select('std_hours').eq('id', emp.role_id).single();
          std = Number(role?.std_hours) || 8;
        }
        const ot = Math.max(0, Math.round((hours - std) * 100) / 100);

        const { error: e2 } = await supabase.from('attendance').update({
          check_out: b.time, total_hours: hours, overtime_hours: ot, updated_at: nowJkt()
        }).eq('id', rec.id);
        if (e2) throw e2;
        data = { hours, ot };
        break;
      }

      // ── Leave ────────────────────────────────────────────────
      case 'upsertLeave': {
        const row = { ...b.row };
        if (!row.id) row.id = uid();
        if (!row.created_at) row.created_at = nowJkt();
        const { error } = await supabase.from('leave').upsert(row, { onConflict: 'id' });
        if (error) throw error;
        break;
      }
      case 'deleteLeave': {
        const { error } = await supabase.from('leave').delete().eq('id', b.id);
        if (error) throw error;
        break;
      }

      // ── Payroll ──────────────────────────────────────────────
      case 'generatePayroll': {
        data = await generatePayroll(b);
        break;
      }
      case 'updatePayRecord': {
        await updatePayRecord(b);
        break;
      }
      case 'deletePayPeriod': {
        // Delete records first (cascade), then period
        const { error: e1 } = await supabase.from('payroll_records').delete().eq('period_id', b.id);
        if (e1) throw e1;
        const { error: e2 } = await supabase.from('payroll_periods').delete().eq('id', b.id);
        if (e2) throw e2;
        break;
      }

      default:
        throw new Error('Unknown action: ' + b.action);
    }
    ok(res, data);
  } catch (e) {
    fail(res, e.message);
  }
});

// ── Payroll logic ────────────────────────────────────────────────
async function generatePayroll(b) {
  const month = b.month_year;
  const revBonus = Number(b.revenue_bonus) || 0;

  // Check duplicate
  const { data: existing } = await supabase
    .from('payroll_periods').select('id').eq('month_year', month).maybeSingle();
  if (existing) throw new Error(`Payroll ${month} sudah ada. Hapus dulu jika ingin regenerate.`);

  const [{ data: emps }, { data: roles }, { data: att }, { data: lv }] = await Promise.all([
    supabase.from('employees').select('*').neq('active', false).neq('active', 'FALSE'),
    supabase.from('roles').select('*'),
    supabase.from('attendance').select('*').eq('month', month),
    supabase.from('leave').select('*').eq('month', month),
  ]);

  const share = emps.length > 0 ? Math.round(revBonus / emps.length) : 0;
  const pid = uid();

  const { error: pe } = await supabase.from('payroll_periods').insert({
    id: pid, month_year: month, revenue_bonus: revBonus,
    status: 'draft', generated_by: b.by || 'owner', generated_at: nowJkt()
  });
  if (pe) throw pe;

  const records = emps.map(emp => {
    const role = roles.find(r => r.id === emp.role_id) || {};
    const empAtt = att.filter(a => a.employee_id === emp.id);
    const empLv  = lv.filter(l => l.employee_id === emp.id);

    const workedDays   = empAtt.filter(a => a.status === 'hadir').length;
    const totalHours   = empAtt.reduce((s, a) => s + (Number(a.total_hours) || 0), 0);
    const dailyOTHours = empAtt.reduce((s, a) => s + (Number(a.overtime_hours) || 0), 0);
    const allowedOff   = Number(emp.allowed_off) || 4;
    // usedOff = leave table entries + attendance rows marked libur/izin
    const offFromAtt   = empAtt.filter(a => a.status === 'libur' || a.status === 'izin').length;
    const usedOff      = empLv.length + offFromAtt;

    let base = 0, otPay = 0, offDed = 0, totalOTHours = 0;

    if (emp.type === 'part-time') {
      const hw      = Number(emp.hourly_wage) || 0;
      const stdH    = 8; // standard hours/day for PT
      let normalHours = 0, ptOTHours = 0;
      empAtt.filter(a => a.status === 'hadir').forEach(a => {
        const h = Number(a.total_hours) || 0;
        if (h <= stdH) { normalHours += h; }
        else           { normalHours += stdH; ptOTHours += (h - stdH); }
      });
      normalHours  = Math.round(normalHours * 100) / 100;
      ptOTHours    = Math.round(ptOTHours   * 100) / 100;
      base         = Math.round(normalHours * hw);
      otPay        = Math.round(ptOTHours   * hw * 1.5);
      totalOTHours = ptOTHours;
    } else {
      base = Number(role.base_salary) || 0;
      const std  = Number(role.std_hours) || 8;
      const mult = Number(role.ot_multiplier) || 1.5;
      const hourlyRate = base > 0 ? base / (26 * std) : 0;

      const unusedOff      = Math.max(0, allowedOff - usedOff);
      const unusedOTHours  = unusedOff * std;
      totalOTHours = Math.round((dailyOTHours + unusedOTHours) * 100) / 100;
      otPay = Math.round(totalOTHours * hourlyRate * mult);

      const extraOff = Math.max(0, usedOff - allowedOff);
      offDed = extraOff > 0 ? Math.round((base / 26) * extraOff) : 0;
    }

    const total = base + otPay + share - offDed;
    return {
      id: uid(), period_id: pid, employee_id: emp.id,
      name: emp.name, role_name: role.name || '', type: emp.type || 'full-time',
      base_salary: base, worked_days: workedDays,
      total_hours: Math.round(totalHours * 100) / 100,
      daily_ot_hours: Math.round(dailyOTHours * 100) / 100,
      total_ot_hours: Math.round((emp.type === 'part-time' ? 0 : totalOTHours) * 100) / 100,
      ot_pay: emp.type === 'part-time' ? 0 : otPay,
      allowed_off: allowedOff, used_off: usedOff,
      extra_off: Math.max(0, usedOff - allowedOff),
      off_deduction: offDed, bonus: 0,
      rev_share: emp.type === 'part-time' ? 0 : share,
      extra_deductions: 0, total_pay: total,
      notes: null, updated_at: nowJkt()
    };
  });

  if (records.length > 0) {
    const { error: re } = await supabase.from('payroll_records').insert(records);
    if (re) throw re;
  }
  return { period_id: pid };
}

async function updatePayRecord(b) {
  const { data: rec, error } = await supabase
    .from('payroll_records').select('*').eq('id', b.id).single();
  if (error || !rec) throw new Error('Record not found');

  const bonus  = Number(b.bonus) || 0;
  const extraD = Number(b.extra_deductions) || 0;
  const total  = Number(rec.base_salary) + Number(rec.ot_pay) + Number(rec.rev_share)
               + bonus - Number(rec.off_deduction) - extraD;

  const { error: ue } = await supabase.from('payroll_records').update({
    bonus, extra_deductions: extraD, total_pay: total,
    notes: b.notes || null, updated_at: nowJkt()
  }).eq('id', b.id);
  if (ue) throw ue;
}

// ── Start ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));