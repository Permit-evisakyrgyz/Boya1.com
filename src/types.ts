export interface User {
  id: number;
  email: string;
  phone: string;
  role: 'user' | 'admin';
  referral_code: string;
  available_balance: number;
  pending_deposits_count?: number;
  pending_withdrawals_count?: number;
  total_invested?: number;
  created_at?: string;
}

export interface InvestmentPlan {
  id: string;
  name: string;
  amount: number;
  daily_profit_rate: number;
  duration_days: number;
  is_active: number;
  badge_text: string;
  description: string;
  color_gradient: string;
  sort_order: number;
}

export interface InvestmentRecord {
  id: number;
  user_id: number;
  plan_id: string;
  plan_name: string;
  amount: number;
  daily_profit_rate: number;
  total_earned: number;
  last_profit_at: string | null;
  status: 'active' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface DepositRequest {
  id: number;
  user_id: number;
  network: 'TRC20' | 'BEP20';
  deposit_address: string;
  amount: number;
  txid: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_phone?: string;
}

export interface WithdrawalRequest {
  id: number;
  user_id: number;
  network: 'TRC20' | 'BEP20';
  receiving_address: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  payout_txid?: string | null;
  user_notes?: string | null;
  admin_note?: string | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_phone?: string;
}

export interface Transaction {
  id: number;
  user_id: number;
  type: string;
  amount: number;
  balance_after: number;
  status: string;
  reference_id: string | null;
  description: string;
  created_at: string;
  user_email?: string;
}

export interface PublicSettings {
  appName: string;
  dailyProfitRate: number;
  referralBonusRate: number;
  dailyBonusAmount: number;
  minDeposit: number;
  minWithdrawal: number;
  trc20Address: string;
  bep20Address: string;
  supportTelegram: string;
  supportEmail: string;
  supportPhone: string;
  disclaimer: string;
}

export interface AuditLog {
  id: number;
  admin_id: number | null;
  admin_email: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string;
  ip_address: string | null;
  created_at: string;
}
