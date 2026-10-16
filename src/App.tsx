import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Shield,
  ArrowRight,
  TrendingUp,
  Users,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  User as UserIcon,
  LogOut,
  HelpCircle,
  Smartphone,
  Download,
} from 'lucide-react';
import { BrandLogo } from './components/BrandLogo';
import { LoadingScreen } from './components/LoadingScreen';
import { AuthModal } from './components/AuthModal';
import { InstallAppModal } from './components/InstallAppModal';
import { PlanCard } from './components/PlanCard';
import { UserDashboard } from './components/UserDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { User, InvestmentPlan, PublicSettings } from './types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string>('');
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [publicSettings, setPublicSettings] = useState<PublicSettings | null>(null);
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);

  // Navigation mode: 'landing', 'dashboard', 'admin'
  const [viewMode, setViewMode] = useState<'landing' | 'dashboard' | 'admin'>('landing');

  // Auth modal
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'admin'>('login');
  const [referralCodeParam, setReferralCodeParam] = useState('');
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [calcAmount, setCalcAmount] = useState<number>(100);

  // Check URL query parameters for referral code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferralCodeParam(ref);
    }
    if (params.get('admin') === 'true' || params.get('portal') === 'admin') {
      setAuthModalMode('admin');
      setAuthModalOpen(true);
    }

    const handleOpenInstall = () => setInstallModalOpen(true);
    window.addEventListener('open-install-modal', handleOpenInstall);
    return () => window.removeEventListener('open-install-modal', handleOpenInstall);
  }, []);

  // Fetch public settings & 7 plans
  const fetchPublicData = async () => {
    try {
      const [setRes, planRes] = await Promise.all([
        fetch('/api/settings/public'),
        fetch('/api/plans'),
      ]);
      if (setRes.ok) {
        const s = await setRes.json();
        setPublicSettings(s);
      }
      if (planRes.ok) {
        const p = await planRes.json();
        setPlans(p.plans || []);
      }
    } catch (e) {
      console.error('Failed to load initial public configurations:', e);
    }
  };

  // Check if session token exists
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('boya_token') || '';
      if (!token) {
        setLoadingInitial(false);
        return;
      }
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setAuthToken(token);
        if (data.user.role === 'admin') {
          setViewMode('admin');
        } else {
          setViewMode('dashboard');
        }
      } else {
        localStorage.removeItem('boya_token');
      }
    } catch (err) {
      console.error('Error authenticating session:', err);
    } finally {
      setTimeout(() => setLoadingInitial(false), 600);
    }
  };

  useEffect(() => {
    fetchPublicData();
    checkAuth();
  }, []);

  const handleAuthSuccess = (user: User, token: string) => {
    setCurrentUser(user);
    setAuthToken(token);
    localStorage.setItem('boya_token', token);
    if (user.role === 'admin') {
      setViewMode('admin');
    } else {
      setViewMode('dashboard');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('boya_token');
    setCurrentUser(null);
    setAuthToken('');
    setViewMode('landing');
  };

  const refreshUser = async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loadingInitial) {
    return <LoadingScreen message="Initializing encrypted financial session..." />;
  }

  return (
    <div className="min-h-screen bg-[#070d19] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* ================================================================= */}
      {/* TOP NAVIGATION BAR (Strict Top Bar Contract: 3 Zones) */}
      {/* ================================================================= */}
      <header className="sticky top-0 z-40 bg-[#070d19]/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 py-3.5">
          {/* Zone 1: Brand Wordmark / Emblem (1-Line) */}
          <div className="shrink-0">
            <BrandLogo
              size="md"
              onClick={() => {
                if (currentUser) {
                  setViewMode(currentUser.role === 'admin' ? 'admin' : 'dashboard');
                } else {
                  setViewMode('landing');
                }
              }}
            />
          </div>

          {/* Zone 2: Navigation Links (Single Line, Concise) */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <button
              onClick={() => {
                if (currentUser) setViewMode('dashboard');
                else setViewMode('landing');
              }}
              className="hover:text-amber-300 transition-colors whitespace-nowrap"
            >
              {currentUser ? 'Investor Dashboard' : 'Home'}
            </button>
            <a href="#seven-plans" className="hover:text-amber-300 transition-colors whitespace-nowrap">
              7 Investment Tiers
            </a>
            <a href="#how-it-works" className="hover:text-amber-300 transition-colors whitespace-nowrap">
              Manual USDT Escrow
            </a>
            <a href="#referral-system" className="hover:text-amber-300 transition-colors whitespace-nowrap">
              8% Referral Program
            </a>
          </nav>

          {/* Zone 3: 1 Primary Action Point */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Install App / APK Button */}
            <button
              onClick={() => setInstallModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-amber-500/40 text-amber-300 hover:bg-amber-500/15 text-xs font-semibold transition shadow-sm active:scale-95"
              title="Install Android App / APK"
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Install App</span>
              <span className="text-[10px] uppercase font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">APK</span>
            </button>

            {currentUser ? (
              <div className="flex items-center gap-2">
                {/* Available Balance Pill */}
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-amber-500/30 text-xs">
                  <Wallet className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-mono font-bold text-white tabular-nums">
                    ${currentUser.available_balance.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400">USDT</span>
                </div>

                {currentUser.role === 'admin' && (
                  <button
                    onClick={() => setViewMode(viewMode === 'admin' ? 'dashboard' : 'admin')}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition whitespace-nowrap"
                  >
                    {viewMode === 'admin' ? 'Investor View' : 'Admin Panel'}
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAuthModalMode('login');
                    setAuthModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:text-white transition whitespace-nowrap"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setAuthModalMode('register');
                    setAuthModalOpen(true);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-xl hover:brightness-110 active:scale-95 transition shadow-md shadow-amber-500/20 whitespace-nowrap"
                >
                  Register Account
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ================================================================= */}
      {/* MAIN CONTENT VIEW ROUTING */}
      {/* ================================================================= */}
      <main className="flex-1">
        {/* VIEW 1: AUTHENTICATED ADMIN DASHBOARD */}
        {currentUser && currentUser.role === 'admin' && viewMode === 'admin' && (
          <AdminDashboard
            adminUser={currentUser}
            token={authToken}
            onLogout={handleLogout}
            onSwitchToUserView={() => setViewMode('dashboard')}
          />
        )}

        {/* VIEW 2: AUTHENTICATED USER DASHBOARD (14 SECTIONS) */}
        {currentUser && viewMode === 'dashboard' && (
          <UserDashboard
            user={currentUser}
            token={authToken}
            onRefreshUser={refreshUser}
            publicSettings={publicSettings}
            onNavigateAdmin={
              currentUser.role === 'admin' ? () => setViewMode('admin') : undefined
            }
          />
        )}

        {/* VIEW 3: PUBLIC LANDING & SHOWCASE (WHEN NOT LOGGED IN OR LANDING SELECTED) */}
        {(!currentUser || viewMode === 'landing') && (
          <div className="space-y-16 pb-20">
            {/* HERO SECTION */}
            <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6">
              {/* Background Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent pointer-events-none blur-3xl"></div>

              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>BOYA.COM · Institutional USDT Investment Core</span>
                  </div>

                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
                    Premium Financial Yields with{' '}
                    <span className="gold-shimmer-text">Absolute Manual Escrow</span>
                  </h1>

                  <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                    Access exactly seven transparent tier plans ranging from $30 up to $2,000. All USDT blockchain deposits and withdrawals are individually audited and manually approved by our financial desk.
                  </p>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-amber-500/20 text-xs text-amber-200/90 max-w-xl mx-auto lg:mx-0">
                    <p className="italic">
                      "Investment returns are not guaranteed. Daily demonstration rate is 1% based on platform parameters."
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                    <button
                      onClick={() => {
                        setAuthModalMode('register');
                        setAuthModalOpen(true);
                      }}
                      className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-slate-950 hover:brightness-110 active:scale-[0.98] transition flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20"
                    >
                      <span>Open Investor Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <a
                      href="#seven-plans"
                      className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-semibold text-sm bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 transition flex items-center justify-center gap-2"
                    >
                      <Layers className="w-4 h-4 text-amber-400" />
                      <span>Inspect 7 Tiers</span>
                    </a>
                  </div>

                  {/* Trust markers */}
                  <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> TRC20 & BEP20 USDT
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 8% Single-Use Referral Bounty
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Zero Automated Drain Risks
                    </span>
                  </div>
                </div>

                {/* Hero Graphic Showcase */}
                <div className="lg:col-span-5 relative">
                  <div className="relative rounded-2xl overflow-hidden border border-amber-500/30 shadow-2xl shadow-amber-500/10 group">
                    <img
                      src="/src/assets/images/investment_banner_hero_1792122600020.jpg"
                      alt="Financial Trading Architecture"
                      className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#070d19] via-transparent to-transparent"></div>
                    <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-amber-400 font-bold">BOYA.COM PROTOCOL</span>
                        <span className="text-emerald-400">Manual Approval Live</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Authoritative SQLite financial ledger protects investor funds with zero client-side overrides.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* SEVEN INVESTMENT PLAN CARDS SECTION */}
            <section id="seven-plans" className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Verified 7-Tier Architecture</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Seven Exclusive Investment Tiers
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  Notice: The legacy $10 Starter tier has been permanently decommissioned. Click "Seal" on any tier card to flip and inspect the official hallmark certificate.
                </p>
              </div>

              {/* INTERACTIVE DAILY PROFIT CARD & CALCULATOR */}
              <div className="mb-12 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-950/40 via-[#0a1628] to-[#070d19] border-2 border-emerald-500/40 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                  {/* Left: Interactive Controls */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>OFFICIAL DAILY PROFIT ENGINE</span>
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                      Daily Profit Calculation Engine
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300">
                      Select any of the 7 official investment tiers to project your estimated daily return at the 1.0% platform rate:
                    </p>

                    {/* Quick Tier Selectors */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {[30, 50, 100, 200, 500, 1000, 2000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setCalcAmount(amt)}
                          className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition ${
                            calcAmount === amt
                              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                              : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          ${amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right: The Daily Profit Metric Display */}
                  <div className="lg:col-span-5 bg-slate-950/80 rounded-2xl border border-emerald-500/30 p-5 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                      <span>Selected Principal</span>
                      <span className="font-mono font-bold text-white text-sm">${calcAmount} USDT</span>
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/40 text-center">
                      <span className="text-xs text-emerald-300 uppercase tracking-wider font-mono font-bold flex items-center justify-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        Daily Profit Yield
                      </span>
                      <p className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono tabular-nums my-1">
                        +${(calcAmount * 0.01).toFixed(2)}
                        <span className="text-sm font-normal text-emerald-300/80 ml-1">USDT / day</span>
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono">1.0% demonstration rate</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-center text-xs font-mono">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-slate-400 text-[10px]">7-Day Yield</span>
                        <p className="font-bold text-emerald-300 mt-0.5">+${(calcAmount * 0.07).toFixed(2)}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-slate-400 text-[10px]">30-Day Yield</span>
                        <p className="font-bold text-amber-300 mt-0.5">+${(calcAmount * 0.30).toFixed(2)}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!currentUser) {
                          setAuthModalMode('register');
                          setAuthModalOpen(true);
                        } else {
                          setViewMode('dashboard');
                        }
                      }}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-amber-500 text-slate-950 font-bold text-xs hover:brightness-110 active:scale-[0.98] transition shadow-lg text-center"
                    >
                      {currentUser ? 'Invest Now in Dashboard' : 'Open Account to Earn Daily Profit'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    userBalance={currentUser?.available_balance || 0}
                    onSelect={(p) => {
                      if (!currentUser) {
                        setAuthModalMode('login');
                        setAuthModalOpen(true);
                      } else {
                        setViewMode('dashboard');
                      }
                    }}
                  />
                ))}
              </div>
            </section>

            {/* HOW IT WORKS: MANUAL APPROVAL ENGINE */}
            <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="p-8 rounded-3xl bg-[#091124] border border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-4">
                  <span className="text-xs uppercase font-mono font-bold text-emerald-400 tracking-wider">
                    Risk-Mitigated Custody
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white">
                    Manual Verification Engine: No Smart Contract Drain Bugs
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Unlike automated systems vulnerable to flash loans and contract exploits, BOYA.COM operates an administrator-verified manual ledger. Every deposit hash is verified on TronScan or BscScan, and every withdrawal is paid individually by the financial desk.
                  </p>

                  <div className="space-y-2 pt-2">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">1</div>
                      <span>Select TRC20 or BEP20 & transfer to official company address</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">2</div>
                      <span>Submit transaction ID (TXID). Duplicate TXIDs are blocked</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">3</div>
                      <span>Desk verifies confirmation on-chain and credits available balance</span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
                    <img
                      src="/src/assets/images/crypto_usdt_nodes_1792122600414.jpg"
                      alt="USDT Network Settlements"
                      className="w-full h-auto object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* REFERRAL SYSTEM SECTION */}
            <section id="referral-system" className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="p-8 rounded-3xl bg-gradient-to-br from-[#0c1a3b] to-[#070d19] border border-amber-500/30 text-center max-w-3xl mx-auto space-y-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white">
                  Earn 8% Commission on Referred Investors
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
                  Receive an instant 8% bounty when your referred friend activates their first qualifying investment tier. Calculated on the exact tier amount and credited straight to your available balance.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setAuthModalMode('register');
                      setAuthModalOpen(true);
                    }}
                    className="px-6 py-3 rounded-xl font-bold text-xs bg-amber-500 text-slate-950 hover:bg-amber-400 transition shadow-lg"
                  >
                    Register to Receive Your Referral Link
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* ================================================================= */}
      {/* FOOTER */}
      {/* ================================================================= */}
      <footer className="bg-[#050a14] border-t border-slate-900 py-8 px-4 sm:px-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <BrandLogo size="sm" />
          </div>
          <p className="text-center sm:text-right">
            © {new Date().getFullYear()} BOYA.COM · All rights reserved.
            <br />
            <span className="text-[11px] text-slate-500">
              Disclaimer: Investment returns are not guaranteed. The 1% rate operates as a configurable demonstration parameter.
            </span>
          </p>
        </div>
      </footer>

      {/* ================================================================= */}
      {/* AUTHENTICATION MODAL */}
      {/* ================================================================= */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        initialMode={authModalMode}
        initialReferralCode={referralCodeParam}
      />

      {/* INSTALL APP / APK MODAL */}
      <InstallAppModal
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
      />
    </div>
  );
}
