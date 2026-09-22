import React, { useState } from 'react';
import { Download, Smartphone, X, Share2, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Handle Chrome / Desktop / Android one-click install
  const handleInstall = async () => {
    try {
      setInstalling(true);
      await install();
    } finally {
      setInstalling(false);
    }
  };

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    if (compact) {
      return (
        <button
          onClick={handleInstall}
          disabled={installing}
          title="Download & Install Z-Messenger App"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm transition-all duration-150 active:scale-95"
        >
          <Download className="w-3.5 h-3.5 animate-bounce" />
          <span>Install App</span>
        </button>
      );
    }

    return (
      <button
        onClick={handleInstall}
        disabled={installing}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-amber-500/20 hover:from-amber-600 hover:to-orange-600 transition-all active:scale-95 cursor-pointer"
      >
        <Download className="w-4 h-4 animate-bounce" />
        <span>Install Desktop / Mobile App</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-all ${
            compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-xs font-medium'
          }`}
          title="Install on iPhone / iPad"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                    Z
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Install Z-Messenger</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Add to iPhone or iPad Home Screen</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 font-bold shrink-0">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-slate-800 dark:text-slate-200">Step 1:</strong> Tap the <span className="font-semibold text-amber-600 dark:text-amber-400">Share button</span> at the bottom of Safari.
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 font-bold shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-slate-800 dark:text-slate-200">Step 2:</strong> Scroll down and select <span className="font-semibold text-amber-600 dark:text-amber-400">"Add to Home Screen"</span>.
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 text-xs font-semibold text-white shadow-md shadow-amber-500/20 hover:from-amber-600 hover:to-orange-600"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
