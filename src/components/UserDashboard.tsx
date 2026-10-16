import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Gift,
  Calendar,
  Users,
  TrendingUp,
  Layers,
  Link as LinkIcon,
  Settings,
  HelpCircle,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  Wallet,
  Shield,
  ChevronRight,
  ExternalLink,
  Smartphone,
  Download,
} from 'lucide-react';
import { User, InvestmentPlan, DepositRequest, WithdrawalRequest, Transaction, PublicSettings, InvestmentRecord } from '../types';
import { PlanCard } from './PlanCard';

interface UserDashboardProps {
  user: User;
  token: string;
  onRefreshUser: () => void;
  publicSettings: PublicSettings | null;
  onNavigateAdmin?: () => void;
}

export type DashboardSection =
  | 'profile'
  | 'deposit'
  | 'withdraw'
  | 'deposit-requests'
  | 'withdrawal-requests'
  | 'transactions'
  | 'bonus'
  | 'daily-bonus'
  | 'referral-bonus'
  | 'daily-profit'
  | 'plans'
  | 'referral-link'
  | 'settings'
  | 'support';

export const UserDashboard: React.FC<UserDashboardProps> = ({
  user,
  token,
  onRefreshUser,
  publicSettings,
  onNavigateAdmin,
}) => {
  const [activeSection, setActiveSection] = useState<DashboardSection>('plans');
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // User financial records
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeInvestments, setActiveInvestments] = useState<InvestmentRecord[]>([]);
  const [referralData, setReferralData] = useState<{
    referralCode: string;
    referralLink: string;
    referredCount: number;
    referredUsers: any[];
    rewards: any[];
    totalEarned: number;
  } | null>(null);

  // Action states
  const [claimedToday, setClaimedToday] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Deposit Form State
  const [depNetwork, setDepNetwork] = useState<'TRC20' | 'BEP20'>('TRC20');
  const [depAmount, setDepAmount] = useState('50');
  const [depTxid, setDepTxid] = useState('');
  const [copiedAddr, setCopiedAddr] = useState(false);

  // Withdrawal Form State
  const [withNetwork, setWithNetwork] = useState<'TRC20' | 'BEP20'>('TRC20');
  const [withAmount, setWithAmount] = useState('30');
  const [withAddress, setWithAddress] = useState('');
  const [withNotes, setWithNotes] = useState('');

  // Profile Update State
  const [newPhone, setNewPhone] = useState(user.phone);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');

  // Selected Plan Confirmation Modal
  const [selectedPlanForInvest, setSelectedPlanForInvest] = useState<InvestmentPlan | null>(null);

  const fetchPlans = async () => {
    setLoadingPlans(true);
    try {
      const res = await fetch('/api/plans');
      const data = await res.json();
      setPlans(data.plans || []);
    } catch (e) {
      console.error('Error fetching plans:', e);
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [dashRes, depRes, withRes, txRes, refRes] = await Promise.all([
        fetch('/api/user/dashboard', { headers }),
        fetch('/api/user/deposit-requests', { headers }),
        fetch('/api/user/withdrawal-requests', { headers }),
        fetch('/api/user/transactions', { headers }),
        fetch('/api/user/referrals', { headers }),
      ]);

      if (dashRes.ok) {
        const d = await dashRes.json();
        setClaimedToday(d.claimedToday);
        setActiveInvestments(d.activeInvestments || []);
      }
      if (depRes.ok) {
        const d = await depRes.json();
        setDepositRequests(d.requests || []);
      }
      if (withRes.ok) {
        const d = await withRes.json();
        setWithdrawalRequests(d.requests || []);
      }
      if (txRes.ok) {
        const d = await txRes.json();
        setTransactions(d.transactions || []);
      }
      if (refRes.ok) {
        const d = await refRes.json();
        setReferralData(d);
      }
    } catch (err) {
      console.error('Error fetching dashboard records:', err);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchDashboardData();
  }, [user.id]);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 6000);
  };

  // Submit Deposit Request
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/user/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          network: depNetwork,
          amount: parseFloat(depAmount),
          txid: depTxid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit deposit.');

      showFeedback('success', data.message);
      setDepTxid('');
      fetchDashboardData();
      onRefreshUser();
      setActiveSection('deposit-requests');
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Withdrawal Request
  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/user/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          network: withNetwork,
          amount: parseFloat(withAmount),
          receivingAddress: withAddress,
          notes: withNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit withdrawal.');

      showFeedback('success', data.message);
      setWithAddress('');
      setWithNotes('');
      fetchDashboardData();
      onRefreshUser();
      setActiveSection('withdrawal-requests');
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Claim Daily Bonus ($0.50)
  const handleClaimDailyBonus = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/user/claim-daily-bonus', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to claim daily bonus.');

      showFeedback('success', data.message);
      setClaimedToday(true);
      fetchDashboardData();
      onRefreshUser();
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Claim Accrued Daily Profit (1%)
  const handleClaimDailyProfit = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/user/claim-daily-profit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to claim daily profit.');

      showFeedback('success', data.message);
      fetchDashboardData();
      onRefreshUser();
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm Investment in Plan
  const handleConfirmInvestment = async () => {
    if (!selectedPlanForInvest) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/user/invest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId: selectedPlanForInvest.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Investment activation failed.');

      showFeedback('success', data.message);
      setSelectedPlanForInvest(null);
      fetchDashboardData();
      onRefreshUser();
      setActiveSection('profile');
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Update Profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone: newPhone,
          currentPassword: currentPass || undefined,
          newPassword: newPass || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile.');

      showFeedback('success', 'Profile and security preferences saved successfully.');
      
      // Keep auto-saved password updated in localStorage if it was saved
      if (newPass) {
        try {
          const saved = localStorage.getItem('boya_saved_user_creds');
          if (saved) {
            const parsed = JSON.parse(saved);
            localStorage.setItem(
              'boya_saved_user_creds',
              JSON.stringify({ ...parsed, password: newPass, savedAt: new Date().toISOString() })
            );
          }
        } catch (e) {
          // ignore
        }
      }

      setCurrentPass('');
      setNewPass('');
      onRefreshUser();
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Copy helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  const currentDepositAddress =
    depNetwork === 'TRC20'
      ? publicSettings?.trc20Address || ''
      : publicSettings?.bep20Address || '';

  // All 14 Navigation Items
  const navItems: { id: DashboardSection; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: '1. Profile', icon: <UserIcon className="w-4 h-4" /> },
    { id: 'deposit', label: '2. Deposit', icon: <ArrowDownLeft className="w-4 h-4 text-emerald-400" /> },
    { id: 'withdraw', label: '3. Withdraw', icon: <ArrowUpRight className="w-4 h-4 text-amber-400" /> },
    { id: 'deposit-requests', label: '4. Deposit Requests', icon: <Clock className="w-4 h-4" /> },
    { id: 'withdrawal-requests', label: '5. Withdrawal Requests', icon: <CheckCircle2 className="w-4 h-4" /> },
    { id: 'transactions', label: '6. Transaction History', icon: <FileText className="w-4 h-4" /> },
    { id: 'bonus', label: '7. Bonus Overview', icon: <Gift className="w-4 h-4 text-yellow-300" /> },
    { id: 'daily-bonus', label: '8. Daily Bonus', icon: <Calendar className="w-4 h-4 text-amber-400" /> },
    { id: 'referral-bonus', label: '9. Referral Bonus', icon: <Users className="w-4 h-4 text-sky-400" /> },
    { id: 'daily-profit', label: '10. Daily Profit', icon: <TrendingUp className="w-4 h-4 text-emerald-400" /> },
    { id: 'plans', label: '11. Investment Plans', icon: <Layers className="w-4 h-4 text-amber-400" /> },
    { id: 'referral-link', label: '12. Referral Link', icon: <LinkIcon className="w-4 h-4 text-purple-400" /> },
    { id: 'settings', label: '13. Account Settings', icon: <Settings className="w-4 h-4" /> },
    { id: 'support', label: '14. Support', icon: <HelpCircle className="w-4 h-4 text-cyan-400" /> },
  ];

  // Profit calculations
  const totalInvestedAmount = activeInvestments.reduce((acc, inv) => acc + (inv.amount || 0), 0);
  const dailyProfitEstimated = activeInvestments.reduce(
    (acc, inv) => acc + (inv.amount || 0) * (inv.daily_profit_rate || 0.01),
    0
  );
  const totalProfitEarned = activeInvestments.reduce((acc, inv) => acc + (inv.total_earned || 0), 0);

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* ================================================================= */}
      {/* TOP METRICS STRIP: Available Balance, Daily Profit & Portfolios   */}
      {/* ================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* 1. Available Balance */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0c1836] to-[#070d19] border border-amber-500/30 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-amber-300/80 mb-1">
            <span>Available Balance</span>
            <Wallet className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono tabular-nums tracking-tight">
            ${user.available_balance.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-400 uppercase font-mono">USDT (Settled)</span>
        </div>

        {/* 2. DAILY PROFIT CARD (PROMINENT HIGHLIGHT) */}
        <div
          onClick={() => setActiveSection('daily-profit')}
          className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/50 via-[#0b192c] to-[#070d19] border-2 border-emerald-500/50 shadow-lg shadow-emerald-950/50 cursor-pointer hover:border-emerald-400 transition-all group flex flex-col justify-between relative overflow-hidden ring-1 ring-emerald-500/20"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/25 transition"></div>
          <div className="flex items-center justify-between text-xs text-emerald-300 font-bold mb-1">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400 animate-pulse" />
              Daily Profit
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
              1.0% / DAY
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono tabular-nums tracking-tight my-0.5">
            +${dailyProfitEstimated.toFixed(2)}
            <span className="text-xs font-normal text-emerald-300/80 ml-1">USDT/day</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-emerald-500/20">
            <span>Earned: +${totalProfitEarned.toFixed(2)}</span>
            <span className="text-emerald-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center">
              Claim <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* 3. Active Portfolio */}
        <div
          onClick={() => setActiveSection('plans')}
          className="p-4 rounded-2xl bg-[#0b1329] border border-slate-800 shadow-md cursor-pointer hover:border-slate-700 transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Active Portfolio</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white font-mono tabular-nums">
            {activeInvestments.length} Active
          </div>
          <span className="text-[10px] text-slate-400">
            ${totalInvestedAmount.toFixed(2)} Principal
          </span>
        </div>

        {/* 4. Pending Deposits */}
        <div
          onClick={() => setActiveSection('deposit-requests')}
          className="p-4 rounded-2xl bg-[#0b1329] border border-slate-800 shadow-md cursor-pointer hover:border-slate-700 transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Pending Deposits</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-300 font-mono tabular-nums">
            {depositRequests.filter((d) => d.status === 'pending').length} Requests
          </div>
          <span className="text-[10px] text-slate-400">Ledger Verification</span>
        </div>

        {/* 5. Pending Withdrawals */}
        <div
          onClick={() => setActiveSection('withdrawal-requests')}
          className="p-4 rounded-2xl bg-[#0b1329] border border-slate-800 shadow-md cursor-pointer hover:border-slate-700 transition flex flex-col justify-between col-span-2 md:col-span-1"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Pending Withdrawals</span>
            <ArrowUpRight className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-300 font-mono tabular-nums">
            {withdrawalRequests.filter((w) => w.status === 'pending').length} Requests
          </div>
          <span className="text-[10px] text-slate-400">Funds Reserved</span>
        </div>
      </div>

      {/* Mandatory Regulatory / Demonstration Rate Notice */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-200/90">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Official Policy Notice:</strong> Investment returns are not guaranteed. The 1% daily rate operates as a demonstration rate configured on the server.
          </span>
        </div>
        {user.role === 'admin' && onNavigateAdmin && (
          <button
            onClick={onNavigateAdmin}
            className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs whitespace-nowrap hover:bg-amber-400 transition"
          >
            Open Admin Dashboard
          </button>
        )}
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in duration-300 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ================================================================= */}
      {/* MAIN DASHBOARD LAYOUT: Sidebar (14 Sections) + Content Canvas */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 bg-[#0a1224] rounded-2xl border border-slate-800 p-2 sm:p-3 shadow-xl">
          <div className="px-3 py-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800 mb-2">
            Navigation Menu (14 Sections)
          </div>
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition whitespace-nowrap text-left ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <span className={isActive ? 'text-slate-950' : ''}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Canvas */}
        <div className="lg:col-span-9 bg-[#0a1224] rounded-2xl border border-slate-800 p-4 sm:p-6 shadow-xl min-h-[500px]">
          {/* ============================================================= */}
          {/* 1. PROFILE SECTION */}
          {/* ============================================================= */}
          {activeSection === 'profile' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-amber-400" />
                  Account Profile & Security
                </h2>
                <p className="text-xs text-slate-400">
                  Manage your personal credentials, contact numbers, and security preferences.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400">Email Address</span>
                  <p className="font-semibold text-white text-sm">{user.email}</p>
                  <span className="text-[10px] text-emerald-400">Verified Identity</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400">Registered Phone</span>
                  <p className="font-semibold text-white text-sm">{user.phone}</p>
                  <span className="text-[10px] text-slate-400">SMS Verification Ready</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400">Your Referral Code</span>
                  <p className="font-mono font-bold text-amber-400 text-sm">{user.referral_code}</p>
                  <span className="text-[10px] text-slate-400">8% Commission Qualified</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400">Available USDT Balance</span>
                  <p className="font-mono font-bold text-white text-base tabular-nums">
                    ${user.available_balance.toFixed(2)} USDT
                  </p>
                  <span className="text-[10px] text-amber-300">Server-Authoritative Ledger</span>
                </div>
                {/* Daily Profit Card in Profile */}
                <div 
                  onClick={() => setActiveSection('daily-profit')}
                  className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 space-y-1 cursor-pointer hover:border-emerald-400 transition"
                >
                  <span className="text-xs text-emerald-300 font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      Daily Profit Yield
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">1% / day</span>
                  </span>
                  <p className="font-mono font-bold text-emerald-400 text-base tabular-nums">
                    +${dailyProfitEstimated.toFixed(2)} USDT / day
                  </p>
                  <span className="text-[10px] text-slate-400">Across {activeInvestments.length} Active Plans</span>
                </div>
                {/* Total Profit Earned in Profile */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400">Total Profit Earned</span>
                  <p className="font-mono font-bold text-amber-400 text-base tabular-nums">
                    +${totalProfitEarned.toFixed(2)} USDT
                  </p>
                  <span className="text-[10px] text-slate-400">Cumulative Settled Yield</span>
                </div>
              </div>

              {/* Active Portfolio Summary */}
              <div>
                <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Your Active Investments ({activeInvestments.length})
                </h3>
                {activeInvestments.length === 0 ? (
                  <div className="p-6 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-center">
                    <p className="text-xs text-slate-400 mb-3">
                      You do not have any active investment plans running right now.
                    </p>
                    <button
                      onClick={() => setActiveSection('plans')}
                      className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition"
                    >
                      Browse the 7 Plans
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeInvestments.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-bold text-white">{inv.plan_name} Tier</p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Activated: {new Date(inv.created_at).toLocaleDateString()} · Rate: 1% / day
                          </span>
                        </div>
                        <div className="text-right font-mono">
                          <p className="text-xs font-bold text-emerald-400 tabular-nums">
                            +${inv.total_earned.toFixed(2)} USDT
                          </p>
                          <span className="text-[10px] text-slate-400">Earned So Far</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* 2. DEPOSIT SECTION */}
          {/* ============================================================= */}
          {activeSection === 'deposit' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                  Deposit USDT (TRC20 & BEP20)
                </h2>
                <p className="text-xs text-slate-400">
                  Transfer USDT to the official platform wallet address, then enter your blockchain transaction hash (TXID) below.
                </p>
              </div>

              {/* Network Toggle Tabs */}
              <div className="flex gap-2 p-1 bg-slate-900 rounded-xl max-w-xs border border-slate-800">
                <button
                  type="button"
                  onClick={() => setDepNetwork('TRC20')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                    depNetwork === 'TRC20'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  USDT (TRC20)
                </button>
                <button
                  type="button"
                  onClick={() => setDepNetwork('BEP20')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                    depNetwork === 'BEP20'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  USDT (BEP20)
                </button>
              </div>

              {/* Deposit Address Box */}
              {currentDepositAddress ? (
                <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/40 space-y-3">
                  <div className="flex items-center justify-between text-xs text-amber-300">
                    <span className="font-semibold">Official {depNetwork} Deposit Address:</span>
                    <span className="font-mono text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                      Network: {depNetwork}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={currentDepositAddress}
                      className="flex-1 py-2.5 px-3 rounded-lg bg-[#070d19] border border-slate-700 text-xs text-amber-200 font-mono select-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(currentDepositAddress)}
                      className="px-3.5 py-2.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition flex items-center gap-1.5"
                    >
                      {copiedAddr ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedAddr ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 italic">
                    ⚠️ Send only USDT ({depNetwork}) to this address. Any other asset may result in permanent loss.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  Deposits for {depNetwork} are temporarily unavailable. Official wallet address is being updated by administration.
                </div>
              )}

              {/* Deposit Submission Form */}
              <form onSubmit={handleDepositSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Deposit Amount (USDT)
                    </label>
                    <input
                      type="number"
                      min="10"
                      step="any"
                      required
                      value={depAmount}
                      onChange={(e) => setDepAmount(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Transaction Hash (TXID)
                    </label>
                    <input
                      type="text"
                      required
                      value={depTxid}
                      onChange={(e) => setDepTxid(e.target.value)}
                      placeholder="Paste blockchain transaction hash"
                      className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-mono outline-none"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <p>• Minimum deposit: 10 USDT.</p>
                  <p>• Blockchain ledger confirmation verifies funds prior to balance credit.</p>
                  <p>• Duplicate TXIDs will be automatically rejected by database constraints.</p>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading || !currentDepositAddress}
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:brightness-110 transition flex items-center justify-center gap-2 shadow-lg"
                >
                  {actionLoading ? 'Submitting Request...' : 'Submit Deposit Request for Review'}
                </button>
              </form>
            </div>
          )}

          {/* ============================================================= */}
          {/* 3. WITHDRAW SECTION */}
          {/* ============================================================= */}
          {activeSection === 'withdraw' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-amber-400" />
                  Request USDT Withdrawal
                </h2>
                <p className="text-xs text-slate-400">
                  Withdraw your available balance directly to your private TRC20 or BEP20 USDT wallet.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400">Current Available Balance:</span>
                  <p className="text-xl font-bold text-white font-mono tabular-nums">
                    ${user.available_balance.toFixed(2)} USDT
                  </p>
                </div>
                <span className="text-xs font-mono text-amber-300">
                  Min Withdrawal: ${publicSettings?.minWithdrawal || 10} USDT
                </span>
              </div>

              {/* Network Toggle Tabs */}
              <div className="flex gap-2 p-1 bg-slate-900 rounded-xl max-w-xs border border-slate-800">
                <button
                  type="button"
                  onClick={() => setWithNetwork('TRC20')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                    withNetwork === 'TRC20'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  USDT (TRC20)
                </button>
                <button
                  type="button"
                  onClick={() => setWithNetwork('BEP20')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                    withNetwork === 'BEP20'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  USDT (BEP20)
                </button>
              </div>

              <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Withdrawal Amount (USDT)
                  </label>
                  <input
                    type="number"
                    min={publicSettings?.minWithdrawal || 10}
                    step="any"
                    max={user.available_balance}
                    required
                    value={withAmount}
                    onChange={(e) => setWithAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Your {withNetwork} Receiving Address
                  </label>
                  <input
                    type="text"
                    required
                    value={withAddress}
                    onChange={(e) => setWithAddress(e.target.value)}
                    placeholder={
                      withNetwork === 'TRC20'
                        ? 'Starts with T (34 characters)'
                        : 'Starts with 0x (42 characters)'
                    }
                    className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Optional Transaction Note
                  </label>
                  <input
                    type="text"
                    value={withNotes}
                    onChange={(e) => setWithNotes(e.target.value)}
                    placeholder="e.g. Binance or Trust Wallet destination"
                    className="w-full py-2 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <p>• Requested amount is safely reserved immediately to avoid double spending.</p>
                  <p>• If rejected, the reserved funds are instantly restored to your available balance.</p>
                  <p>• Payout is manually verified and sent with an official blockchain payout TXID.</p>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading || user.available_balance < (publicSettings?.minWithdrawal || 10)}
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:brightness-110 transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                >
                  {actionLoading ? 'Processing Request...' : 'Confirm Withdrawal Request'}
                </button>
              </form>
            </div>
          )}

          {/* ============================================================= */}
          {/* 4. DEPOSIT REQUESTS HISTORY */}
          {/* ============================================================= */}
          {activeSection === 'deposit-requests' && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-400" />
                    Deposit Requests Status
                  </h2>
                  <p className="text-xs text-slate-400">
                    Live tracking of your submitted USDT blockchain deposit hashes.
                  </p>
                </div>
                <button
                  onClick={fetchDashboardData}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Refresh status"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {depositRequests.length === 0 ? (
                <div className="p-8 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-center text-xs text-slate-400">
                  No deposit requests submitted yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono">
                        <th className="py-2.5 px-3">ID</th>
                        <th className="py-2.5 px-3">Network</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">TXID</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {depositRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-900/50">
                          <td className="py-3 px-3 text-slate-300">#{req.id}</td>
                          <td className="py-3 px-3">
                            <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] text-amber-300">
                              {req.network}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-bold text-white tabular-nums">
                            ${req.amount.toFixed(2)} USDT
                          </td>
                          <td className="py-3 px-3 max-w-[150px] truncate text-slate-400" title={req.txid}>
                            {req.txid}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                req.status === 'approved'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : req.status === 'rejected'
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {req.status}
                            </span>
                            {req.admin_note && (
                              <p className="text-[10px] text-rose-300 font-sans mt-0.5">{req.admin_note}</p>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-400 text-[11px]">
                            {new Date(req.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============================================================= */}
          {/* 5. WITHDRAWAL REQUESTS HISTORY */}
          {/* ============================================================= */}
          {activeSection === 'withdrawal-requests' && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-amber-400" />
                    Withdrawal Requests Status
                  </h2>
                  <p className="text-xs text-slate-400">
                    Review approval status and blockchain payout hashes for all requested payouts.
                  </p>
                </div>
                <button
                  onClick={fetchDashboardData}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Refresh status"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {withdrawalRequests.length === 0 ? (
                <div className="p-8 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-center text-xs text-slate-400">
                  No withdrawal requests recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono">
                        <th className="py-2.5 px-3">ID</th>
                        <th className="py-2.5 px-3">Network</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Address</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Payout TXID</th>
                        <th className="py-2.5 px-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {withdrawalRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-900/50">
                          <td className="py-3 px-3 text-slate-300">#{req.id}</td>
                          <td className="py-3 px-3">
                            <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] text-amber-300">
                              {req.network}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-bold text-white tabular-nums">
                            ${req.amount.toFixed(2)} USDT
                          </td>
                          <td className="py-3 px-3 max-w-[120px] truncate text-slate-400" title={req.receiving_address}>
                            {req.receiving_address}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                req.status === 'approved'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : req.status === 'rejected'
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {req.status}
                            </span>
                            {req.admin_note && (
                              <p className="text-[10px] text-rose-300 font-sans mt-0.5">{req.admin_note}</p>
                            )}
                          </td>
                          <td className="py-3 px-3 max-w-[140px] truncate text-emerald-400" title={req.payout_txid || ''}>
                            {req.payout_txid || '—'}
                          </td>
                          <td className="py-3 px-3 text-slate-400 text-[11px]">
                            {new Date(req.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============================================================= */}
          {/* 6. TRANSACTION HISTORY */}
          {/* ============================================================= */}
          {activeSection === 'transactions' && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" />
                  Complete Ledger & Transaction History
                </h2>
                <p className="text-xs text-slate-400">
                  Every deposit, investment debit, daily profit distribution, and referral bonus is recorded immutably.
                </p>
              </div>

              {transactions.length === 0 ? (
                <div className="p-8 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-center text-xs text-slate-400">
                  No transactions recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                        <th className="py-2.5 px-3 text-right">Balance After</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {transactions.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-900/50">
                          <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                            {new Date(t.created_at).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase text-slate-300">
                              {t.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 font-sans">{t.description}</td>
                          <td
                            className={`py-2.5 px-3 text-right font-bold tabular-nums ${
                              t.amount > 0 ? 'text-emerald-400' : 'text-slate-300'
                            }`}
                          >
                            {t.amount > 0 ? `+` : ''}
                            ${t.amount.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-400 tabular-nums">
                            ${t.balance_after.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`text-[10px] font-bold uppercase ${
                                t.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============================================================= */}
          {/* 7. BONUS OVERVIEW */}
          {/* ============================================================= */}
          {activeSection === 'bonus' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Gift className="w-5 h-5 text-yellow-400" />
                  Bonus Programs & Rewards Center
                </h2>
                <p className="text-xs text-slate-400">
                  Earn supplementary rewards through platform daily check-ins and verified referral commissions.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 to-slate-900 border border-amber-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-amber-300 text-sm font-bold">
                    <Calendar className="w-5 h-5 text-amber-400" />
                    <span>Daily Check-In Bonus</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Receive $0.50 USDT credited to your available balance once every 24 hours just by checking into your account.
                  </p>
                  <button
                    onClick={() => setActiveSection('daily-bonus')}
                    className="w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition"
                  >
                    Go to Daily Bonus Claim
                  </button>
                </div>

                <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-950/40 to-slate-900 border border-sky-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-sky-300 text-sm font-bold">
                    <Users className="w-5 h-5 text-sky-400" />
                    <span>8% Referral Bounty</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Earn an 8% commission on your referred user's first qualifying tier investment. Automatically credited.
                  </p>
                  <button
                    onClick={() => setActiveSection('referral-bonus')}
                    className="w-full py-2.5 rounded-xl bg-sky-500 text-slate-950 font-bold text-xs hover:bg-sky-400 transition"
                  >
                    View Referral Commission Records
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* 8. DAILY BONUS */}
          {/* ============================================================= */}
          {activeSection === 'daily-bonus' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-400" />
                  Daily Loyalty Check-In Bonus
                </h2>
                <p className="text-xs text-slate-400">
                  Earn a complimentary $0.50 USDT reward credited to your available balance each day.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-[#070d19] border border-amber-500/40 text-center max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-400/50 flex items-center justify-center mx-auto">
                  <Gift className="w-8 h-8 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Daily Loyalty Reward</h3>
                  <p className="text-3xl font-black text-amber-400 font-mono my-2">+0.50 USDT</p>
                  <p className="text-xs text-slate-400">
                    Available once per calendar day (UTC) for active community members.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleClaimDailyBonus}
                  disabled={claimedToday || actionLoading}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition ${
                    claimedToday
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:brightness-110 shadow-lg'
                  }`}
                >
                  {claimedToday ? 'Claimed for Today (Check back tomorrow)' : actionLoading ? 'Claiming...' : 'Claim Today\'s $0.50 Bonus'}
                </button>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* 9. REFERRAL BONUS */}
          {/* ============================================================= */}
          {activeSection === 'referral-bonus' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-sky-400" />
                  8% Referral Commission Ledger
                </h2>
                <p className="text-xs text-slate-400">
                  Configured rate: 8%. Eligible only once for a referred user's first qualifying investment.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-xs text-slate-400">Configured Rate</span>
                  <p className="text-xl font-bold text-amber-400 font-mono">8.0%</p>
                  <span className="text-[10px] text-slate-400">First Qualifying Investment</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-xs text-slate-400">Total Bounties Earned</span>
                  <p className="text-xl font-bold text-emerald-400 font-mono tabular-nums">
                    ${referralData?.totalEarned?.toFixed(2) || '0.00'} USDT
                  </p>
                  <span className="text-[10px] text-slate-400">Fully Credited to Balance</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-xs text-slate-400">Referred Users</span>
                  <p className="text-xl font-bold text-white font-mono">
                    {referralData?.referredCount || 0}
                  </p>
                  <span className="text-[10px] text-slate-400">Affiliate Downline</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-200 mb-2">Commission Payout History</h3>
                {(!referralData?.rewards || referralData.rewards.length === 0) ? (
                  <div className="p-6 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-center text-xs text-slate-400">
                    No referral bonuses triggered yet. Share your referral link to earn 8% on your friends' first investments!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-mono">
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Referee ID</th>
                          <th className="py-2 px-3">Investment Amount</th>
                          <th className="py-2 px-3">Rate</th>
                          <th className="py-2 px-3 text-right">Commission Earned</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {referralData.rewards.map((r) => (
                          <tr key={r.id}>
                            <td className="py-2.5 px-3 text-slate-400">{new Date(r.created_at).toLocaleDateString()}</td>
                            <td className="py-2.5 px-3 text-slate-200">User #{r.referee_id}</td>
                            <td className="py-2.5 px-3 font-semibold text-white">${r.investment_amount.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-amber-300">8%</td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-400 tabular-nums">
                              +${r.reward_amount.toFixed(2)} USDT
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* 10. DAILY PROFIT */}
          {/* ============================================================= */}
          {activeSection === 'daily-profit' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  Daily Portfolio Profit (1% Demonstration Rate)
                </h2>
                <p className="text-xs text-slate-400">
                  Accrued yield calculation based on platform parameters.
                </p>
              </div>

              {/* Regulatory Notice Banner */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Notice Regarding Yield Rates:</p>
                  <p className="text-slate-300 mt-0.5">
                    "Investment returns are not guaranteed." The configured rate is 1% daily for demonstration purposes.
                  </p>
                </div>
              </div>

              {/* 4 Dedicated Daily Profit KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/50 to-slate-900 border border-emerald-500/40 shadow-md">
                  <div className="flex items-center justify-between text-xs text-emerald-300 mb-1">
                    <span className="font-semibold">Today's Daily Profit</span>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-xl sm:text-2xl font-black text-emerald-400 font-mono tabular-nums">
                    +${dailyProfitEstimated.toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-400">USDT / Every 24h</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Total Settled Profit</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-white font-mono tabular-nums">
                    +${totalProfitEarned.toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-400">Credited to Balance</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Active Capital</span>
                    <Layers className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-amber-300 font-mono tabular-nums">
                    ${totalInvestedAmount.toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-400">{activeInvestments.length} Active Tiers</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Configured Rate</span>
                    <Clock className="w-4 h-4 text-sky-400" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-sky-300 font-mono tabular-nums">
                    1.0%
                  </p>
                  <span className="text-[10px] text-slate-400">Demonstration Yield</span>
                </div>
              </div>

              {/* Daily Profit Action Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0c1a3b] via-slate-900 to-[#070d19] border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold uppercase mb-1">
                    <TrendingUp className="w-3 h-3" />
                    Daily Profit Engine Active
                  </div>
                  <p className="text-xl sm:text-2xl font-black text-white font-mono mt-1">
                    {activeInvestments.length > 0 ? (
                      <>+${dailyProfitEstimated.toFixed(2)} USDT / day Accrual</>
                    ) : (
                      <>No Active Tier Contracts</>
                    )}
                  </p>
                  <p className="text-xs text-slate-300 mt-1">
                    {activeInvestments.length > 0
                      ? 'Returns accumulate automatically based on your active tier contracts and can be claimed anytime.'
                      : 'Activate an investment plan to start receiving daily returns.'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
                  {activeInvestments.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => setActiveSection('plans')}
                      className="py-3 px-6 rounded-xl font-bold text-xs bg-amber-500 text-slate-950 hover:bg-amber-400 transition shadow-lg shadow-amber-500/20 text-center"
                    >
                      Browse 7 Investment Plans
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleClaimDailyProfit}
                      disabled={actionLoading}
                      className="py-3 px-6 rounded-xl font-bold text-xs bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {actionLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Calculating Profit...</span>
                        </>
                      ) : (
                        <>
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>Claim Accrued Daily Profit</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-200 mb-3">Portfolio Contract Yields</h3>
                {activeInvestments.length === 0 ? (
                  <div className="p-6 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-center text-xs text-slate-400">
                    No active tier plans yet. Invest in one of the 7 plans to start earning daily returns.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeInvestments.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-bold text-white">{inv.plan_name} Contract (${inv.amount})</p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Daily rate: {(inv.daily_profit_rate * 100).toFixed(0)}% (${(inv.amount * inv.daily_profit_rate).toFixed(2)}/day)
                          </span>
                        </div>
                        <div className="text-right font-mono">
                          <p className="text-xs font-bold text-emerald-400 tabular-nums">
                            +${inv.total_earned.toFixed(2)}
                          </p>
                          <span className="text-[10px] text-slate-400">Total Settled</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* 11. INVESTMENT PLANS (THE 7 PLANS) */}
          {/* ============================================================= */}
          {activeSection === 'plans' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-amber-400" />
                    Seven Premier Investment Tiers
                  </h2>
                  <p className="text-xs text-slate-400">
                    Exactly seven tiers available: Silver ($30) up to Sunrise ($2,000). Click Flip on any card to inspect hallmark details.
                  </p>
                </div>
                <div className="text-xs font-mono text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 whitespace-nowrap">
                  Balance: ${user.available_balance.toFixed(2)} USDT
                </div>
              </div>

              {loadingPlans ? (
                <div className="py-12 text-center text-xs text-amber-300 font-mono">
                  Loading the 7 investment tiers...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {plans.map((plan) => {
                    const isAlreadyInvested = activeInvestments.some((inv) => inv.plan_id === plan.id);
                    return (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        userBalance={user.available_balance}
                        isInvested={isAlreadyInvested}
                        onSelect={(p) => setSelectedPlanForInvest(p)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================================= */}
          {/* 12. REFERRAL LINK */}
          {/* ============================================================= */}
          {activeSection === 'referral-link' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <LinkIcon className="w-5 h-5 text-purple-400" />
                  Your Affiliate Referral Link
                </h2>
                <p className="text-xs text-slate-400">
                  Invite investors with your unique link and earn 8% on their first qualifying plan.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-purple-500/30 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Your Personal Referral Link
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={referralData?.referralLink || `${window.location.origin}?ref=${user.referral_code}`}
                      className="flex-1 py-2.5 px-3.5 rounded-xl bg-[#070d19] border border-slate-700 text-xs font-mono text-purple-200 select-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          referralData?.referralLink || `${window.location.origin}?ref=${user.referral_code}`
                        )
                      }
                      className="py-2.5 px-4 rounded-xl bg-purple-500 text-white font-bold text-xs hover:bg-purple-400 transition flex items-center gap-1.5"
                    >
                      {copiedAddr ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedAddr ? 'Copied' : 'Copy Link'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-[#070d19] border border-slate-800">
                    <span className="text-[11px] text-slate-400">Unique Code:</span>
                    <p className="text-sm font-bold font-mono text-amber-400">{user.referral_code}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#070d19] border border-slate-800">
                    <span className="text-[11px] text-slate-400">Total Downline:</span>
                    <p className="text-sm font-bold font-mono text-white">
                      {referralData?.referredCount || 0} Members
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-200 mb-2">Referred Accounts</h3>
                {(!referralData?.referredUsers || referralData.referredUsers.length === 0) ? (
                  <div className="p-6 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-center text-xs text-slate-400">
                    No affiliates have registered with your code yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {referralData.referredUsers.map((u) => (
                      <div
                        key={u.id}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <span className="text-white font-medium">{u.email}</span>
                        <span className="text-slate-400 font-mono">
                          Joined {new Date(u.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* 13. ACCOUNT SETTINGS */}
          {/* ============================================================= */}
          {activeSection === 'settings' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-slate-300" />
                  Account & Security Settings
                </h2>
                <p className="text-xs text-slate-400">
                  Update your contact details or change your account password.
                </p>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none"
                  />
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <h4 className="text-xs font-bold text-amber-300 mb-2">Change Password</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={currentPass}
                        onChange={(e) => setCurrentPass(e.target.value)}
                        placeholder="Enter current password"
                        className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        New Password (Min 6 characters)
                      </label>
                      <input
                        type="password"
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="py-2.5 px-4 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>

              {/* Android App & APK Installation Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0c1a3b] to-[#070d19] border border-amber-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-amber-400" />
                    <h3 className="text-sm font-bold text-white">Direct Android Installation (Without Play Store)</h3>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Standalone WebAPK
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Install BOYA.COM directly to your Android device with a single tap. It adds an authentic app icon to your phone launcher, runs full screen without browser bars, and requires no Play Store account.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    onClick={() => {
                      // Trigger native prompt or guide
                      const navEvt = new CustomEvent('open-install-modal');
                      window.dispatchEvent(navEvt);
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-md shadow-amber-500/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install BOYA App on Android</span>
                  </button>
                  <a
                    href={`https://www.pwabuilder.com?site=${encodeURIComponent(window.location.origin)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <span>Generate Standalone .APK File</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* 14. SUPPORT */}
          {/* ============================================================= */}
          {activeSection === 'support' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-cyan-400" />
                  Official Customer Helpdesk & Support
                </h2>
                <p className="text-xs text-slate-400">
                  Our financial support team is available 24/7 for deposit and withdrawal verifications.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400">Telegram Desk</span>
                  <p className="font-bold text-white text-sm">{publicSettings?.supportTelegram || '@BOYASupport'}</p>
                  <span className="text-[10px] text-cyan-400">Instant Chat</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400">Email Inquiries</span>
                  <p className="font-bold text-white text-sm">{publicSettings?.supportEmail || 'support@boya.com'}</p>
                  <span className="text-[10px] text-slate-400">Official Correspondence</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400">Telephone Helpline</span>
                  <p className="font-bold text-white text-sm">{publicSettings?.supportPhone || '+1 (800) 269-2266'}</p>
                  <span className="text-[10px] text-slate-400">International Toll Free</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-slate-200">Frequently Asked Questions</h3>
                <div className="space-y-2 text-xs">
                  <details className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 cursor-pointer">
                    <summary className="font-semibold text-white">How long do USDT deposits take to be approved?</summary>
                    <p className="text-slate-400 mt-2 pl-2 border-l border-amber-500/40">
                      Deposits are verified directly on the blockchain ledger by our financial desk. Typical approval settles within 10 to 60 minutes after submitting your TXID.
                    </p>
                  </details>
                  <details className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 cursor-pointer">
                    <summary className="font-semibold text-white">How does the 8% referral bonus work?</summary>
                    <p className="text-slate-400 mt-2 pl-2 border-l border-amber-500/40">
                      When someone registers with your referral code and activates their first qualifying investment tier, 8% of that tier amount is immediately credited to your balance.
                    </p>
                  </details>
                  <details className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 cursor-pointer">
                    <summary className="font-semibold text-white">Why is there no $10 Starter plan?</summary>
                    <p className="text-slate-400 mt-2 pl-2 border-l border-amber-500/40">
                      The legacy $10 Starter plan has been permanently discontinued. The platform now features exactly seven institutional tiers starting from Silver ($30).
                    </p>
                  </details>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* INVESTMENT CONFIRMATION MODAL */}
      {/* ================================================================= */}
      {selectedPlanForInvest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#091124] border border-amber-500/50 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              Confirm {selectedPlanForInvest.name} Tier Investment
            </h3>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Plan Amount:</span>
                <span className="font-mono font-bold text-white">${selectedPlanForInvest.amount} USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Daily Return (1%):</span>
                <span className="font-mono text-emerald-400">
                  +${(selectedPlanForInvest.amount * 0.01).toFixed(2)} USDT / day
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Your Available Balance:</span>
                <span className="font-mono text-white">${user.available_balance.toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2">
                <span className="text-slate-400">Balance After Activation:</span>
                <span className="font-mono font-bold text-amber-300">
                  ${(user.available_balance - selectedPlanForInvest.amount).toFixed(2)} USDT
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              "Investment returns are not guaranteed. Daily demonstration rate is 1% based on platform parameters."
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPlanForInvest(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmInvestment}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold text-xs hover:brightness-110 shadow-lg"
              >
                {actionLoading ? 'Activating...' : 'Confirm Activation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
