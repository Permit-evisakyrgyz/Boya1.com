import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  CheckCircle2,
  Copy,
  ExternalLink,
  X,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Share2
} from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';
import { BrandLogo } from './BrandLogo';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isAndroid, isIOS, install } = usePWAInstall();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const appUrl = window.location.origin;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#091124] border border-amber-500/30 p-6 sm:p-8 shadow-2xl shadow-amber-500/10 text-white space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="flex justify-center">
            <BrandLogo size="md" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Direct Android Installation (No Play Store Needed)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Install BOYA.COM on Android
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You can install and run BOYA directly on your phone as a standalone Android app with full-screen experience and zero Play Store restrictions.
          </p>
        </div>

        {/* Status or Direct Install Action */}
        {isInstalled ? (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-1">
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>BOYA App is already installed!</span>
            </div>
            <p className="text-xs text-slate-300">
              You are currently viewing the installed standalone application.
            </p>
          </div>
        ) : isInstallable ? (
          <div className="space-y-3">
            <button
              onClick={handleInstallClick}
              className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-slate-950 hover:brightness-110 active:scale-[0.98] transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25"
            >
              <Download className="w-5 h-5" />
              <span>Tap to Install App on Phone Now</span>
            </button>
            <p className="text-[11px] text-center text-slate-400">
              Android will prompt you to add BOYA to your home screen and app launcher.
            </p>
          </div>
        ) : null}

        {/* Step-by-Step Instructions for Android Side Installation */}
        <div className="space-y-3">
          <h3 className="text-xs uppercase font-mono font-bold tracking-wider text-amber-400 flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            <span>How to install directly from your phone browser:</span>
          </h3>

          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs flex items-start gap-3">
              <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <div>
                <strong className="text-white">Open this link in Chrome on your Android phone</strong>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Make sure you are using Google Chrome or Samsung Internet browser.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs flex items-start gap-3">
              <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <div>
                <strong className="text-white">Tap the 3 dots (⋮) menu in top-right of Chrome</strong>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Tap the Chrome menu button at the top right of your browser screen.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs flex items-start gap-3">
              <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <div>
                <strong className="text-white">Tap "Install app" or "Add to Home screen"</strong>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Android will create an authentic native app package (WebAPK) on your home screen with the official gold BOYA logo!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Copy App Link Box */}
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-amber-500/20 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-semibold text-white">Your Direct App Install Link:</span>
            {copied && <span className="text-emerald-400 text-[11px] font-bold">Copied!</span>}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={appUrl}
              className="flex-1 bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs font-mono text-amber-300 select-all focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>
          </div>
        </div>

        {/* PWABuilder / Standalone APK Packaging option */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Want a physical .APK file to share?
            </span>
            <a
              href={`https://www.pwabuilder.com?site=${encodeURIComponent(appUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold text-[11px]"
            >
              <span>Build .APK on PWABuilder</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Since your manifest and icons are configured, you can generate a standalone `.apk` package file in 1 minute on PWABuilder and send the APK file directly to your users over WhatsApp, Telegram, or Google Drive.
          </p>
        </div>

        {/* Footer Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs transition"
        >
          Close
        </button>
      </div>
    </div>
  );
};
