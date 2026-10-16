import React from 'react';
import { BrandLogo } from './BrandLogo';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Securing encrypted financial session...' }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070d19] text-slate-100 p-6">
      {/* Background ambient gold aura */}
      <div className="absolute w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

      <div className="relative z-10 flex flex-col items-center max-w-sm text-center space-y-6">
        <BrandLogo size="xl" showSubtitle={true} />

        {/* Elegant loading bar */}
        <div className="w-64 h-1.5 bg-slate-800/80 rounded-full overflow-hidden border border-amber-500/20 shadow-inner">
          <div className="h-full bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-600 rounded-full animate-[goldShimmer_2s_infinite]"></div>
        </div>

        <p className="text-sm font-medium text-amber-200/80 tracking-wide font-mono">
          {message}
        </p>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>USDT Escrow Core</span>
          <span>·</span>
          <span>SQLite Ledger Verified</span>
          <span>·</span>
          <span>256-Bit Protection</span>
        </div>
      </div>
    </div>
  );
};
