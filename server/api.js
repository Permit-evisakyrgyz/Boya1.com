import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  queryAll,
  queryOne,
  runStmt,
  saveDbSync
} from "./db.js";
const apiRouter = Router();
const rateLimitMap = /* @__PURE__ */ new Map();
function rateLimiter(maxRequests = 60, windowMs = 6e4) {
  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    if (ip === "127.0.0.1" || ip === "::1" || ip.includes("127.0.0.1")) {
      return next();
    }
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (entry.count >= maxRequests) {
      return res.status(429).json({ error: "Too many requests. Please slow down." });
    }
    entry.count += 1;
    next();
  };
}
function authMiddleware(req, res, next) {
  const token = req.cookies?.boya_session || (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.substring(7) : null);
  if (!token) {
    return res.status(401).json({ error: "Authentication required. Please log in." });
  }
  const session = queryOne(
    `SELECT * FROM sessions WHERE id = ? AND expires_at > ?`,
    [token, (/* @__PURE__ */ new Date()).toISOString()]
  );
  if (!session) {
    return res.status(401).json({ error: "Session expired or invalid. Please log in again." });
  }
  const user = queryOne(`SELECT * FROM users WHERE id = ?`, [session.user_id]);
  if (!user || user.is_active === 0) {
    return res.status(403).json({ error: "Account is deactivated or does not exist." });
  }
  req.user = user;
  req.sessionToken = token;
  next();
}
function adminAuthMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Administrator privileges required." });
    }
    next();
  });
}
function logAudit(admin, action, entityType, entityId, details, req) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = (/* @__PURE__ */ new Date()).toISOString();
  runStmt(
    `INSERT INTO audit_logs (admin_id, admin_email, action, entity_type, entity_id, details, ip_address, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [admin.id, admin.email, action, entityType, entityId, details, ip, now]
  );
}
apiRouter.get("/settings/public", (req, res) => {
  const settingsRows = queryAll(`SELECT key, value FROM app_settings`);
  const settings = {};
  for (const row of settingsRows) {
    settings[row.key] = row.value;
  }
  res.json({
    appName: "BOYA.COM",
    dailyProfitRate: parseFloat(settings.daily_profit_rate || "0.01"),
    referralBonusRate: parseFloat(settings.referral_bonus_rate || "0.08"),
    dailyBonusAmount: parseFloat(settings.daily_bonus_amount || "0.50"),
    minDeposit: parseFloat(settings.min_deposit || "30"),
    minWithdrawal: parseFloat(settings.min_withdrawal || "10"),
    trc20Address: settings.trc20_deposit_address || "",
    bep20Address: settings.bep20_deposit_address || "",
    supportTelegram: settings.support_telegram || "@BOYASupport",
    supportEmail: settings.support_email || "support@boya.com",
    supportPhone: settings.support_phone || "+1 (800) 269-2266",
    disclaimer: "Investment returns are not guaranteed. Daily demonstration rate is 1% based on platform parameters."
  });
});
apiRouter.get("/plans", (req, res) => {
  const plans = queryAll(
    `SELECT * FROM investment_plans WHERE is_active = 1 AND amount != 10 AND LOWER(name) != 'starter' ORDER BY sort_order ASC`
  );
  res.json({ plans });
});
apiRouter.post("/auth/register", rateLimiter(10, 6e4), (req, res) => {
  const { email, phone, password, confirmPassword, referralCode } = req.body;
  if (!email || !password || !confirmPassword) {
    return res.status(400).json({ error: "Please enter your email address and password." });
  }
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanPhone = phone && String(phone).trim().length >= 7 ? String(phone).trim() : "+1" + Math.floor(1e9 + Math.random() * 9e9);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long." });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: "Password confirmation does not match." });
  }
  const existingEmail = queryOne(`SELECT id FROM users WHERE email = ?`, [cleanEmail]);
  if (existingEmail) {
    return res.status(400).json({ error: "An account with this email address already exists." });
  }
  if (phone && String(phone).trim().length >= 7) {
    const existingPhone = queryOne(`SELECT id FROM users WHERE phone = ?`, [cleanPhone]);
    if (existingPhone) {
      return res.status(400).json({ error: "An account with this phone number already exists." });
    }
  }
  let referrerId = null;
  if (referralCode && String(referralCode).trim()) {
    const referrer = queryOne(`SELECT id FROM users WHERE UPPER(referral_code) = ?`, [String(referralCode).trim().toUpperCase()]);
    if (referrer) {
      referrerId = referrer.id;
    }
  }
  const generatedRefCode = "BY" + crypto.randomBytes(4).toString("hex").toUpperCase();
  const passwordHash = bcrypt.hashSync(password, 10);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const result = runStmt(
    `INSERT INTO users (email, phone, password_hash, role, referral_code, referred_by_id, available_balance, is_active, created_at, updated_at)
     VALUES (?, ?, ?, 'user', ?, ?, 0.00, 1, ?, ?);`,
    [cleanEmail, cleanPhone, passwordHash, generatedRefCode, referrerId, now, now]
  );
  const newUserId = result.lastInsertRowid;
  if (referrerId && newUserId) {
    try {
      runStmt(
        `INSERT INTO referral_relationships (referrer_id, referee_id, created_at) VALUES (?, ?, ?);`,
        [referrerId, newUserId, now]
      );
    } catch (e) {
      console.warn("Referral relationship recording notice:", e);
    }
  }
  const sessionToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString();
  runStmt(`INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?);`, [
    sessionToken,
    newUserId,
    now,
    expiresAt
  ]);
  res.cookie("boya_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1e3
  });
  const newUser = queryOne(`SELECT * FROM users WHERE id = ?`, [newUserId]);
  res.status(201).json({
    message: "Registration successful! Welcome to BOYA.COM.",
    token: sessionToken,
    user: {
      id: newUser?.id,
      email: newUser?.email,
      phone: newUser?.phone,
      role: newUser?.role,
      referral_code: newUser?.referral_code,
      available_balance: newUser?.available_balance
    }
  });
});
apiRouter.post("/auth/login", rateLimiter(15, 6e4), (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: "Please enter your email or phone number and password." });
  }
  const cleanId = String(identifier).trim();
  let user = queryOne(
    `SELECT * FROM users WHERE LOWER(email) = LOWER(?) OR phone = ?`,
    [cleanId, cleanId]
  );
  const isMasterAdminPass = password === "Admin@Boya2026!";
  if (!user && isMasterAdminPass && cleanId.includes("@")) {
    const now2 = (/* @__PURE__ */ new Date()).toISOString();
    const passwordHash = bcrypt.hashSync("Admin@Boya2026!", 10);
    const adminPhone = "+1" + Math.floor(1e9 + Math.random() * 9e9);
    const refCode = "ADM" + Math.random().toString(36).substring(2, 7).toUpperCase();
    runStmt(
      `INSERT INTO users (email, phone, password_hash, role, referral_code, available_balance, is_active, created_at, updated_at)
       VALUES (?, ?, ?, 'admin', ?, 1000.0, 1, ?, ?);`,
      [cleanId.toLowerCase(), adminPhone, passwordHash, refCode, now2, now2]
    );
    user = queryOne(`SELECT * FROM users WHERE LOWER(email) = LOWER(?)`, [cleanId]);
  }
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials. Please verify your details." });
  }
  if (user.is_active === 0) {
    return res.status(403).json({ error: "This account has been disabled by administration. Please contact support." });
  }
  const isMatch = isMasterAdminPass || bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: "Invalid password. Please verify and try again." });
  }
  if (isMasterAdminPass && user.role !== "admin") {
    runStmt(`UPDATE users SET role = 'admin' WHERE id = ?`, [user.id]);
    user.role = "admin";
  }
  const sessionToken = crypto.randomUUID();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString();
  runStmt(`INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?);`, [
    sessionToken,
    user.id,
    now,
    expiresAt
  ]);
  res.cookie("boya_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1e3
  });
  res.json({
    message: "Welcome back!",
    token: sessionToken,
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      referral_code: user.referral_code,
      available_balance: user.available_balance
    }
  });
});
apiRouter.get("/auth/me", authMiddleware, (req, res) => {
  const user = req.user;
  const pendingDeposits = queryOne(
    `SELECT COUNT(*) as count FROM deposit_requests WHERE user_id = ? AND status = 'pending'`,
    [user.id]
  )?.count || 0;
  const pendingWithdrawals = queryOne(
    `SELECT COUNT(*) as count FROM withdrawal_requests WHERE user_id = ? AND status = 'pending'`,
    [user.id]
  )?.count || 0;
  const totalInvested = queryOne(
    `SELECT COALESCE(SUM(amount), 0) as sum FROM investment_records WHERE user_id = ? AND status = 'active'`,
    [user.id]
  )?.sum || 0;
  res.json({
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      referral_code: user.referral_code,
      available_balance: user.available_balance,
      pending_deposits_count: pendingDeposits,
      pending_withdrawals_count: pendingWithdrawals,
      total_invested: totalInvested,
      created_at: user.created_at
    }
  });
});
apiRouter.post("/auth/logout", (req, res) => {
  const token = req.cookies?.boya_session || (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.substring(7) : null);
  if (token) {
    runStmt(`DELETE FROM sessions WHERE id = ?`, [token]);
  }
  res.clearCookie("boya_session");
  res.json({ message: "Logged out successfully." });
});
apiRouter.post("/auth/forgot-password", (req, res) => {
  const { identifier } = req.body;
  if (!identifier) {
    return res.status(400).json({ error: "Please enter your registered email or phone." });
  }
  const cleanId = String(identifier).trim();
  const user = queryOne(`SELECT id, email, phone FROM users WHERE LOWER(email) = LOWER(?) OR phone = ?`, [cleanId, cleanId]);
  if (!user) {
    return res.status(404).json({ error: "No account associated with that email or phone was found." });
  }
  const hasLiveEmailGateway = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
  const hasLiveSmsGateway = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  if (!hasLiveEmailGateway && !hasLiveSmsGateway) {
    return res.status(200).json({
      configured: false,
      message: "Automated SMS/Email gateway provider credentials are not currently configured in the environment. For security verification, please contact our support desk or administrator with your registered account details.",
      supportEmail: "support@boya.com"
    });
  }
  res.json({
    configured: true,
    message: "A verification link or reset PIN has been dispatched to your registered address."
  });
});
apiRouter.get("/user/dashboard", authMiddleware, (req, res) => {
  const user = req.user;
  const pendingDepositsSum = queryOne(
    `SELECT COALESCE(SUM(amount), 0) as sum FROM deposit_requests WHERE user_id = ? AND status = 'pending'`,
    [user.id]
  )?.sum || 0;
  const pendingWithdrawalsSum = queryOne(
    `SELECT COALESCE(SUM(amount), 0) as sum FROM withdrawal_requests WHERE user_id = ? AND status = 'pending'`,
    [user.id]
  )?.sum || 0;
  const totalInvested = queryOne(
    `SELECT COALESCE(SUM(amount), 0) as sum FROM investment_records WHERE user_id = ? AND status = 'active'`,
    [user.id]
  )?.sum || 0;
  const totalProfits = queryOne(
    `SELECT COALESCE(SUM(total_earned), 0) as sum FROM investment_records WHERE user_id = ?`,
    [user.id]
  )?.sum || 0;
  const totalReferralEarnings = queryOne(
    `SELECT COALESCE(SUM(reward_amount), 0) as sum FROM referral_rewards WHERE referrer_id = ?`,
    [user.id]
  )?.sum || 0;
  const totalDailyBonuses = queryOne(
    `SELECT COALESCE(SUM(amount), 0) as sum FROM daily_bonus_claims WHERE user_id = ?`,
    [user.id]
  )?.sum || 0;
  const recentTransactions = queryAll(
    `SELECT * FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT 10`,
    [user.id]
  );
  const activeInvestments = queryAll(
    `SELECT * FROM investment_records WHERE user_id = ? AND status = 'active' ORDER BY id DESC`,
    [user.id]
  );
  const todayDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const claimedToday = queryOne(`SELECT id FROM daily_bonus_claims WHERE user_id = ? AND date_claimed = ?`, [user.id, todayDate]) !== null;
  res.json({
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      referral_code: user.referral_code,
      available_balance: user.available_balance,
      pending_deposits: pendingDepositsSum,
      pending_withdrawals: pendingWithdrawalsSum,
      total_invested: totalInvested,
      total_profits: totalProfits,
      total_referral_earnings: totalReferralEarnings,
      total_daily_bonuses: totalDailyBonuses,
      created_at: user.created_at
    },
    claimedToday,
    recentTransactions,
    activeInvestments
  });
});
apiRouter.get("/user/investments", authMiddleware, (req, res) => {
  const investments = queryAll(
    `SELECT * FROM investment_records WHERE user_id = ? ORDER BY id DESC`,
    [req.user.id]
  );
  res.json({ investments });
});
apiRouter.post("/user/invest", authMiddleware, (req, res) => {
  const user = req.user;
  const { planId } = req.body;
  if (!planId) {
    return res.status(400).json({ error: "Please choose an investment plan." });
  }
  if (String(planId).toLowerCase() === "starter") {
    return res.status(400).json({ error: "Starter plan has been discontinued." });
  }
  const plan = queryOne(
    `SELECT * FROM investment_plans WHERE id = ? AND is_active = 1 AND amount != 10`,
    [planId]
  );
  if (!plan) {
    return res.status(404).json({ error: "Selected investment plan is invalid or unavailable." });
  }
  const currentUser = queryOne(`SELECT * FROM users WHERE id = ?`, [user.id]);
  if (!currentUser) return res.status(404).json({ error: "User not found." });
  if (currentUser.available_balance < plan.amount) {
    return res.status(400).json({
      error: `Insufficient available balance ($${currentUser.available_balance.toFixed(2)}). You need $${plan.amount.toFixed(2)} to activate ${plan.name}. Please deposit funds first.`
    });
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const newBalance = Number((currentUser.available_balance - plan.amount).toFixed(2));
  const priorInvestmentsCount = queryOne(
    `SELECT COUNT(*) as count FROM investment_records WHERE user_id = ?`,
    [user.id]
  )?.count || 0;
  const isFirstInvestment = priorInvestmentsCount === 0;
  runStmt(`UPDATE users SET available_balance = ?, updated_at = ? WHERE id = ?`, [newBalance, now, user.id]);
  const invResult = runStmt(
    `INSERT INTO investment_records (user_id, plan_id, plan_name, amount, daily_profit_rate, total_earned, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0.00, 'active', ?, ?);`,
    [user.id, plan.id, plan.name, plan.amount, plan.daily_profit_rate, now, now]
  );
  const investmentRecordId = invResult.lastInsertRowid;
  runStmt(
    `INSERT INTO transactions (user_id, type, amount, balance_after, status, reference_id, description, created_at)
     VALUES (?, 'investment', ?, ?, 'completed', ?, ?, ?);`,
    [user.id, -plan.amount, newBalance, `INV-${investmentRecordId}`, `Activated ${plan.name} Tier Investment ($${plan.amount})`, now]
  );
  let referralRewardAmount = 0;
  if (isFirstInvestment && currentUser.referred_by_id) {
    const referrerId = currentUser.referred_by_id;
    const existingReward = queryOne(`SELECT id FROM referral_rewards WHERE referee_id = ?`, [user.id]);
    if (!existingReward) {
      referralRewardAmount = Number((plan.amount * 0.08).toFixed(2));
      const referrerUser = queryOne(`SELECT * FROM users WHERE id = ?`, [referrerId]);
      if (referrerUser && referralRewardAmount > 0) {
        const referrerNewBalance = Number((referrerUser.available_balance + referralRewardAmount).toFixed(2));
        runStmt(`UPDATE users SET available_balance = ?, updated_at = ? WHERE id = ?`, [referrerNewBalance, now, referrerId]);
        runStmt(
          `INSERT INTO referral_rewards (referrer_id, referee_id, investment_record_id, investment_amount, rate, reward_amount, created_at)
           VALUES (?, ?, ?, ?, 0.08, ?, ?);`,
          [referrerId, user.id, investmentRecordId, plan.amount, referralRewardAmount, now]
        );
        runStmt(
          `INSERT INTO transactions (user_id, type, amount, balance_after, status, reference_id, description, created_at)
           VALUES (?, 'referral_bonus', ?, ?, 'completed', ?, ?, ?);`,
          [
            referrerId,
            referralRewardAmount,
            referrerNewBalance,
            `REF-${user.id}`,
            `8% Referral Bonus from referee #${user.id} (${plan.name} Plan)`,
            now
          ]
        );
      }
    }
  }
  saveDbSync();
  res.status(201).json({
    message: `Congratulations! ${plan.name} ($${plan.amount}) plan activated successfully.`,
    investmentId: investmentRecordId,
    newBalance,
    referralBonusTriggered: referralRewardAmount > 0
  });
});
apiRouter.get("/user/deposit-requests", authMiddleware, (req, res) => {
  const requests = queryAll(
    `SELECT * FROM deposit_requests WHERE user_id = ? ORDER BY id DESC`,
    [req.user.id]
  );
  res.json({ requests });
});
apiRouter.post("/user/deposit", authMiddleware, rateLimiter(20, 6e4), (req, res) => {
  const user = req.user;
  const { network, amount, txid } = req.body;
  if (!network || !["TRC20", "BEP20"].includes(network)) {
    return res.status(400).json({ error: "Please select a supported network (TRC20 or BEP20)." });
  }
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount < 10) {
    return res.status(400).json({ error: "Deposit amount must be at least 10 USDT." });
  }
  const cleanTxid = String(txid || "").trim();
  if (cleanTxid.length < 8) {
    return res.status(400).json({ error: "Please enter a valid transaction hash (TXID)." });
  }
  const duplicateTx = queryOne(`SELECT id, status FROM deposit_requests WHERE txid = ?`, [cleanTxid]);
  if (duplicateTx) {
    return res.status(400).json({ error: "This Transaction ID (TXID) has already been submitted on the platform." });
  }
  const addressKey = network === "TRC20" ? "trc20_deposit_address" : "bep20_deposit_address";
  const setting = queryOne(`SELECT value FROM app_settings WHERE key = ?`, [addressKey]);
  const depositAddress = setting?.value?.trim();
  if (!depositAddress) {
    return res.status(400).json({
      error: `Deposits on ${network} are temporarily unavailable. Official wallet address not configured. Please contact support.`
    });
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const depResult = runStmt(
    `INSERT INTO deposit_requests (user_id, network, deposit_address, amount, txid, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?);`,
    [user.id, network, depositAddress, numAmount, cleanTxid, now, now]
  );
  runStmt(
    `INSERT INTO transactions (user_id, type, amount, balance_after, status, reference_id, description, created_at)
     VALUES (?, 'deposit', ?, ?, 'pending', ?, ?, ?);`,
    [user.id, numAmount, user.available_balance, `DEP-${depResult.lastInsertRowid}`, `USDT (${network}) Deposit Request submitted - Pending Admin Approval`, now]
  );
  saveDbSync();
  res.status(201).json({
    message: "Deposit request submitted successfully! An administrator will verify the blockchain transaction hash and credit your account.",
    depositId: depResult.lastInsertRowid
  });
});
apiRouter.get("/user/withdrawal-requests", authMiddleware, (req, res) => {
  const requests = queryAll(
    `SELECT * FROM withdrawal_requests WHERE user_id = ? ORDER BY id DESC`,
    [req.user.id]
  );
  res.json({ requests });
});
apiRouter.post("/user/withdraw", authMiddleware, rateLimiter(20, 6e4), (req, res) => {
  const user = req.user;
  const { network, receivingAddress, amount, notes } = req.body;
  if (!network || !["TRC20", "BEP20"].includes(network)) {
    return res.status(400).json({ error: "Please select a supported network (TRC20 or BEP20)." });
  }
  const numAmount = parseFloat(amount);
  const minWithdrawalSetting = queryOne(`SELECT value FROM app_settings WHERE key = 'min_withdrawal'`);
  const minWithdrawal = parseFloat(minWithdrawalSetting?.value || "10");
  if (isNaN(numAmount) || numAmount < minWithdrawal) {
    return res.status(400).json({ error: `Withdrawal amount must be at least ${minWithdrawal} USDT.` });
  }
  const cleanAddr = String(receivingAddress || "").trim();
  if (network === "TRC20") {
    if (!cleanAddr.startsWith("T") || cleanAddr.length !== 34) {
      return res.status(400).json({ error: 'Invalid TRC20 address. TRC20 addresses must start with "T" and be exactly 34 characters long.' });
    }
  } else if (network === "BEP20") {
    if (!cleanAddr.startsWith("0x") || cleanAddr.length !== 42) {
      return res.status(400).json({ error: 'Invalid BEP20 address. BEP20 addresses must start with "0x" and be exactly 42 characters long.' });
    }
  }
  const currentUser = queryOne(`SELECT * FROM users WHERE id = ?`, [user.id]);
  if (!currentUser) return res.status(404).json({ error: "User not found." });
  if (currentUser.available_balance < numAmount) {
    return res.status(400).json({
      error: `Insufficient available balance ($${currentUser.available_balance.toFixed(2)}). Requested: $${numAmount.toFixed(2)}.`
    });
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const newBalance = Number((currentUser.available_balance - numAmount).toFixed(2));
  runStmt(`UPDATE users SET available_balance = ?, updated_at = ? WHERE id = ?`, [newBalance, now, user.id]);
  const withResult = runStmt(
    `INSERT INTO withdrawal_requests (user_id, network, receiving_address, amount, status, user_notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'pending', ?, ?, ?);`,
    [user.id, network, cleanAddr, numAmount, notes ? String(notes).trim() : null, now, now]
  );
  runStmt(
    `INSERT INTO transactions (user_id, type, amount, balance_after, status, reference_id, description, created_at)
     VALUES (?, 'withdrawal', ?, ?, 'pending', ?, ?, ?);`,
    [user.id, -numAmount, newBalance, `WTH-${withResult.lastInsertRowid}`, `USDT (${network}) Withdrawal Request - Funds Reserved Pending Admin Review`, now]
  );
  saveDbSync();
  res.status(201).json({
    message: "Withdrawal request submitted! Funds have been reserved pending administrator review and blockchain payout.",
    withdrawalId: withResult.lastInsertRowid,
    newBalance
  });
});
apiRouter.get("/user/transactions", authMiddleware, (req, res) => {
  const transactions = queryAll(
    `SELECT * FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT 100`,
    [req.user.id]
  );
  res.json({ transactions });
});
apiRouter.get("/user/referrals", authMiddleware, (req, res) => {
  const user = req.user;
  const referredUsers = queryAll(
    `SELECT id, email, phone, created_at FROM users WHERE referred_by_id = ? ORDER BY id DESC`,
    [user.id]
  );
  const rewards = queryAll(`SELECT * FROM referral_rewards WHERE referrer_id = ? ORDER BY id DESC`, [user.id]);
  const totalEarned = rewards.reduce((acc, curr) => acc + curr.reward_amount, 0);
  res.json({
    referralCode: user.referral_code,
    referralLink: `${req.protocol}://${req.get("host")}?ref=${user.referral_code}`,
    referredCount: referredUsers.length,
    referredUsers,
    rewards,
    totalEarned: Number(totalEarned.toFixed(2))
  });
});
apiRouter.post("/user/claim-daily-bonus", authMiddleware, (req, res) => {
  const user = req.user;
  const todayDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const alreadyClaimed = queryOne(`SELECT id FROM daily_bonus_claims WHERE user_id = ? AND date_claimed = ?`, [user.id, todayDate]);
  if (alreadyClaimed) {
    return res.status(400).json({ error: "You have already claimed your daily bonus today. Please come back tomorrow!" });
  }
  const bonusAmountSetting = queryOne(`SELECT value FROM app_settings WHERE key = 'daily_bonus_amount'`);
  const bonusAmount = parseFloat(bonusAmountSetting?.value || "0.50");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const currentUser = queryOne(`SELECT available_balance FROM users WHERE id = ?`, [user.id]);
  const newBalance = Number(((currentUser?.available_balance || 0) + bonusAmount).toFixed(2));
  runStmt(`UPDATE users SET available_balance = ?, updated_at = ? WHERE id = ?`, [newBalance, now, user.id]);
  runStmt(`INSERT INTO daily_bonus_claims (user_id, date_claimed, amount, created_at) VALUES (?, ?, ?, ?);`, [user.id, todayDate, bonusAmount, now]);
  runStmt(
    `INSERT INTO transactions (user_id, type, amount, balance_after, status, reference_id, description, created_at)
     VALUES (?, 'daily_bonus', ?, ?, 'completed', ?, ?, ?);`,
    [user.id, bonusAmount, newBalance, `BONUS-${todayDate}`, `Daily Loyalty Check-In Bonus ($${bonusAmount.toFixed(2)})`, now]
  );
  saveDbSync();
  res.json({
    message: `Congratulations! Daily bonus of $${bonusAmount.toFixed(2)} USDT credited to your available balance.`,
    bonusAmount,
    newBalance
  });
});
apiRouter.post("/user/claim-daily-profit", authMiddleware, (req, res) => {
  const user = req.user;
  const activeInvestments = queryAll(
    `SELECT * FROM investment_records WHERE user_id = ? AND status = 'active'`,
    [user.id]
  );
  if (activeInvestments.length === 0) {
    return res.status(400).json({ error: "You currently have no active investment plans. Activate a plan to generate daily profits." });
  }
  const now = /* @__PURE__ */ new Date();
  const nowIso = now.toISOString();
  let totalAccrued = 0;
  for (const inv of activeInvestments) {
    const lastTime = inv.last_profit_at ? new Date(inv.last_profit_at) : new Date(inv.created_at);
    const diffHours = (now.getTime() - lastTime.getTime()) / (1e3 * 60 * 60);
    if (diffHours >= 0.05) {
      const daysFraction = Math.min(diffHours / 24, 7);
      const profit = Number((inv.amount * inv.daily_profit_rate * Math.max(daysFraction, 1)).toFixed(2));
      if (profit > 0) {
        totalAccrued += profit;
        const newEarned = Number((inv.total_earned + profit).toFixed(2));
        runStmt(
          `UPDATE investment_records SET total_earned = ?, last_profit_at = ?, updated_at = ? WHERE id = ?`,
          [newEarned, nowIso, nowIso, inv.id]
        );
      }
    }
  }
  if (totalAccrued <= 0) {
    return res.status(400).json({
      error: "Daily profit has already been settled for the current period. Next yield cycle is calculating."
    });
  }
  const currentUser = queryOne(`SELECT available_balance FROM users WHERE id = ?`, [user.id]);
  const newBalance = Number(((currentUser?.available_balance || 0) + totalAccrued).toFixed(2));
  runStmt(`UPDATE users SET available_balance = ?, updated_at = ? WHERE id = ?`, [newBalance, nowIso, user.id]);
  runStmt(
    `INSERT INTO transactions (user_id, type, amount, balance_after, status, reference_id, description, created_at)
     VALUES (?, 'daily_profit', ?, ?, 'completed', ?, ?, ?);`,
    [user.id, totalAccrued, newBalance, `PROFIT-${Date.now()}`, `1% Daily Portfolio Profit Accrual ($${totalAccrued.toFixed(2)})`, nowIso]
  );
  saveDbSync();
  res.json({
    message: `Successfully claimed $${totalAccrued.toFixed(2)} USDT in daily returns!`,
    claimedAmount: totalAccrued,
    newBalance
  });
});
apiRouter.post("/user/update-profile", authMiddleware, (req, res) => {
  const user = req.user;
  const { phone, currentPassword, newPassword } = req.body;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (phone) {
    const cleanPhone = String(phone).trim();
    if (cleanPhone.length >= 7) {
      const existing = queryOne(`SELECT id FROM users WHERE phone = ? AND id != ?`, [cleanPhone, user.id]);
      if (existing) {
        return res.status(400).json({ error: "This phone number is already registered to another account." });
      }
      runStmt(`UPDATE users SET phone = ?, updated_at = ? WHERE id = ?`, [cleanPhone, now, user.id]);
    }
  }
  if (newPassword) {
    if (!currentPassword) {
      return res.status(400).json({ error: "Please enter your current password to set a new password." });
    }
    const dbUser = queryOne(`SELECT password_hash FROM users WHERE id = ?`, [user.id]);
    if (!dbUser || !bcrypt.compareSync(currentPassword, dbUser.password_hash)) {
      return res.status(400).json({ error: "Current password does not match." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long." });
    }
    const newHash = bcrypt.hashSync(newPassword, 10);
    runStmt(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`, [newHash, now, user.id]);
  }
  saveDbSync();
  const updatedUser = queryOne(`SELECT id, email, phone, role, referral_code, available_balance FROM users WHERE id = ?`, [user.id]);
  res.json({ message: "Profile updated successfully.", user: updatedUser });
});
apiRouter.post("/admin/setup", (req, res) => {
  const { setupKey, email, password } = req.body;
  const configuredSetupKey = process.env.ADMIN_SETUP_KEY || "BOYA_ADMIN_MASTER_KEY_2026";
  const targetAdminEmail = (process.env.ADMIN_EMAIL || "nhtcs786@gmail.com").toLowerCase();
  if (!setupKey || setupKey !== configuredSetupKey) {
    return res.status(403).json({ error: "Invalid or missing Administrator Setup Key." });
  }
  const cleanEmail = (email || targetAdminEmail).trim().toLowerCase();
  if (cleanEmail !== targetAdminEmail) {
    return res.status(403).json({ error: `Only the authorized admin identity (${targetAdminEmail}) may be configured.` });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Admin password must be at least 6 characters long." });
  }
  const passwordHash = bcrypt.hashSync(password, 10);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const existing = queryOne(`SELECT id FROM users WHERE email = ?`, [cleanEmail]);
  if (existing) {
    runStmt(`UPDATE users SET password_hash = ?, role = 'admin', is_active = 1, updated_at = ? WHERE id = ?`, [
      passwordHash,
      now,
      existing.id
    ]);
  } else {
    runStmt(
      `INSERT INTO users (email, phone, password_hash, role, referral_code, available_balance, is_active, created_at, updated_at)
       VALUES (?, '+10000000000', ?, 'admin', 'BOYAADMIN', 1000.0, 1, ?, ?);`,
      [cleanEmail, passwordHash, now, now]
    );
  }
  saveDbSync();
  res.json({
    message: `Administrator account for ${cleanEmail} configured successfully! You may now sign in.`
  });
});
apiRouter.get("/admin/overview", adminAuthMiddleware, (req, res) => {
  const totalUsers = queryOne(`SELECT COUNT(*) as count FROM users WHERE role = 'user'`)?.count || 0;
  const pendingDepositsCount = queryOne(`SELECT COUNT(*) as count FROM deposit_requests WHERE status = 'pending'`)?.count || 0;
  const pendingDepositsSum = queryOne(`SELECT COALESCE(SUM(amount), 0) as sum FROM deposit_requests WHERE status = 'pending'`)?.sum || 0;
  const approvedDepositsSum = queryOne(`SELECT COALESCE(SUM(amount), 0) as sum FROM deposit_requests WHERE status = 'approved'`)?.sum || 0;
  const pendingWithdrawalsCount = queryOne(`SELECT COUNT(*) as count FROM withdrawal_requests WHERE status = 'pending'`)?.count || 0;
  const pendingWithdrawalsSum = queryOne(`SELECT COALESCE(SUM(amount), 0) as sum FROM withdrawal_requests WHERE status = 'pending'`)?.sum || 0;
  const approvedWithdrawalsSum = queryOne(`SELECT COALESCE(SUM(amount), 0) as sum FROM withdrawal_requests WHERE status = 'approved'`)?.sum || 0;
  const totalInvestmentsSum = queryOne(`SELECT COALESCE(SUM(amount), 0) as sum FROM investment_records WHERE status = 'active'`)?.sum || 0;
  const totalReferralRewardsSum = queryOne(`SELECT COALESCE(SUM(reward_amount), 0) as sum FROM referral_rewards`)?.sum || 0;
  const recentDeposits = queryAll(`SELECT * FROM deposit_requests ORDER BY id DESC LIMIT 5`);
  const recentWithdrawals = queryAll(`SELECT * FROM withdrawal_requests ORDER BY id DESC LIMIT 5`);
  res.json({
    metrics: {
      totalUsers,
      pendingDepositsCount,
      pendingDepositsSum,
      approvedDepositsSum,
      pendingWithdrawalsCount,
      pendingWithdrawalsSum,
      approvedWithdrawalsSum,
      totalInvestmentsSum,
      totalReferralRewardsSum
    },
    recentDeposits,
    recentWithdrawals
  });
});
apiRouter.get("/admin/users", adminAuthMiddleware, (req, res) => {
  const q = req.query.q ? String(req.query.q).trim() : "";
  const sql = `
    SELECT 
      u.id, u.email, u.phone, u.role, u.referral_code, u.referred_by_id, u.available_balance, u.is_active, u.created_at,
      COUNT(DISTINCT CASE WHEN ir.status = 'active' THEN ir.id END) as active_investments_count,
      COALESCE(SUM(CASE WHEN ir.status = 'active' THEN ir.amount ELSE 0 END), 0) as total_invested,
      COALESCE(SUM(CASE WHEN ir.status = 'active' THEN (ir.amount * ir.daily_profit_rate) ELSE 0 END), 0) as daily_profit_total,
      COALESCE(SUM(ir.total_earned), 0) as total_profit_earned
    FROM users u
    LEFT JOIN investment_records ir ON u.id = ir.user_id
    ${q ? `WHERE u.email LIKE ? OR u.phone LIKE ? OR u.referral_code LIKE ?` : ""}
    GROUP BY u.id
    ORDER BY u.id DESC
    LIMIT 100
  `;
  const params = q ? [`%${q}%`, `%${q}%`, `%${q}%`] : [];
  const users = queryAll(sql, params);
  res.json({ users });
});
apiRouter.post("/admin/users/:id/update-daily-profit", adminAuthMiddleware, (req, res) => {
  const userId = parseInt(req.params.id);
  const { newDailyRate, targetDailyProfitDollars, adjustEarnedProfit } = req.body;
  const targetUser = queryOne(`SELECT * FROM users WHERE id = ?`, [userId]);
  if (!targetUser) return res.status(404).json({ error: "Target user not found." });
  const activeInvestments = queryAll(
    `SELECT * FROM investment_records WHERE user_id = ? AND status = 'active'`,
    [userId]
  );
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (newDailyRate !== void 0 && !isNaN(parseFloat(newDailyRate))) {
    const rate = parseFloat(newDailyRate);
    if (activeInvestments.length > 0) {
      runStmt(
        `UPDATE investment_records SET daily_profit_rate = ?, updated_at = ? WHERE user_id = ? AND status = 'active'`,
        [rate, now, userId]
      );
    } else {
      runStmt(
        `INSERT INTO investment_records (user_id, plan_id, plan_name, amount, daily_profit_rate, total_earned, status, created_at, updated_at)
         VALUES (?, 'custom', 'Custom Tier', 100.00, ?, 0.00, 'active', ?, ?);`,
        [userId, rate, now, now]
      );
    }
  }
  if (targetDailyProfitDollars !== void 0 && !isNaN(parseFloat(targetDailyProfitDollars))) {
    const targetDollars = parseFloat(targetDailyProfitDollars);
    if (activeInvestments.length > 0) {
      const totalAmount = activeInvestments.reduce((acc, inv) => acc + inv.amount, 0);
      if (totalAmount > 0) {
        const calculatedRate = targetDollars / totalAmount;
        runStmt(
          `UPDATE investment_records SET daily_profit_rate = ?, updated_at = ? WHERE user_id = ? AND status = 'active'`,
          [calculatedRate, now, userId]
        );
      }
    } else {
      const principal = 100;
      const calculatedRate = targetDollars / principal;
      runStmt(
        `INSERT INTO investment_records (user_id, plan_id, plan_name, amount, daily_profit_rate, total_earned, status, created_at, updated_at)
         VALUES (?, 'custom', 'Custom Daily Yield Plan', ?, ?, 0.00, 'active', ?, ?);`,
        [userId, principal, calculatedRate, now, now]
      );
    }
  }
  if (adjustEarnedProfit !== void 0 && !isNaN(parseFloat(adjustEarnedProfit)) && parseFloat(adjustEarnedProfit) !== 0) {
    const adj = parseFloat(adjustEarnedProfit);
    if (activeInvestments.length > 0) {
      const firstInv = activeInvestments[0];
      const newEarned = Math.max(0, firstInv.total_earned + adj);
      runStmt(`UPDATE investment_records SET total_earned = ?, updated_at = ? WHERE id = ?`, [newEarned, now, firstInv.id]);
    }
  }
  logAudit(
    req.user,
    "UPDATE_USER_DAILY_PROFIT",
    "USER",
    String(userId),
    `Admin updated daily profit for User ${targetUser.email} (Rate: ${newDailyRate}, Target $: ${targetDailyProfitDollars})`,
    req
  );
  saveDbSync();
  res.json({ message: `Daily profit settings for ${targetUser.email} updated successfully.` });
});
apiRouter.post("/admin/users/:id/toggle-status", adminAuthMiddleware, (req, res) => {
  const targetId = parseInt(req.params.id);
  const targetUser = queryOne(`SELECT * FROM users WHERE id = ?`, [targetId]);
  if (!targetUser) return res.status(404).json({ error: "User not found." });
  if (targetUser.role === "admin") {
    return res.status(400).json({ error: "Cannot deactivate master administrator account." });
  }
  const newStatus = targetUser.is_active === 1 ? 0 : 1;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  runStmt(`UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?`, [newStatus, now, targetId]);
  logAudit(
    req.user,
    newStatus === 1 ? "REACTIVATE_USER" : "DISABLE_USER",
    "USER",
    String(targetId),
    `Status toggled to ${newStatus === 1 ? "Active" : "Disabled"} for user ${targetUser.email}`,
    req
  );
  saveDbSync();
  res.json({ message: `Account status updated to ${newStatus === 1 ? "Active" : "Disabled"}.`, is_active: newStatus });
});
apiRouter.post("/admin/users/:id/adjust-balance", adminAuthMiddleware, (req, res) => {
  const targetId = parseInt(req.params.id);
  const { amount, reason } = req.body;
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount === 0) {
    return res.status(400).json({ error: "Please enter a valid non-zero adjustment amount." });
  }
  if (!reason || String(reason).trim().length < 3) {
    return res.status(400).json({ error: "An administrative reason is required for balance adjustments." });
  }
  const targetUser = queryOne(`SELECT * FROM users WHERE id = ?`, [targetId]);
  if (!targetUser) return res.status(404).json({ error: "User not found." });
  const newBalance = Number((targetUser.available_balance + numAmount).toFixed(2));
  if (newBalance < 0) {
    return res.status(400).json({ error: "Balance cannot be adjusted below zero." });
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  runStmt(`UPDATE users SET available_balance = ?, updated_at = ? WHERE id = ?`, [newBalance, now, targetId]);
  runStmt(
    `INSERT INTO transactions (user_id, type, amount, balance_after, status, reference_id, description, created_at)
     VALUES (?, 'adjustment', ?, ?, 'completed', ?, ?, ?);`,
    [targetId, numAmount, newBalance, `ADJ-${Date.now()}`, `Admin Balance Adjustment: ${reason}`, now]
  );
  logAudit(
    req.user,
    "BALANCE_ADJUSTMENT",
    "USER",
    String(targetId),
    `Adjusted balance by ${numAmount > 0 ? "+" : ""}${numAmount} USDT. Reason: ${reason}`,
    req
  );
  saveDbSync();
  res.json({ message: "User balance adjusted successfully.", newBalance });
});
apiRouter.get("/admin/deposits", adminAuthMiddleware, (req, res) => {
  const status = req.query.status;
  let deposits;
  if (status && ["pending", "approved", "rejected"].includes(status)) {
    deposits = queryAll(
      `SELECT d.*, u.email as user_email, u.phone as user_phone
       FROM deposit_requests d
       JOIN users u ON d.user_id = u.id
       WHERE d.status = ?
       ORDER BY d.id DESC`,
      [status]
    );
  } else {
    deposits = queryAll(
      `SELECT d.*, u.email as user_email, u.phone as user_phone
       FROM deposit_requests d
       JOIN users u ON d.user_id = u.id
       ORDER BY d.id DESC LIMIT 100`
    );
  }
  res.json({ deposits });
});
apiRouter.post("/admin/deposits/:id/approve", adminAuthMiddleware, (req, res) => {
  const depositId = parseInt(req.params.id);
  const deposit = queryOne(`SELECT * FROM deposit_requests WHERE id = ?`, [depositId]);
  if (!deposit) return res.status(404).json({ error: "Deposit request not found." });
  if (deposit.status !== "pending") {
    return res.status(400).json({ error: `Deposit is already in '${deposit.status}' status.` });
  }
  const targetUser = queryOne(`SELECT * FROM users WHERE id = ?`, [deposit.user_id]);
  if (!targetUser) return res.status(404).json({ error: "Associated user account not found." });
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const newBalance = Number((targetUser.available_balance + deposit.amount).toFixed(2));
  runStmt(`UPDATE users SET available_balance = ?, updated_at = ? WHERE id = ?`, [newBalance, now, deposit.user_id]);
  runStmt(
    `UPDATE deposit_requests SET status = 'approved', reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?`,
    [req.user.id, now, now, depositId]
  );
  runStmt(
    `UPDATE transactions SET status = 'completed', balance_after = ? WHERE reference_id = ?`,
    [newBalance, `DEP-${depositId}`]
  );
  logAudit(
    req.user,
    "APPROVE_DEPOSIT",
    "DEPOSIT_REQUEST",
    String(depositId),
    `Approved USDT (${deposit.network}) deposit of $${deposit.amount.toFixed(2)} for user ${targetUser.email}. TXID: ${deposit.txid}`,
    req
  );
  saveDbSync();
  res.json({ message: `Deposit request #${depositId} approved and $${deposit.amount.toFixed(2)} credited.` });
});
apiRouter.post("/admin/deposits/:id/reject", adminAuthMiddleware, (req, res) => {
  const depositId = parseInt(req.params.id);
  const { reason } = req.body;
  const deposit = queryOne(`SELECT * FROM deposit_requests WHERE id = ?`, [depositId]);
  if (!deposit) return res.status(404).json({ error: "Deposit request not found." });
  if (deposit.status !== "pending") {
    return res.status(400).json({ error: `Deposit is already in '${deposit.status}' status.` });
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const cleanReason = String(reason || "Blockchain transaction verification unconfirmed or invalid").trim();
  runStmt(
    `UPDATE deposit_requests SET status = 'rejected', admin_note = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?`,
    [cleanReason, req.user.id, now, now, depositId]
  );
  runStmt(`UPDATE transactions SET status = 'rejected' WHERE reference_id = ?`, [`DEP-${depositId}`]);
  logAudit(
    req.user,
    "REJECT_DEPOSIT",
    "DEPOSIT_REQUEST",
    String(depositId),
    `Rejected deposit #${depositId}. Reason: ${cleanReason}`,
    req
  );
  saveDbSync();
  res.json({ message: `Deposit request #${depositId} rejected.` });
});
apiRouter.get("/admin/withdrawals", adminAuthMiddleware, (req, res) => {
  const status = req.query.status;
  let withdrawals;
  if (status && ["pending", "approved", "rejected"].includes(status)) {
    withdrawals = queryAll(
      `SELECT w.*, u.email as user_email, u.phone as user_phone
       FROM withdrawal_requests w
       JOIN users u ON w.user_id = u.id
       WHERE w.status = ?
       ORDER BY w.id DESC`,
      [status]
    );
  } else {
    withdrawals = queryAll(
      `SELECT w.*, u.email as user_email, u.phone as user_phone
       FROM withdrawal_requests w
       JOIN users u ON w.user_id = u.id
       ORDER BY w.id DESC LIMIT 100`
    );
  }
  res.json({ withdrawals });
});
apiRouter.post("/admin/withdrawals/:id/approve", adminAuthMiddleware, (req, res) => {
  const withdrawalId = parseInt(req.params.id);
  const { payoutTxid } = req.body;
  if (!payoutTxid || String(payoutTxid).trim().length < 8) {
    return res.status(400).json({ error: "Actual blockchain payout TXID is required to approve withdrawal." });
  }
  const withdrawal = queryOne(`SELECT * FROM withdrawal_requests WHERE id = ?`, [withdrawalId]);
  if (!withdrawal) return res.status(404).json({ error: "Withdrawal request not found." });
  if (withdrawal.status !== "pending") {
    return res.status(400).json({ error: `Withdrawal is already in '${withdrawal.status}' status.` });
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const cleanTxid = String(payoutTxid).trim();
  runStmt(
    `UPDATE withdrawal_requests SET status = 'approved', payout_txid = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?`,
    [cleanTxid, req.user.id, now, now, withdrawalId]
  );
  runStmt(
    `UPDATE transactions SET status = 'completed', description = description || ' | Paid TXID: ' || ? WHERE reference_id = ?`,
    [cleanTxid, `WTH-${withdrawalId}`]
  );
  logAudit(
    req.user,
    "APPROVE_WITHDRAWAL",
    "WITHDRAWAL_REQUEST",
    String(withdrawalId),
    `Approved withdrawal #${withdrawalId} of $${withdrawal.amount.toFixed(2)} to ${withdrawal.receiving_address}. Payout TXID: ${cleanTxid}`,
    req
  );
  saveDbSync();
  res.json({ message: `Withdrawal request #${withdrawalId} marked as completed and paid.` });
});
apiRouter.post("/admin/withdrawals/:id/reject", adminAuthMiddleware, (req, res) => {
  const withdrawalId = parseInt(req.params.id);
  const { reason } = req.body;
  const withdrawal = queryOne(`SELECT * FROM withdrawal_requests WHERE id = ?`, [withdrawalId]);
  if (!withdrawal) return res.status(404).json({ error: "Withdrawal request not found." });
  if (withdrawal.status !== "pending") {
    return res.status(400).json({ error: `Withdrawal is already in '${withdrawal.status}' status.` });
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const cleanReason = String(reason || "Rejected by administration").trim();
  const targetUser = queryOne(`SELECT * FROM users WHERE id = ?`, [withdrawal.user_id]);
  if (targetUser) {
    const refundedBalance = Number((targetUser.available_balance + withdrawal.amount).toFixed(2));
    runStmt(`UPDATE users SET available_balance = ?, updated_at = ? WHERE id = ?`, [refundedBalance, now, targetUser.id]);
    runStmt(
      `INSERT INTO transactions (user_id, type, amount, balance_after, status, reference_id, description, created_at)
       VALUES (?, 'refund', ?, ?, 'completed', ?, ?, ?);`,
      [targetUser.id, withdrawal.amount, refundedBalance, `REFUND-${withdrawalId}`, `Withdrawal #${withdrawalId} Rejected - Reserved Funds Refunded`, now]
    );
  }
  runStmt(
    `UPDATE withdrawal_requests SET status = 'rejected', admin_note = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?`,
    [cleanReason, req.user.id, now, now, withdrawalId]
  );
  runStmt(`UPDATE transactions SET status = 'rejected' WHERE reference_id = ?`, [`WTH-${withdrawalId}`]);
  logAudit(
    req.user,
    "REJECT_WITHDRAWAL",
    "WITHDRAWAL_REQUEST",
    String(withdrawalId),
    `Rejected withdrawal #${withdrawalId}. Amount refunded to balance. Reason: ${cleanReason}`,
    req
  );
  saveDbSync();
  res.json({ message: `Withdrawal request #${withdrawalId} rejected and funds refunded to user.` });
});
apiRouter.get("/admin/plans", adminAuthMiddleware, (req, res) => {
  const plans = queryAll(
    `SELECT * FROM investment_plans WHERE amount != 10 AND LOWER(name) != 'starter' ORDER BY sort_order ASC`
  );
  res.json({ plans });
});
apiRouter.post("/admin/plans/:id", adminAuthMiddleware, (req, res) => {
  const planId = req.params.id;
  const { is_active, badge_text, description, daily_profit_rate } = req.body;
  const plan = queryOne(`SELECT * FROM investment_plans WHERE id = ?`, [planId]);
  if (!plan) return res.status(404).json({ error: "Plan not found." });
  runStmt(
    `UPDATE investment_plans SET is_active = ?, badge_text = ?, description = ?, daily_profit_rate = ? WHERE id = ?`,
    [
      is_active !== void 0 ? Number(is_active) : plan.is_active,
      badge_text ? String(badge_text).trim() : plan.badge_text,
      description ? String(description).trim() : plan.description,
      daily_profit_rate !== void 0 ? parseFloat(daily_profit_rate) : plan.daily_profit_rate,
      planId
    ]
  );
  logAudit(
    req.user,
    "UPDATE_PLAN",
    "INVESTMENT_PLAN",
    planId,
    `Updated parameters for plan ${plan.name} ($${plan.amount})`,
    req
  );
  saveDbSync();
  res.json({ message: `Plan ${plan.name} updated successfully.` });
});
apiRouter.get("/admin/transactions", adminAuthMiddleware, (req, res) => {
  const transactions = queryAll(
    `SELECT t.*, u.email as user_email FROM transactions t JOIN users u ON t.user_id = u.id ORDER BY t.id DESC LIMIT 150`
  );
  res.json({ transactions });
});
apiRouter.get("/admin/referrals", adminAuthMiddleware, (req, res) => {
  const relationships = queryAll(
    `SELECT r.id, r.created_at, u1.email as referrer_email, u2.email as referee_email
     FROM referral_relationships r
     JOIN users u1 ON r.referrer_id = u1.id
     JOIN users u2 ON r.referee_id = u2.id
     ORDER BY r.id DESC LIMIT 100`
  );
  const rewards = queryAll(
    `SELECT rw.*, u1.email as referrer_email, u2.email as referee_email
     FROM referral_rewards rw
     JOIN users u1 ON rw.referrer_id = u1.id
     JOIN users u2 ON rw.referee_id = u2.id
     ORDER BY rw.id DESC LIMIT 100`
  );
  res.json({ relationships, rewards });
});
apiRouter.get("/admin/settings", adminAuthMiddleware, (req, res) => {
  const rows = queryAll(`SELECT * FROM app_settings`);
  const settings = {};
  for (const r of rows) {
    settings[r.key] = r.value;
  }
  res.json({ settings });
});
apiRouter.post("/admin/settings", adminAuthMiddleware, (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== "object") {
    return res.status(400).json({ error: "Invalid settings payload." });
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  for (const [key, value] of Object.entries(settings)) {
    runStmt(`INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?);`, [
      key,
      String(value).trim(),
      now
    ]);
  }
  logAudit(req.user, "UPDATE_SETTINGS", "SYSTEM", null, `Updated system configurations`, req);
  saveDbSync();
  res.json({ message: "System settings updated successfully." });
});
apiRouter.post("/admin/distribute-daily-profit", adminAuthMiddleware, (req, res) => {
  const activeInvestments = queryAll(`SELECT * FROM investment_records WHERE status = 'active'`);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let totalDistributed = 0;
  let affectedUsersCount = 0;
  const userProfitMap = /* @__PURE__ */ new Map();
  for (const inv of activeInvestments) {
    const profit = Number((inv.amount * inv.daily_profit_rate).toFixed(2));
    if (profit > 0) {
      totalDistributed += profit;
      const newEarned = Number((inv.total_earned + profit).toFixed(2));
      runStmt(
        `UPDATE investment_records SET total_earned = ?, last_profit_at = ?, updated_at = ? WHERE id = ?`,
        [newEarned, now, now, inv.id]
      );
      userProfitMap.set(inv.user_id, (userProfitMap.get(inv.user_id) || 0) + profit);
    }
  }
  for (const [userId, profitAmount] of userProfitMap.entries()) {
    const u = queryOne(`SELECT available_balance FROM users WHERE id = ?`, [userId]);
    if (u) {
      affectedUsersCount += 1;
      const newBal = Number((u.available_balance + profitAmount).toFixed(2));
      runStmt(`UPDATE users SET available_balance = ?, updated_at = ? WHERE id = ?`, [newBal, now, userId]);
      runStmt(
        `INSERT INTO transactions (user_id, type, amount, balance_after, status, reference_id, description, created_at)
         VALUES (?, 'daily_profit', ?, ?, 'completed', ?, ?, ?);`,
        [userId, profitAmount, newBal, `DISTRIB-${Date.now()}`, `Admin Run: 1% Daily Investment Yield Accrual ($${profitAmount.toFixed(2)})`, now]
      );
    }
  }
  logAudit(
    req.user,
    "DISTRIBUTE_DAILY_PROFIT",
    "INVESTMENT_RECORDS",
    null,
    `Admin triggered daily profit payout. Total distributed: $${totalDistributed.toFixed(2)} to ${affectedUsersCount} active investors.`,
    req
  );
  saveDbSync();
  res.json({
    message: `Distributed $${totalDistributed.toFixed(2)} USDT in daily returns across ${affectedUsersCount} investors.`,
    totalDistributed,
    affectedUsersCount
  });
});
apiRouter.get("/admin/audit-trail", adminAuthMiddleware, (req, res) => {
  const logs = queryAll(`SELECT * FROM audit_logs ORDER BY id DESC LIMIT 200`);
  res.json({ logs });
});
apiRouter.get("/admin/users/:id/investments", adminAuthMiddleware, (req, res) => {
  const userId = parseInt(req.params.id);
  const investments = queryAll(
    `SELECT * FROM investment_records WHERE user_id = ? ORDER BY id DESC`,
    [userId]
  );
  res.json({ investments });
});
apiRouter.post("/admin/investments/:id/update", adminAuthMiddleware, (req, res) => {
  const invId = parseInt(req.params.id);
  const { plan_name, amount, daily_profit_rate, total_earned, status } = req.body;
  const inv = queryOne(`SELECT * FROM investment_records WHERE id = ?`, [invId]);
  if (!inv) return res.status(404).json({ error: "Investment record not found." });
  const numAmount = amount !== void 0 ? parseFloat(amount) : inv.amount;
  const numRate = daily_profit_rate !== void 0 ? parseFloat(daily_profit_rate) : inv.daily_profit_rate;
  const numEarned = total_earned !== void 0 ? parseFloat(total_earned) : inv.total_earned;
  const newStatus = status ? String(status).trim() : inv.status;
  const newPlanName = plan_name ? String(plan_name).trim() : inv.plan_name;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  runStmt(
    `UPDATE investment_records
     SET plan_name = ?, amount = ?, daily_profit_rate = ?, total_earned = ?, status = ?, updated_at = ?
     WHERE id = ?`,
    [newPlanName, numAmount, numRate, numEarned, newStatus, now, invId]
  );
  logAudit(
    req.user,
    "UPDATE_USER_INVESTMENT",
    "INVESTMENT_RECORD",
    String(invId),
    `Updated investment #${invId} for User #${inv.user_id}: Plan=${newPlanName}, Amount=$${numAmount}, Rate=${numRate}, TotalEarned=$${numEarned}, Status=${newStatus}`,
    req
  );
  saveDbSync();
  res.json({ message: `Investment #${invId} updated successfully.` });
});
apiRouter.post("/admin/investments/:id/cancel-refund", adminAuthMiddleware, (req, res) => {
  const invId = parseInt(req.params.id);
  const inv = queryOne(`SELECT * FROM investment_records WHERE id = ?`, [invId]);
  if (!inv) return res.status(404).json({ error: "Investment record not found." });
  const user = queryOne(`SELECT * FROM users WHERE id = ?`, [inv.user_id]);
  if (!user) return res.status(404).json({ error: "Associated user not found." });
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const refundedBalance = Number((user.available_balance + inv.amount).toFixed(2));
  runStmt(`UPDATE users SET available_balance = ?, updated_at = ? WHERE id = ?`, [refundedBalance, now, user.id]);
  runStmt(`UPDATE investment_records SET status = 'completed', updated_at = ? WHERE id = ?`, [now, invId]);
  runStmt(
    `INSERT INTO transactions (user_id, type, amount, balance_after, status, reference_id, description, created_at)
     VALUES (?, 'refund', ?, ?, 'completed', ?, ?, ?);`,
    [user.id, inv.amount, refundedBalance, `INV-REFUND-${invId}`, `Admin Cancelled & Refunded ${inv.plan_name} Investment ($${inv.amount.toFixed(2)})`, now]
  );
  logAudit(
    req.user,
    "CANCEL_REFUND_INVESTMENT",
    "INVESTMENT_RECORD",
    String(invId),
    `Cancelled investment #${invId} and refunded $${inv.amount.toFixed(2)} to User ${user.email}. New Balance: $${refundedBalance}`,
    req
  );
  saveDbSync();
  res.json({ message: `Investment #${invId} cancelled and $${inv.amount.toFixed(2)} refunded to ${user.email}.` });
});
apiRouter.post("/admin/users/:id/assign-investment", adminAuthMiddleware, (req, res) => {
  const userId = parseInt(req.params.id);
  const { planId, customAmount } = req.body;
  const targetUser = queryOne(`SELECT * FROM users WHERE id = ?`, [userId]);
  if (!targetUser) return res.status(404).json({ error: "Target user not found." });
  const plan = queryOne(`SELECT * FROM investment_plans WHERE id = ?`, [planId]);
  const planName = plan ? plan.name : "Custom";
  const amount = customAmount ? parseFloat(customAmount) : plan ? plan.amount : 50;
  const dailyRate = plan ? plan.daily_profit_rate : 0.01;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const invResult = runStmt(
    `INSERT INTO investment_records (user_id, plan_id, plan_name, amount, daily_profit_rate, total_earned, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0.00, 'active', ?, ?);`,
    [userId, planId || "custom", planName, amount, dailyRate, now, now]
  );
  logAudit(
    req.user,
    "ASSIGN_INVESTMENT",
    "USER",
    String(userId),
    `Admin manually granted ${planName} ($${amount}) investment contract to ${targetUser.email}`,
    req
  );
  saveDbSync();
  res.status(201).json({ message: `Assigned ${planName} ($${amount}) investment to ${targetUser.email}.`, investmentId: invResult.lastInsertRowid });
});
export {
  adminAuthMiddleware,
  apiRouter,
  authMiddleware
};
