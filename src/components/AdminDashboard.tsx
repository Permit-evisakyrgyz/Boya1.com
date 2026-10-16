import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users as UsersIcon,
  ArrowDownLeft,
  ArrowUpRight,
  Layers,
  FileText,
  Share2,
  TrendingUp,
  Gift,
  Settings as SettingsIcon,
  ShieldAlert,
  LogOut,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Edit2,
  DollarSign,
  Lock,
  Unlock,
  Send,
  Shield,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { User, InvestmentPlan, DepositRequest, WithdrawalRequest, Transaction, AuditLog } from '../types';

interface AdminDashboardProps {
  adminUser: User;
  token: string;
  onLogout: () => void;
  onSwitchToUserView: () => void;
}

type AdminTab =
  | 'overview'
  | 'users'
  | 'deposits'
  | 'withdrawals'
  | 'plans'
  | 'transactions'
  | 'referrals'
  | 'profit-settings'
  | 'bonus-settings'
  | 'system-settings'
  | 'audit-trail';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminUser,
  token,
  onLogout,
  onSwitchToUserView,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Overview metrics
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showAdminEmail, setShowAdminEmail] = useState(false);

  // Tab Data
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [depositsList, setDepositsList] = useState<DepositRequest[]>([]);
  const [depositFilter, setDepositFilter] = useState<string>('all');
  const [withdrawalsList, setWithdrawalsList] = useState<WithdrawalRequest[]>([]);
  const [withdrawalFilter, setWithdrawalFilter] = useState<string>('all');
  const [plansList, setPlansList] = useState<InvestmentPlan[]>([]);
  const [transactionsList, setTransactionsList] = useState<Transaction[]>([]);
  const [referralsData, setReferralsData] = useState<{ relationships: any[]; rewards: any[] }>({
    relationships: [],
    rewards: [],
  });
  const [systemSettings, setSystemSettings] = useState<Record<string, string>>({});
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Action Modals / Prompts
  const [rejectDepositModal, setRejectDepositModal] = useState<DepositRequest | null>(null);
  const [rejectDepositReason, setRejectDepositReason] = useState('');
  const [approveWithdrawalModal, setApproveWithdrawalModal] = useState<WithdrawalRequest | null>(null);
  const [payoutTxidInput, setPayoutTxidInput] = useState('');
  const [rejectWithdrawalModal, setRejectWithdrawalModal] = useState<WithdrawalRequest | null>(null);
  const [rejectWithdrawalReason, setRejectWithdrawalReason] = useState('');
  const [adjustBalanceModal, setAdjustBalanceModal] = useState<any | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  // User Investments Management States
  const [manageInvestmentsUser, setManageInvestmentsUser] = useState<any | null>(null);
  const [userInvestments, setUserInvestments] = useState<any[]>([]);
  const [editingInv, setEditingInv] = useState<any | null>(null);
  const [editPlanName, setEditPlanName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDailyRate, setEditDailyRate] = useState('0.01');
  const [editDailyDollars, setEditDailyDollars] = useState('1.00');
  const [editTotalEarned, setEditTotalEarned] = useState('0');
  const [editStatus, setEditStatus] = useState('active');
  const [assignPlanId, setAssignPlanId] = useState('gold');
  const [assignCustomAmount, setAssignCustomAmount] = useState('');

  // Quick User Daily Profit Override
  const [quickDailyProfitRate, setQuickDailyProfitRate] = useState('0.01');
  const [quickTargetDailyDollars, setQuickTargetDailyDollars] = useState('');
  const [quickUpdatingProfit, setQuickUpdatingProfit] = useState(false);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 6000);
  };

  const openUserInvestments = async (targetUser: any) => {
    setManageInvestmentsUser(targetUser);
    setEditingInv(null);
    setQuickTargetDailyDollars('');
    setQuickDailyProfitRate('0.01');
    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}/investments`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUserInvestments(data.investments || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleQuickUpdateDailyProfit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageInvestmentsUser) return;
    setQuickUpdatingProfit(true);
    try {
      const res = await fetch(`/api/admin/users/${manageInvestmentsUser.id}/update-daily-profit`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          newDailyRate: quickDailyProfitRate ? parseFloat(quickDailyProfitRate) : undefined,
          targetDailyProfitDollars: quickTargetDailyDollars ? parseFloat(quickTargetDailyDollars) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showFeedback('success', data.message);
      setQuickTargetDailyDollars('');
      openUserInvestments(manageInvestmentsUser);
      fetchUsers();
      fetchOverview();
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setQuickUpdatingProfit(false);
    }
  };

  const handleSaveInvestmentEdit = async () => {
    if (!editingInv) return;
    try {
      const res = await fetch(`/api/admin/investments/${editingInv.id}/update`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          plan_name: editPlanName,
          amount: parseFloat(editAmount),
          daily_profit_rate: parseFloat(editDailyRate),
          total_earned: parseFloat(editTotalEarned),
          status: editStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showFeedback('success', data.message);
      setEditingInv(null);
      if (manageInvestmentsUser) openUserInvestments(manageInvestmentsUser);
      fetchUsers();
      fetchOverview();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleCancelRefundInvestment = async (invId: number) => {
    if (!window.confirm('Are you sure you want to cancel this contract and refund the full principal back to the user balance?')) return;
    try {
      const res = await fetch(`/api/admin/investments/${invId}/cancel-refund`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showFeedback('success', data.message);
      if (manageInvestmentsUser) {
        openUserInvestments(manageInvestmentsUser);
        fetchUsers();
      }
      fetchOverview();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleAssignInvestment = async () => {
    if (!manageInvestmentsUser) return;
    try {
      const res = await fetch(`/api/admin/users/${manageInvestmentsUser.id}/assign-investment`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          planId: assignPlanId,
          customAmount: assignCustomAmount ? parseFloat(assignCustomAmount) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showFeedback('success', data.message);
      setAssignCustomAmount('');
      openUserInvestments(manageInvestmentsUser);
      fetchOverview();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  });

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/overview', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const url = userSearchQuery ? `/api/admin/users?q=${encodeURIComponent(userSearchQuery)}` : '/api/admin/users';
      const res = await fetch(url, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDeposits = async () => {
    try {
      const url = depositFilter !== 'all' ? `/api/admin/deposits?status=${depositFilter}` : '/api/admin/deposits';
      const res = await fetch(url, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDepositsList(data.deposits || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const url = withdrawalFilter !== 'all' ? `/api/admin/withdrawals?status=${withdrawalFilter}` : '/api/admin/withdrawals';
      const res = await fetch(url, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setWithdrawalsList(data.withdrawals || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/admin/plans', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPlansList(data.plans || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/admin/transactions', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTransactionsList(data.transactions || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReferrals = async () => {
    try {
      const res = await fetch('/api/admin/referrals', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setReferralsData(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSystemSettings(data.settings || {});
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit-trail', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchOverview();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'deposits') fetchDeposits();
    if (activeTab === 'withdrawals') fetchWithdrawals();
    if (activeTab === 'plans') fetchPlans();
    if (activeTab === 'transactions') fetchTransactions();
    if (activeTab === 'referrals') fetchReferrals();
    if (activeTab === 'profit-settings' || activeTab === 'bonus-settings' || activeTab === 'system-settings') fetchSettings();
    if (activeTab === 'audit-trail') fetchAuditLogs();
  }, [activeTab]);

  // Approve Deposit Request
  const handleApproveDeposit = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/deposits/${id}/approve`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showFeedback('success', data.message);
      fetchDeposits();
      fetchOverview();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Reject Deposit Request
  const handleRejectDeposit = async () => {
    if (!rejectDepositModal) return;
    try {
      const res = await fetch(`/api/admin/deposits/${rejectDepositModal.id}/reject`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ reason: rejectDepositReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showFeedback('success', data.message);
      setRejectDepositModal(null);
      setRejectDepositReason('');
      fetchDeposits();
      fetchOverview();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Approve Withdrawal Request (with payout TXID)
  const handleApproveWithdrawal = async () => {
    if (!approveWithdrawalModal || !payoutTxidInput.trim()) {
      showFeedback('error', 'Please enter the blockchain payout TXID.');
      return;
    }
    try {
      const res = await fetch(`/api/admin/withdrawals/${approveWithdrawalModal.id}/approve`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ payoutTxid: payoutTxidInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showFeedback('success', data.message);
      setApproveWithdrawalModal(null);
      setPayoutTxidInput('');
      fetchWithdrawals();
      fetchOverview();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Reject Withdrawal Request (refunds balance)
  const handleRejectWithdrawal = async () => {
    if (!rejectWithdrawalModal) return;
    try {
      const res = await fetch(`/api/admin/withdrawals/${rejectWithdrawalModal.id}/reject`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ reason: rejectWithdrawalReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showFeedback('success', data.message);
      setRejectWithdrawalModal(null);
      setRejectWithdrawalReason('');
      fetchWithdrawals();
      fetchOverview();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Toggle user active status
  const handleToggleUserStatus = async (userId: number) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle-status`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showFeedback('success', data.message);
      fetchUsers();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Adjust User Balance
  const handleAdjustBalance = async () => {
    if (!adjustBalanceModal) return;
    try {
      const res = await fetch(`/api/admin/users/${adjustBalanceModal.id}/adjust-balance`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          amount: parseFloat(adjustAmount),
          reason: adjustReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showFeedback('success', data.message);
      setAdjustBalanceModal(null);
      setAdjustAmount('');
      setAdjustReason('');
      fetchUsers();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Trigger server-wide daily profit payout
  const handleDistributeDailyProfits = async () => {
    if (!window.confirm('Distribute 1% daily portfolio returns to all active investor contracts now?')) return;
    try {
      const res = await fetch('/api/admin/distribute-daily-profit', {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showFeedback('success', data.message);
      fetchOverview();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Save System Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ settings: systemSettings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showFeedback('success', data.message);
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: '1. Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'users', label: '2. Users', icon: <UsersIcon className="w-4 h-4" /> },
    { id: 'deposits', label: '3. Deposit Requests', icon: <ArrowDownLeft className="w-4 h-4 text-emerald-400" /> },
    { id: 'withdrawals', label: '4. Withdrawal Requests', icon: <ArrowUpRight className="w-4 h-4 text-amber-400" /> },
    { id: 'plans', label: '5. Investment Plans', icon: <Layers className="w-4 h-4 text-amber-300" /> },
    { id: 'transactions', label: '6. Transactions', icon: <FileText className="w-4 h-4" /> },
    { id: 'referrals', label: '7. Referral Records', icon: <Share2 className="w-4 h-4 text-sky-400" /> },
    { id: 'profit-settings', label: '8. Daily Profit Settings', icon: <TrendingUp className="w-4 h-4 text-emerald-400" /> },
    { id: 'bonus-settings', label: '9. Bonus Settings', icon: <Gift className="w-4 h-4 text-yellow-300" /> },
    { id: 'system-settings', label: '10. System Settings', icon: <SettingsIcon className="w-4 h-4" /> },
    { id: 'audit-trail', label: '11. Audit Trail', icon: <ShieldAlert className="w-4 h-4 text-rose-400" /> },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Top Admin Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#091124] border border-amber-500/40 shadow-xl">
        <div className="flex items-center gap-3">
          <BrandLogo size="md" />
          <div className="pl-3 border-l border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono font-bold text-amber-400 tracking-wider">
                Authorized Admin Console
              </span>
              <span className="bg-emerald-500/15 text-emerald-300 text-[10px] font-mono px-2.5 py-0.5 rounded border border-emerald-500/30 inline-flex items-center gap-1.5 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{showAdminEmail ? adminUser.email : 'Master Root [Email Hidden]'}</span>
                <button
                  type="button"
                  onClick={() => setShowAdminEmail(!showAdminEmail)}
                  className="text-slate-400 hover:text-white p-0.5 rounded transition"
                  title={showAdminEmail ? 'Hide administrator email' : 'Reveal administrator email'}
                >
                  {showAdminEmail ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Manual approval engine & SQLite ledger security</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSwitchToUserView}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Switch to Investor View
          </button>
          <button
            onClick={onLogout}
            className="px-3.5 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
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
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Admin Grid: Navigation + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Navigation Tabs */}
        <div className="lg:col-span-3 bg-[#0a1224] rounded-2xl border border-slate-800 p-2 sm:p-3 shadow-xl">
          <div className="px-3 py-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800 mb-2">
            Admin Modules (12)
          </div>
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition whitespace-nowrap text-left ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <span className={isActive ? 'text-slate-950' : ''}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
            <button
              onClick={onLogout}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>12. Logout</span>
            </button>
          </nav>
        </div>

        {/* Admin Content Area */}
        <div className="lg:col-span-9 bg-[#0a1224] rounded-2xl border border-slate-800 p-4 sm:p-6 shadow-xl min-h-[550px]">
          {/* ============================================================= */}
          {/* 1. OVERVIEW */}
          {/* ============================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <LayoutDashboard className="w-5 h-5 text-amber-400" />
                    Administrative System Overview
                  </h2>
                  <p className="text-xs text-slate-400">
                    Real-time metrics, liquidity queues, and active portfolio ledger volume.
                  </p>
                </div>
                <button
                  onClick={fetchOverview}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {metrics && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-xs text-slate-400">Total Registered Users</span>
                    <p className="text-2xl font-bold text-white font-mono mt-1">{metrics.totalUsers}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/30">
                    <span className="text-xs text-emerald-400">Pending Deposit Requests</span>
                    <p className="text-2xl font-bold text-emerald-300 font-mono mt-1">
                      {metrics.pendingDepositsCount} (${metrics.pendingDepositsSum.toFixed(2)})
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/30">
                    <span className="text-xs text-amber-400">Pending Withdrawal Requests</span>
                    <p className="text-2xl font-bold text-amber-300 font-mono mt-1">
                      {metrics.pendingWithdrawalsCount} (${metrics.pendingWithdrawalsSum.toFixed(2)})
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-xs text-slate-400">Total Approved Deposits</span>
                    <p className="text-2xl font-bold text-white font-mono mt-1">
                      ${metrics.approvedDepositsSum.toFixed(2)} USDT
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-xs text-slate-400">Total Completed Withdrawals</span>
                    <p className="text-2xl font-bold text-white font-mono mt-1">
                      ${metrics.approvedWithdrawalsSum.toFixed(2)} USDT
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-xs text-slate-400">Active Investment Volume</span>
                    <p className="text-2xl font-bold text-amber-400 font-mono mt-1">
                      ${metrics.totalInvestmentsSum.toFixed(2)} USDT
                    </p>
                  </div>
                </div>
              )}

              {/* Quick Actions Panel */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0c1836] to-[#0a1224] border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Daily 1% Return Distribution Engine</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Trigger server-side daily profit accrual across all active investment contracts.
                  </p>
                </div>
                <button
                  onClick={handleDistributeDailyProfits}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition flex items-center gap-2 whitespace-nowrap"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Execute 1% Daily Profit Payout</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* 2. USERS MANAGEMENT */}
          {/* ============================================================= */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <UsersIcon className="w-5 h-5 text-amber-400" />
                    User Directory & Account Controls
                  </h2>
                  <p className="text-xs text-slate-400">
                    Search users, review balances, toggle active status, or make authorized ledger adjustments.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                      placeholder="Search email, phone, code..."
                      className="py-1.5 px-3 pl-8 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white outline-none w-48 sm:w-64"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                  <button
                    onClick={fetchUsers}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono">
                      <th className="py-2.5 px-3">ID</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Phone</th>
                      <th className="py-2.5 px-3">Ref Code</th>
                      <th className="py-2.5 px-3 text-right">Balance</th>
                      <th className="py-2.5 px-3 text-right">Active Capital</th>
                      <th className="py-2.5 px-3 text-right">Daily Profit</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-900/50">
                        <td className="py-2.5 px-3 text-slate-400">#{u.id}</td>
                        <td className="py-2.5 px-3 text-white font-sans font-medium">
                          {u.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1.5 text-amber-300 font-mono text-[11px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              <Shield className="w-3 h-3 text-amber-400" />
                              <span>{showAdminEmail ? u.email : '[Admin Email Hidden]'}</span>
                            </span>
                          ) : (
                            u.email
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {u.role === 'admin' && !showAdminEmail ? '[Protected]' : u.phone}
                        </td>
                        <td className="py-2.5 px-3 text-amber-300">{u.referral_code}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-white tabular-nums">
                          ${u.available_balance.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-amber-300 font-mono tabular-nums">
                          ${(u.total_invested || 0).toFixed(2)}
                          <span className="block text-[10px] text-slate-400">
                            {u.active_investments_count || 0} active
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-400 font-mono tabular-nums">
                          +${(u.daily_profit_total || 0).toFixed(2)}
                          <span className="block text-[10px] text-emerald-300/70 font-sans font-normal">USDT/day</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              u.is_active === 1
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {u.is_active === 1 ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-1.5 font-sans">
                          <button
                            onClick={() => openUserInvestments(u)}
                            className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold inline-flex items-center gap-1 transition"
                            title="Edit user daily profit and investment contracts"
                          >
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Edit Daily Profit</span>
                          </button>
                          <button
                            onClick={() => {
                              setAdjustBalanceModal(u);
                              setAdjustAmount('');
                              setAdjustReason('');
                            }}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-semibold"
                            title="Adjust user balance"
                          >
                            Adjust Balance
                          </button>
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => handleToggleUserStatus(u.id)}
                              className={`px-2 py-1 rounded text-[11px] font-semibold ${
                                u.is_active === 1
                                  ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                              }`}
                            >
                              {u.is_active === 1 ? 'Disable' : 'Activate'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* 3. DEPOSIT REQUESTS */}
          {/* ============================================================= */}
          {activeTab === 'deposits' && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                    Deposit Requests Manual Approval
                  </h2>
                  <p className="text-xs text-slate-400">
                    Verify submitted blockchain TXID hashes and credit user balances manually.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={depositFilter}
                    onChange={(e) => setDepositFilter(e.target.value)}
                    className="py-1.5 px-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white outline-none"
                  >
                    <option value="all">All Requests</option>
                    <option value="pending">Pending Only</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <button
                    onClick={fetchDeposits}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono">
                      <th className="py-2.5 px-3">ID</th>
                      <th className="py-2.5 px-3">User</th>
                      <th className="py-2.5 px-3">Network</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">TXID</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {depositsList.map((d: any) => (
                      <tr key={d.id} className="hover:bg-slate-900/50">
                        <td className="py-3 px-3 text-slate-400">#{d.id}</td>
                        <td className="py-3 px-3 text-white font-sans">
                          {d.user_email}
                          <span className="block text-[10px] text-slate-400 font-mono">{d.user_phone}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] text-amber-300">
                            {d.network}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-white tabular-nums">
                          ${d.amount.toFixed(2)} USDT
                        </td>
                        <td className="py-3 px-3 max-w-[140px] truncate text-slate-300" title={d.txid}>
                          {d.txid}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              d.status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : d.status === 'rejected'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right space-x-1.5 font-sans">
                          {d.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleApproveDeposit(d.id)}
                                className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setRejectDepositModal(d)}
                                className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs border border-rose-500/30"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400">Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* 4. WITHDRAWAL REQUESTS */}
          {/* ============================================================= */}
          {activeTab === 'withdrawals' && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <ArrowUpRight className="w-5 h-5 text-amber-400" />
                    Withdrawal Requests Manual Approval
                  </h2>
                  <p className="text-xs text-slate-400">
                    Approve payouts by recording actual blockchain TXIDs, or reject to refund reserved funds.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={withdrawalFilter}
                    onChange={(e) => setWithdrawalFilter(e.target.value)}
                    className="py-1.5 px-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white outline-none"
                  >
                    <option value="all">All Withdrawals</option>
                    <option value="pending">Pending Only</option>
                    <option value="approved">Approved / Paid</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <button
                    onClick={fetchWithdrawals}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono">
                      <th className="py-2.5 px-3">ID</th>
                      <th className="py-2.5 px-3">User</th>
                      <th className="py-2.5 px-3">Net</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Receiving Address</th>
                      <th className="py-2.5 px-3">Status / Payout TXID</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {withdrawalsList.map((w: any) => (
                      <tr key={w.id} className="hover:bg-slate-900/50">
                        <td className="py-3 px-3 text-slate-400">#{w.id}</td>
                        <td className="py-3 px-3 text-white font-sans">
                          {w.user_email}
                        </td>
                        <td className="py-3 px-3 text-amber-300">{w.network}</td>
                        <td className="py-3 px-3 font-bold text-white tabular-nums">
                          ${w.amount.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 max-w-[130px] truncate text-slate-300" title={w.receiving_address}>
                          {w.receiving_address}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              w.status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : w.status === 'rejected'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {w.status}
                          </span>
                          {w.payout_txid && (
                            <span className="block text-[10px] text-emerald-400 truncate max-w-[120px]" title={w.payout_txid}>
                              TX: {w.payout_txid}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right space-x-1.5 font-sans">
                          {w.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => {
                                  setApproveWithdrawalModal(w);
                                  setPayoutTxidInput('');
                                }}
                                className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                              >
                                Record Payout
                              </button>
                              <button
                                onClick={() => {
                                  setRejectWithdrawalModal(w);
                                  setRejectWithdrawalReason('');
                                }}
                                className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs border border-rose-500/30"
                              >
                                Reject & Refund
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400">Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* 5. INVESTMENT PLANS */}
          {/* ============================================================= */}
          {activeTab === 'plans' && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-400" />
                  Seven Configured Investment Tiers
                </h2>
                <p className="text-xs text-slate-400">
                  Verification: Starter ($10) plan is permanently deleted and excluded from all definitions. Exactly 7 tiers are active.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plansList.map((plan) => (
                  <div key={plan.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-base">{plan.name}</span>
                      <span className="text-base font-extrabold text-amber-400 font-mono">${plan.amount} USDT</span>
                    </div>
                    <div className="text-xs text-slate-400 space-y-1">
                      <p>Badge: <span className="text-slate-200">{plan.badge_text}</span></p>
                      <p>Daily Rate: <span className="text-emerald-400 font-mono">{(plan.daily_profit_rate * 100).toFixed(0)}%</span></p>
                      <p>Description: <span className="text-slate-300">{plan.description}</span></p>
                      <p className="text-[10px] text-slate-500 font-mono">ID: {plan.id} · Order: #{plan.sort_order}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* 6. TRANSACTIONS LEDGER */}
          {/* ============================================================= */}
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-400" />
                    Complete Master Transactions Ledger
                  </h2>
                  <p className="text-xs text-slate-400">
                    Audit-compliant financial history across all user balances.
                  </p>
                </div>
                <button
                  onClick={fetchTransactions}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">User</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-right">Balance After</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {transactionsList.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-900/50">
                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                          {new Date(t.created_at).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-white font-sans">{t.user_email}</td>
                        <td className="py-2.5 px-3 text-amber-300 font-bold uppercase">{t.type}</td>
                        <td className="py-2.5 px-3 text-slate-300 font-sans max-w-[200px] truncate">{t.description}</td>
                        <td
                          className={`py-2.5 px-3 text-right font-bold tabular-nums ${
                            t.amount > 0 ? 'text-emerald-400' : 'text-slate-300'
                          }`}
                        >
                          {t.amount > 0 ? '+' : ''}${t.amount.toFixed(2)}
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
            </div>
          )}

          {/* ============================================================= */}
          {/* 7. REFERRAL RECORDS */}
          {/* ============================================================= */}
          {activeTab === 'referrals' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-sky-400" />
                  Referral Relationships & 8% Bounties
                </h2>
                <p className="text-xs text-slate-400">
                  Inspect referral relationships and verify that 8% bonuses were awarded strictly once per referee.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-200 mb-2">Referral Reward Payouts (8%)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Referrer</th>
                        <th className="py-2 px-3">Referee</th>
                        <th className="py-2 px-3">Investment</th>
                        <th className="py-2 px-3">Rate</th>
                        <th className="py-2 px-3 text-right">Commission</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {referralsData.rewards.map((rw) => (
                        <tr key={rw.id}>
                          <td className="py-2.5 px-3 text-slate-400">{new Date(rw.created_at).toLocaleDateString()}</td>
                          <td className="py-2.5 px-3 text-white font-sans">{rw.referrer_email}</td>
                          <td className="py-2.5 px-3 text-slate-300 font-sans">{rw.referee_email}</td>
                          <td className="py-2.5 px-3 text-white">${rw.investment_amount.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-amber-300">8%</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-400 tabular-nums">
                            +${rw.reward_amount.toFixed(2)} USDT
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* 8. DAILY PROFIT SETTINGS */}
          {/* ============================================================= */}
          {activeTab === 'profit-settings' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  Daily Profit Settings
                </h2>
                <p className="text-xs text-slate-400">
                  Configure the platform demonstration return rate (configured at 1% daily).
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Daily Profit Rate (Decimal, e.g. 0.01 for 1%)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={systemSettings.daily_profit_rate || '0.01'}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, daily_profit_rate: e.target.value })
                    }
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Displays in dashboard as {(parseFloat(systemSettings.daily_profit_rate || '0.01') * 100).toFixed(0)}% daily return.
                  </p>
                </div>

                <button
                  type="submit"
                  className="py-2.5 px-4 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition"
                >
                  Save Daily Profit Settings
                </button>
              </form>
            </div>
          )}

          {/* ============================================================= */}
          {/* 9. BONUS SETTINGS */}
          {/* ============================================================= */}
          {activeTab === 'bonus-settings' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Gift className="w-5 h-5 text-yellow-300" />
                  Bonus & Reward Configuration
                </h2>
                <p className="text-xs text-slate-400">
                  Adjust referral commission parameters and daily loyalty check-in bonuses.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Referral Bonus Rate (Decimal, 0.08 = 8%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={systemSettings.referral_bonus_rate || '0.08'}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, referral_bonus_rate: e.target.value })
                    }
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono outline-none"
                  />
                  <span className="text-[11px] text-slate-400">
                    Configured rate is 8% for referee's first qualifying investment.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Daily Loyalty Check-In Bonus (USDT)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={systemSettings.daily_bonus_amount || '0.50'}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, daily_bonus_amount: e.target.value })
                    }
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="py-2.5 px-4 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition"
                >
                  Save Bonus Settings
                </button>
              </form>
            </div>
          )}

          {/* ============================================================= */}
          {/* 10. SYSTEM SETTINGS */}
          {/* ============================================================= */}
          {activeTab === 'system-settings' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5 text-amber-400" />
                  System Deposit Addresses & Contacts
                </h2>
                <p className="text-xs text-slate-400">
                  Update live USDT deposit addresses for TRC20 and BEP20 networks.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    USDT TRC20 Deposit Address
                  </label>
                  <input
                    type="text"
                    value={systemSettings.trc20_deposit_address || ''}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, trc20_deposit_address: e.target.value })
                    }
                    placeholder="TX7VwP64oYF2pKQkKqH82vR9aC3wZ48zX1"
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    USDT BEP20 Deposit Address
                  </label>
                  <input
                    type="text"
                    value={systemSettings.bep20_deposit_address || ''}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, bep20_deposit_address: e.target.value })
                    }
                    placeholder="0x71C8364f3B914EDeb5371602178229F2572183c5"
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Min Deposit (USDT)
                    </label>
                    <input
                      type="number"
                      value={systemSettings.min_deposit || '30'}
                      onChange={(e) =>
                        setSystemSettings({ ...systemSettings, min_deposit: e.target.value })
                      }
                      className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Min Withdrawal (USDT)
                    </label>
                    <input
                      type="number"
                      value={systemSettings.min_withdrawal || '10'}
                      onChange={(e) =>
                        setSystemSettings({ ...systemSettings, min_withdrawal: e.target.value })
                      }
                      className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Support Telegram Username
                  </label>
                  <input
                    type="text"
                    value={systemSettings.support_telegram || '@BOYASupport'}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, support_telegram: e.target.value })
                    }
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="py-2.5 px-4 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition"
                >
                  Save System Configurations
                </button>
              </form>
            </div>
          )}

          {/* ============================================================= */}
          {/* 11. AUDIT TRAIL */}
          {/* ============================================================= */}
          {activeTab === 'audit-trail' && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-400" />
                    Administrative Actions Audit Trail
                  </h2>
                  <p className="text-xs text-slate-400">
                    Immutable log of all deposit approvals, payouts, user adjustments, and system modifications.
                  </p>
                </div>
                <button
                  onClick={fetchAuditLogs}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Admin</th>
                      <th className="py-2 px-3">Action</th>
                      <th className="py-2 px-3">Entity</th>
                      <th className="py-2 px-3">Details</th>
                      <th className="py-2 px-3">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {auditLogs.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-900/50">
                        <td className="py-2.5 px-3 text-slate-400">{new Date(l.created_at).toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-amber-300">
                          <span className="inline-flex items-center gap-1">
                            <Shield className="w-3 h-3 text-amber-400" />
                            <span>{showAdminEmail ? l.admin_email : 'Authorized Admin [Hidden]'}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-white">{l.action}</td>
                        <td className="py-2.5 px-3 text-slate-400">{l.entity_type} {l.entity_id ? `#${l.entity_id}` : ''}</td>
                        <td className="py-2.5 px-3 text-slate-300 font-sans max-w-xs">{l.details}</td>
                        <td className="py-2.5 px-3 text-slate-500">{l.ip_address || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* REJECT DEPOSIT MODAL */}
      {/* ================================================================= */}
      {rejectDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#091124] border border-rose-500/50 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-rose-300">
              Reject Deposit Request #{rejectDepositModal.id}
            </h3>
            <p className="text-xs text-slate-300">
              Amount: <strong className="text-white">${rejectDepositModal.amount} USDT</strong> · TXID: <span className="font-mono text-slate-400">{rejectDepositModal.txid}</span>
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Reason for Rejection
              </label>
              <textarea
                rows={3}
                required
                value={rejectDepositReason}
                onChange={(e) => setRejectDepositReason(e.target.value)}
                placeholder="e.g. Unconfirmed TXID hash, wrong destination address, or insufficient funds received."
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRejectDepositModal(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectDeposit}
                className="flex-1 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* APPROVE WITHDRAWAL MODAL (REQUIRES REAL PAYOUT TXID) */}
      {/* ================================================================= */}
      {approveWithdrawalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#091124] border border-emerald-500/50 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-emerald-300">
              Approve Withdrawal #{approveWithdrawalModal.id}
            </h3>
            <p className="text-xs text-slate-300">
              Payout: <strong className="text-white">${approveWithdrawalModal.amount} USDT ({approveWithdrawalModal.network})</strong>
              <br />
              Destination: <span className="font-mono text-amber-300 text-[11px]">{approveWithdrawalModal.receiving_address}</span>
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Enter Blockchain Payout TXID (Required)
              </label>
              <input
                type="text"
                required
                value={payoutTxidInput}
                onChange={(e) => setPayoutTxidInput(e.target.value)}
                placeholder="Paste the broadcasted payout hash"
                className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setApproveWithdrawalModal(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveWithdrawal}
                className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
              >
                Confirm Payout Sent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* REJECT WITHDRAWAL MODAL (REFUNDS RESERVED BALANCE) */}
      {/* ================================================================= */}
      {rejectWithdrawalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#091124] border border-rose-500/50 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-rose-300">
              Reject Withdrawal #{rejectWithdrawalModal.id}
            </h3>
            <p className="text-xs text-slate-300">
              Reserved funds of <strong className="text-white">${rejectWithdrawalModal.amount} USDT</strong> will be refunded to the user balance immediately.
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Reason for Rejection
              </label>
              <textarea
                rows={3}
                required
                value={rejectWithdrawalReason}
                onChange={(e) => setRejectWithdrawalReason(e.target.value)}
                placeholder="e.g. Invalid receiving wallet format, suspicious activity, or network congestion."
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRejectWithdrawalModal(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectWithdrawal}
                className="flex-1 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs"
              >
                Confirm Rejection & Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* ADJUST BALANCE MODAL */}
      {/* ================================================================= */}
      {adjustBalanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#091124] border border-amber-500/50 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-amber-300">
              Adjust Balance for {adjustBalanceModal.email}
            </h3>
            <p className="text-xs text-slate-300">
              Current Balance: <strong className="text-white font-mono">${adjustBalanceModal.available_balance.toFixed(2)} USDT</strong>
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Adjustment Amount (+ for credit, - for debit)
              </label>
              <input
                type="number"
                step="any"
                required
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="e.g. 100 or -50"
                className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Administrative Reason
              </label>
              <input
                type="text"
                required
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g. Manual OTC deposit verification, bonus grant"
                className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAdjustBalanceModal(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdjustBalance}
                className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ================================================================= */}
      {/* MANAGE USER INVESTMENTS MODAL */}
      {/* ================================================================= */}
      {/* ================================================================= */}
      {/* MANAGE USER DAILY PROFIT & INVESTMENTS MODAL */}
      {/* ================================================================= */}
      {manageInvestmentsUser && (() => {
        const userActiveInvestments = userInvestments.filter((inv) => inv.status === 'active');
        const userTotalInvested = userActiveInvestments.reduce((acc, inv) => acc + (inv.amount || 0), 0);
        const userTotalDailyProfit = userActiveInvestments.reduce(
          (acc, inv) => acc + ((inv.amount || 0) * (inv.daily_profit_rate || 0.01)),
          0
        );
        const userTotalEarned = userInvestments.reduce((acc, inv) => acc + (inv.total_earned || 0), 0);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-3xl my-8 rounded-2xl bg-[#091124] border border-emerald-500/50 p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    Manage Daily Profit & Investments: {manageInvestmentsUser.email}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    User #{manageInvestmentsUser.id} · Phone: {manageInvestmentsUser.phone} · Referral: {manageInvestmentsUser.referral_code}
                  </p>
                </div>
                <button
                  onClick={() => setManageInvestmentsUser(null)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* 4 Summary Stat Cards for this User */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/40">
                  <span className="text-[11px] text-emerald-300 font-semibold block">User Daily Profit</span>
                  <p className="text-xl font-black text-emerald-400 font-mono mt-0.5 tabular-nums">
                    +${userTotalDailyProfit.toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-400">USDT / Every 24h</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Active Capital</span>
                  <p className="text-xl font-bold text-amber-300 font-mono mt-0.5 tabular-nums">
                    ${userTotalInvested.toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-400">{userActiveInvestments.length} Active Plans</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Total Settled Profit</span>
                  <p className="text-xl font-bold text-white font-mono mt-0.5 tabular-nums">
                    +${userTotalEarned.toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-400">Paid to User</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Available Balance</span>
                  <p className="text-xl font-bold text-white font-mono mt-0.5 tabular-nums">
                    ${manageInvestmentsUser.available_balance.toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-400">Wallet USDT</span>
                </div>
              </div>

              {/* Quick Daily Profit Override Box */}
              <form onSubmit={handleQuickUpdateDailyProfit} className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/30 via-slate-900 to-[#0c1836] border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Quick Daily Profit Override for This User</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Instant Rate Calculation</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] text-slate-300 mb-1">
                      Set Daily Profit Rate (e.g. 0.01 = 1%, 0.02 = 2%)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={quickDailyProfitRate}
                      onChange={(e) => {
                        setQuickDailyProfitRate(e.target.value);
                        const r = parseFloat(e.target.value);
                        if (!isNaN(r) && userTotalInvested > 0) {
                          setQuickTargetDailyDollars((userTotalInvested * r).toFixed(2));
                        }
                      }}
                      placeholder="0.01"
                      className="w-full p-2 rounded-lg bg-[#070d19] border border-slate-700 text-xs text-white font-mono outline-none"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-[11px] text-slate-300 mb-1">
                      Or Target Daily Profit ($/day)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={quickTargetDailyDollars}
                      onChange={(e) => {
                        setQuickTargetDailyDollars(e.target.value);
                        const d = parseFloat(e.target.value);
                        if (!isNaN(d) && userTotalInvested > 0) {
                          setQuickDailyProfitRate((d / userTotalInvested).toFixed(4));
                        }
                      }}
                      placeholder="e.g. 5.00"
                      className="w-full p-2 rounded-lg bg-[#070d19] border border-slate-700 text-xs text-white font-mono outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <button
                      type="submit"
                      disabled={quickUpdatingProfit}
                      className="w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {quickUpdatingProfit ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Save Profit</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>

              {/* List of User's Investment Contracts */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                  Individual Investment Contracts ({userInvestments.length})
                </h4>

                {userInvestments.length === 0 ? (
                  <div className="p-6 rounded-xl bg-slate-900/60 border border-dashed border-slate-800 text-center text-xs text-slate-400">
                    This user currently has no investment contracts. Use the form below to grant a new contract.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {userInvestments.map((inv) => {
                      const isEditing = editingInv?.id === inv.id;
                      return (
                        <div
                          key={inv.id}
                          className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2"
                        >
                          {isEditing ? (
                            <div className="space-y-3 p-3 bg-[#070d19] rounded-xl border border-emerald-500/40">
                              <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                                Edit Investment Contract #{inv.id}
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                <div>
                                  <label className="text-[10px] text-slate-400">Plan Name</label>
                                  <input
                                    type="text"
                                    value={editPlanName}
                                    onChange={(e) => setEditPlanName(e.target.value)}
                                    className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-xs text-white"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-400">Principal ($)</label>
                                  <input
                                    type="number"
                                    step="any"
                                    value={editAmount}
                                    onChange={(e) => {
                                      setEditAmount(e.target.value);
                                      const p = parseFloat(e.target.value);
                                      const r = parseFloat(editDailyRate);
                                      if (!isNaN(p) && !isNaN(r)) {
                                        setEditDailyDollars((p * r).toFixed(2));
                                      }
                                    }}
                                    className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-emerald-400 font-semibold">Daily Rate (0.01 = 1%)</label>
                                  <input
                                    type="number"
                                    step="0.001"
                                    value={editDailyRate}
                                    onChange={(e) => {
                                      setEditDailyRate(e.target.value);
                                      const r = parseFloat(e.target.value);
                                      const p = parseFloat(editAmount);
                                      if (!isNaN(r) && !isNaN(p)) {
                                        setEditDailyDollars((p * r).toFixed(2));
                                      }
                                    }}
                                    className="w-full p-2 rounded bg-slate-900 border border-emerald-500/50 text-xs text-emerald-300 font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-emerald-400 font-semibold">Daily Return ($/day)</label>
                                  <input
                                    type="number"
                                    step="any"
                                    value={editDailyDollars}
                                    onChange={(e) => {
                                      setEditDailyDollars(e.target.value);
                                      const d = parseFloat(e.target.value);
                                      const p = parseFloat(editAmount);
                                      if (!isNaN(d) && !isNaN(p) && p > 0) {
                                        setEditDailyRate((d / p).toFixed(4));
                                      }
                                    }}
                                    className="w-full p-2 rounded bg-slate-900 border border-emerald-500/50 text-xs text-emerald-300 font-mono font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-400">Total Settled Profit ($)</label>
                                  <input
                                    type="number"
                                    step="any"
                                    value={editTotalEarned}
                                    onChange={(e) => setEditTotalEarned(e.target.value)}
                                    className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-400">Contract Status</label>
                                  <select
                                    value={editStatus}
                                    onChange={(e) => setEditStatus(e.target.value)}
                                    className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-xs text-white"
                                  >
                                    <option value="active">Active</option>
                                    <option value="completed">Completed</option>
                                  </select>
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 pt-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingInv(null)}
                                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={handleSaveInvestmentEdit}
                                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                                >
                                  Save Contract Profit & Details
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white text-sm">
                                    {inv.plan_name} Tier Contract
                                  </span>
                                  <span
                                    className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase ${
                                      inv.status === 'active'
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-slate-700 text-slate-400'
                                    }`}
                                  >
                                    {inv.status}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                  Principal: <strong className="text-white">${inv.amount}</strong> · Rate:{' '}
                                  <span className="text-amber-300 font-bold">
                                    {(inv.daily_profit_rate * 100).toFixed(1)}%/day
                                  </span>{' '}
                                  (<strong>+${(inv.amount * inv.daily_profit_rate).toFixed(2)}/day</strong>) · Earned:{' '}
                                  <span className="text-emerald-400 font-bold">+${inv.total_earned.toFixed(2)}</span>
                                </p>
                                <span className="text-[10px] text-slate-500">
                                  Started: {new Date(inv.created_at).toLocaleString()}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 self-end sm:self-center font-sans">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingInv(inv);
                                    setEditPlanName(inv.plan_name);
                                    setEditAmount(String(inv.amount));
                                    setEditDailyRate(String(inv.daily_profit_rate));
                                    setEditDailyDollars((inv.amount * inv.daily_profit_rate).toFixed(2));
                                    setEditTotalEarned(String(inv.total_earned));
                                    setEditStatus(inv.status);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span>Edit Daily Profit</span>
                                </button>
                                {inv.status === 'active' && (
                                  <button
                                    type="button"
                                    onClick={() => handleCancelRefundInvestment(inv.id)}
                                    className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold"
                                    title="Cancel contract and refund principal to user balance"
                                  >
                                    Cancel & Refund
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Grant / Assign New Investment Plan */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <h4 className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                  Grant New Investment Plan
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Select Tier</label>
                    <select
                      value={assignPlanId}
                      onChange={(e) => setAssignPlanId(e.target.value)}
                      className="w-full py-2 px-2.5 rounded-lg bg-[#070d19] border border-slate-700 text-xs text-white outline-none"
                    >
                      <option value="silver">Silver — $30</option>
                      <option value="super">Super — $50</option>
                      <option value="gold">Gold — $100</option>
                      <option value="platinum">Platinum — $200</option>
                      <option value="bright">Bright — $500</option>
                      <option value="shining">Shining — $1,000</option>
                      <option value="sunrise">Sunrise — $2,000</option>
                      <option value="custom">Custom Tier</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Custom Amount (Optional)</label>
                    <input
                      type="number"
                      step="any"
                      value={assignCustomAmount}
                      onChange={(e) => setAssignCustomAmount(e.target.value)}
                      placeholder="Leave empty for tier default"
                      className="w-full py-2 px-2.5 rounded-lg bg-[#070d19] border border-slate-700 text-xs text-white outline-none font-mono"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleAssignInvestment}
                      className="w-full py-2 px-3 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition"
                    >
                      Assign Contract
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setManageInvestmentsUser(null)}
                  className="py-2 px-5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Close Window
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
