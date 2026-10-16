import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', showSubtitle = false, onClick }) => {
  const sizeClasses = {
    sm: {
      emblem: 'w-7 h-7',
      text: 'text-lg',
      sub: 'text-[9px]',
    },
    md: {
      emblem: 'w-9 h-9',
      text: 'text-xl',
      sub: 'text-[10px]',
    },
    lg: {
      emblem: 'w-12 h-12',
      text: 'text-2xl',
      sub: 'text-xs',
    },
    xl: {
      emblem: 'w-16 h-16',
      text: 'text-4xl',
      sub: 'text-sm',
    },
  }[size];

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-3 select-none ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* 3D Animated Gold Crest Emblem */}
      <div className="relative group shrink-0">
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-600 rounded-full blur-[6px] opacity-70 group-hover:opacity-100 transition duration-500"></div>
        <div className={`${sizeClasses.emblem} relative rounded-full overflow-hidden border border-amber-300/80 shadow-lg shadow-amber-500/20 bg-[#0b1329] flex items-center justify-center`}>
          <img
            src="/src/assets/images/boya_gold_emblem_1792122600110.jpg"
            alt="BOYA Gold Seal"
            className="w-full h-full object-cover transform scale-110 group-hover:rotate-12 transition-transform duration-700 ease-out"
            referrerPolicy="no-referrer"
            onError={(e) => {
              // Fallback if image load fails
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          {/* Fallback Icon if image hidden */}
          <span className="font-serif font-black text-amber-400 absolute text-sm">B</span>
        </div>
      </div>

      {/* Moving Text & Shimmer Brand Typography */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span
            style={{ fontFamily: "'Cinzel', 'Outfit', serif" }}
            className={`${sizeClasses.text} font-black tracking-wider gold-shimmer-text whitespace-nowrap`}
          >
            BOYA.COM
          </span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping opacity-75"></span>
        </div>
        {showSubtitle && (
          <span className={`${sizeClasses.sub} text-amber-200/70 font-medium tracking-widest uppercase`}>
            Premier Financial Platform
          </span>
        )}
      </div>
    </div>
  );
};
