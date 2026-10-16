import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
const DB_FILE = path.resolve(process.cwd(), "investment.db");
let dbInstance = null;
async function getDb() {
  if (dbInstance) return dbInstance;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_FILE)) {
    try {
      const filebuffer = fs.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(filebuffer);
    } catch (err) {
      console.error("Error reading existing investment.db, creating fresh database instance:", err);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }
  initSchema(dbInstance);
  saveDbSync();
  return dbInstance;
}
function saveDbSync() {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error("Failed to save investment.db:", err);
  }
}
function queryAll(sql, params = []) {
  if (!dbInstance) throw new Error("Database not initialized");
  const stmt = dbInstance.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}
function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}
function runStmt(sql, params = []) {
  if (!dbInstance) throw new Error("Database not initialized");
  dbInstance.run(sql, params);
  const res = dbInstance.exec("SELECT last_insert_rowid() as id");
  const lastInsertRowid = res.length > 0 && res[0].values.length > 0 ? res[0].values[0][0] : 0;
  saveDbSync();
  return { changes: 1, lastInsertRowid };
}
function initSchema(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      phone TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      referral_code TEXT UNIQUE NOT NULL,
      referred_by_id INTEGER,
      available_balance REAL NOT NULL DEFAULT 0.00,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS investment_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      daily_profit_rate REAL NOT NULL DEFAULT 0.01,
      duration_days INTEGER NOT NULL DEFAULT 365,
      is_active INTEGER NOT NULL DEFAULT 1,
      badge_text TEXT NOT NULL,
      description TEXT NOT NULL,
      color_gradient TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS investment_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      plan_id TEXT NOT NULL,
      plan_name TEXT NOT NULL,
      amount REAL NOT NULL,
      daily_profit_rate REAL NOT NULL DEFAULT 0.01,
      total_earned REAL NOT NULL DEFAULT 0.00,
      last_profit_at TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS deposit_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      network TEXT NOT NULL,
      deposit_address TEXT NOT NULL,
      amount REAL NOT NULL,
      txid TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      admin_note TEXT,
      reviewed_by INTEGER,
      reviewed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS withdrawal_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      network TEXT NOT NULL,
      receiving_address TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      payout_txid TEXT,
      user_notes TEXT,
      admin_note TEXT,
      reviewed_by INTEGER,
      reviewed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      balance_after REAL NOT NULL,
      status TEXT NOT NULL,
      reference_id TEXT,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS referral_relationships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_id INTEGER NOT NULL,
      referee_id INTEGER NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS referral_rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_id INTEGER NOT NULL,
      referee_id INTEGER NOT NULL UNIQUE,
      investment_record_id INTEGER NOT NULL,
      investment_amount REAL NOT NULL,
      rate REAL NOT NULL DEFAULT 0.08,
      reward_amount REAL NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_bonus_claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date_claimed TEXT NOT NULL,
      amount REAL NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, date_claimed)
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER,
      admin_email TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT NOT NULL,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );
  `);
  db.run(`DELETE FROM investment_plans WHERE id = 'starter' OR name = 'Starter' OR amount = 10;`);
  const sevenPlans = [
    {
      id: "silver",
      name: "Silver",
      amount: 30,
      daily_profit_rate: 0.01,
      duration_days: 365,
      is_active: 1,
      badge_text: "Entry Tier",
      description: "Ideal starting tier for steady 1% daily demonstration return.",
      color_gradient: "from-slate-400 via-gray-300 to-slate-500",
      sort_order: 1
    },
    {
      id: "super",
      name: "Super",
      amount: 50,
      daily_profit_rate: 0.01,
      duration_days: 365,
      is_active: 1,
      badge_text: "Popular Choice",
      description: "Accelerated portfolio tier with consistent daily profit accrual.",
      color_gradient: "from-sky-400 via-blue-500 to-indigo-600",
      sort_order: 2
    },
    {
      id: "gold",
      name: "Gold",
      amount: 100,
      daily_profit_rate: 0.01,
      duration_days: 365,
      is_active: 1,
      badge_text: "Best Value",
      description: "Flagship golden tier with 8% referral eligibility & steady yield.",
      color_gradient: "from-amber-300 via-yellow-400 to-amber-600",
      sort_order: 3
    },
    {
      id: "platinum",
      name: "Platinum",
      amount: 200,
      daily_profit_rate: 0.01,
      duration_days: 365,
      is_active: 1,
      badge_text: "High Yield",
      description: "Executive asset allocation with daily liquidity & priority support.",
      color_gradient: "from-emerald-300 via-teal-400 to-cyan-600",
      sort_order: 4
    },
    {
      id: "bright",
      name: "Bright",
      amount: 500,
      daily_profit_rate: 0.01,
      duration_days: 365,
      is_active: 1,
      badge_text: "Premier",
      description: "High-volume tier engineered for serious crypto capital growth.",
      color_gradient: "from-purple-400 via-pink-500 to-rose-500",
      sort_order: 5
    },
    {
      id: "shining",
      name: "Shining",
      amount: 1e3,
      daily_profit_rate: 0.01,
      duration_days: 365,
      is_active: 1,
      badge_text: "Elite Gold",
      description: "Institutional level allocation with maximum daily distribution.",
      color_gradient: "from-amber-200 via-yellow-500 to-orange-600",
      sort_order: 6
    },
    {
      id: "sunrise",
      name: "Sunrise",
      amount: 2e3,
      daily_profit_rate: 0.01,
      duration_days: 365,
      is_active: 1,
      badge_text: "Apex Pinnacle",
      description: "The ultimate pinnacle tier of the BOYA.COM investment system.",
      color_gradient: "from-rose-500 via-amber-500 to-yellow-300",
      sort_order: 7
    }
  ];
  for (const plan of sevenPlans) {
    db.run(
      `INSERT OR REPLACE INTO investment_plans (id, name, amount, daily_profit_rate, duration_days, is_active, badge_text, description, color_gradient, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [plan.id, plan.name, plan.amount, plan.daily_profit_rate, plan.duration_days, plan.is_active, plan.badge_text, plan.description, plan.color_gradient, plan.sort_order]
    );
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const defaultSettings = {
    daily_profit_rate: "0.01",
    referral_bonus_rate: "0.08",
    daily_bonus_amount: "0.50",
    trc20_deposit_address: process.env.TRC20_DEPOSIT_ADDRESS || "TX7VwP64oYF2pKQkKqH82vR9aC3wZ48zX1",
    bep20_deposit_address: process.env.BEP20_DEPOSIT_ADDRESS || "0x71C8364f3B914EDeb5371602178229F2572183c5",
    min_deposit: "30",
    min_withdrawal: "10",
    support_telegram: "@BOYASupport",
    support_email: "support@boya.com",
    support_phone: "+1 (800) 269-2266"
  };
  for (const [k, v] of Object.entries(defaultSettings)) {
    db.run(
      `INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?);`,
      [k, v, now]
    );
  }
  const adminEmail = (process.env.ADMIN_EMAIL || "nhtcs786@gmail.com").toLowerCase();
  const adminCheck = db.exec(`SELECT id FROM users WHERE email = '${adminEmail.replace(/'/g, "''")}'`);
  if (adminCheck.length === 0 || adminCheck[0].values.length === 0) {
    const passwordHash = bcrypt.hashSync("Admin@Boya2026!", 10);
    db.run(
      `INSERT INTO users (email, phone, password_hash, role, referral_code, available_balance, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [adminEmail, "+10000000000", passwordHash, "admin", "BOYAADMIN", 1e3, 1, now, now]
    );
    console.log(`[Database] Initialized default admin user: ${adminEmail}`);
  }
}
export {
  getDb,
  queryAll,
  queryOne,
  runStmt,
  saveDbSync
};
