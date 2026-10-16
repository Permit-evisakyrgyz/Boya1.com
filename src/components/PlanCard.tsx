import React, { useState } from 'react';
import {
  Shield,
  Zap,
  Crown,
  Sparkles,
  Sun,
  Flame,
  RotateCw,
  CheckCircle2,
  Lock,
  ArrowRight,
  Gem,
} from 'lucide-react';
import { InvestmentPlan } from '../types';

interface PlanCardProps {
  plan: InvestmentPlan;
  userBalance?: number;
  onSelect: (plan: InvestmentPlan) => void;
  isInvested?: boolean;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  userBalance = 0,
  onSelect,
  isInvested = false,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  // Distinctive emblems and luxury color schemes for all 7 plans
  const planVisuals: Record<
    string,
    {
      icon: React.ReactNode;
      borderClass: string;
      accentBg: string;
      glowColor: string;
      tagColor: string;
      pillGrad: string;
      dailyYield: number;
    }
  > = {
    silver: {
      icon: <Shield className="w-6 h-6 text-slate-200" />,
      borderClass: 'border-slate-500/40 hover:border-slate-300',
      accentBg: 'bg-gradient-to-b from-slate-800/80 to-slate-900/90',
      glowColor: 'shadow-slate-500/10 hover:shadow-slate-400/20',
      tagColor: 'text-slate-300 border-slate-600',
      pillGrad: 'from-slate-400 to-slate-200',
      dailyYield: Number((plan.amount * 0.01).toFixed(2)),
    },
    super: {
      icon: <Zap className="w-6 h-6 text-sky-300" />,
      borderClass: 'border-sky-500/40 hover:border-sky-300',
      accentBg: 'bg-gradient-to-b from-sky-950/70 to-slate-900/90',
      glowColor: 'shadow-sky-500/15 hover:shadow-sky-400/30',
      tagColor: 'text-sky-300 border-sky-600/60',
      pillGrad: 'from-sky-400 to-cyan-200',
      dailyYield: Number((plan.amount * 0.01).toFixed(2)),
    },
    gold: {
      icon: <Crown className="w-6 h-6 text-amber-300" />,
      borderClass: 'border-amber-500/50 hover:border-yellow-300 ring-1 ring-amber-500/30',
      accentBg: 'bg-gradient-to-b from-amber-950/70 to-slate-900/95',
      glowColor: 'shadow-amber-500/20 hover:shadow-yellow-400/40',
      tagColor: 'text-amber-300 border-amber-500/60',
      pillGrad: 'from-amber-400 via-yellow-300 to-amber-500',
      dailyYield: Number((plan.amount * 0.01).toFixed(2)),
    },
    platinum: {
      icon: <Gem className="w-6 h-6 text-emerald-300" />,
      borderClass: 'border-emerald-500/40 hover:border-emerald-300',
      accentBg: 'bg-gradient-to-b from-emerald-950/60 to-slate-900/90',
      glowColor: 'shadow-emerald-500/15 hover:shadow-emerald-400/30',
      tagColor: 'text-emerald-300 border-emerald-600/60',
      pillGrad: 'from-emerald-400 to-teal-200',
      dailyYield: Number((plan.amount * 0.01).toFixed(2)),
    },
    bright: {
      icon: <Sun className="w-6 h-6 text-violet-300" />,
      borderClass: 'border-purple-500/40 hover:border-violet-300',
      accentBg: 'bg-gradient-to-b from-purple-950/60 to-slate-900/90',
      glowColor: 'shadow-purple-500/15 hover:shadow-violet-400/30',
      tagColor: 'text-violet-300 border-purple-500/60',
      pillGrad: 'from-purple-400 to-pink-300',
      dailyYield: Number((plan.amount * 0.01).toFixed(2)),
    },
    shining: {
      icon: <Sparkles className="w-6 h-6 text-yellow-300" />,
      borderClass: 'border-yellow-400/60 hover:border-yellow-200 ring-1 ring-yellow-400/40',
      accentBg: 'bg-gradient-to-b from-yellow-950/70 to-slate-900/95',
      glowColor: 'shadow-yellow-500/25 hover:shadow-yellow-300/45',
      tagColor: 'text-yellow-200 border-yellow-400/70',
      pillGrad: 'from-yellow-300 via-amber-200 to-yellow-500',
      dailyYield: Number((plan.amount * 0.01).toFixed(2)),
    },
    sunrise: {
      icon: <Flame className="w-6 h-6 text-rose-300" />,
      borderClass: 'border-rose-500/50 hover:border-amber-300 ring-1 ring-rose-500/40',
      accentBg: 'bg-gradient-to-b from-rose-950/70 via-amber-950/50 to-slate-900/95',
      glowColor: 'shadow-rose-500/20 hover:shadow-amber-400/40',
      tagColor: 'text-rose-300 border-rose-500/60',
      pillGrad: 'from-rose-400 via-amber-300 to-yellow-200',
      dailyYield: Number((plan.amount * 0.01).toFixed(2)),
    },
  };

  const visual = planVisuals[plan.id.toLowerCase()] || planVisuals.gold;
  const canAfford = userBalance >= plan.amount;

  return (
    <div className="relative group perspective-1000 w-full min-h-[460px]">
      <div
        className={`w-full h-full duration-700 transform-style-3d transition-transform ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* ================================================================= */}
        {/* FRONT SIDE OF CARD */}
        {/* ================================================================= */}
        <div
          className={`absolute inset-0 backface-hidden rounded-2xl border ${visual.borderClass} ${visual.accentBg} p-6 flex flex-col justify-between shadow-xl ${visual.glowColor} transition-all duration-300 hover:-translate-y-1`}
        >
          {/* Top Row: Emblem & Plan Name */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-900/90 border border-slate-700/80 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                  {visual.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    {plan.name}
                  </h3>
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    {plan.badge_text || 'Tier Plan'}
                  </span>
                </div>
              </div>

              {/* Flip Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(true);
                }}
                title="Inspect Security Seal & Details"
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-amber-300 transition-colors border border-slate-700/60 flex items-center gap-1 text-xs"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Seal</span>
              </button>
            </div>

            {/* Price Badge */}
            <div className="my-5 pb-4 border-b border-slate-800/80">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white font-mono tracking-tight tabular-nums">
                  ${plan.amount.toLocaleString()}
                </span>
                <span className="text-xs uppercase font-mono text-slate-400">USDT</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                {plan.description}
              </p>
            </div>

            {/* Rate Specs List */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-300 py-1">
                <span className="text-slate-400">Daily Return Rate:</span>
                <span className="font-mono font-bold text-amber-400 text-sm">
                  {(plan.daily_profit_rate * 100).toFixed(0)}% / Day
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-300 py-1 border-t border-slate-800/40">
                <span className="text-slate-400">Estimated Daily Yield:</span>
                <span className="font-mono font-semibold text-emerald-400 tabular-nums">
                  +${visual.dailyYield.toFixed(2)} USDT
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-300 py-1 border-t border-slate-800/40">
                <span className="text-slate-400">Referral Commission:</span>
                <span className="font-mono font-semibold text-yellow-300">
                  8% Eligible
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-300 py-1 border-t border-slate-800/40">
                <span className="text-slate-400">Contract Duration:</span>
                <span className="font-mono text-slate-300">
                  {plan.duration_days} Days
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Action Area */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col gap-2">
            {isInvested && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-amber-300 font-medium py-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Active in your portfolio</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => onSelect(plan)}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg ${
                canAfford
                  ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-slate-950 hover:brightness-110 active:scale-[0.98]'
                  : 'bg-slate-800 text-slate-400 hover:text-amber-300 border border-slate-700/80 hover:border-amber-500/50'
              }`}
            >
              {canAfford ? (
                <>
                  <span>Activate {plan.name} Tier</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>Deposit Funds ($${plan.amount})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* BACK SIDE OF CARD (Decorative Seal & Hallmark) */}
        {/* ================================================================= */}
        <div
          className={`absolute inset-0 backface-hidden rotate-y-180 rounded-2xl border ${visual.borderClass} bg-[#081022] p-6 flex flex-col justify-between shadow-2xl overflow-hidden`}
        >
          {/* Decorative Seal Artwork Background with High Legibility Scrim */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <img
              src="/src/assets/images/card_crest_gold_1792122600282.jpg"
              alt="Decorative Hallmark"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#081022]/95 via-[#0b162e]/90 to-[#081022]/98 pointer-events-none"></div>

          {/* Card Back Content */}
          <div className="relative z-10">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-widest">
                BOYA Financial Hallmark
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(false);
                }}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Return to card front"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 text-center">
              <div className="inline-block p-3 rounded-full bg-amber-500/10 border border-amber-400/30 mb-2">
                <Crown className="w-8 h-8 text-amber-400 mx-auto" />
              </div>
              <h4 className="text-lg font-bold text-white tracking-wide">
                {plan.name} Tier Certificate
              </h4>
              <p className="text-xs text-amber-200/70 font-mono mt-0.5">
                Serial: BY-{plan.id.toUpperCase()}-2026
              </p>
            </div>

            <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 space-y-2 text-xs text-slate-300 text-left">
              <div className="flex justify-between">
                <span className="text-slate-400">Demonstration Yield:</span>
                <span className="font-mono text-amber-300">1.0% Daily</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Referral Bounty:</span>
                <span className="font-mono text-emerald-400">8% ($${(plan.amount * 0.08).toFixed(2)})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Settlement Currency:</span>
                <span className="font-mono text-white">USDT (TRC20 / BEP20)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Manual Approval:</span>
                <span className="font-mono text-sky-400">Admin Verified</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 mt-3 text-center italic">
              "Investment returns are not guaranteed. Daily demonstration rate is 1% based on platform parameters."
            </p>
          </div>

          <div className="relative z-10 pt-3 border-t border-slate-800 flex gap-2">
            <button
              type="button"
              onClick={() => setIsFlipped(false)}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => onSelect(plan)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold text-xs hover:brightness-110 flex items-center justify-center gap-1.5"
            >
              <span>Invest ${plan.amount}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
