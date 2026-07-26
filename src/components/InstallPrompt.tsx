import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Share, X } from 'lucide-react';

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [platform, setPlatform] = useState<'android' | 'ios' | 'other'>('other');

  useEffect(() => {
    // Detect platform
    const ua = navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);

    if (isIos) {
      setPlatform('ios');
    } else if (isAndroid) {
      setPlatform('android');
    }

    // Listen to standard PWA install prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show manual PWA instructions anyway for a few seconds if not already installed
    // and it's a mobile device, so workers know they can save it!
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    if (!isStandalone && (isIos || isAndroid)) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the PWA install prompt');
    }
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md bg-white border border-green-200/40 rounded-2xl shadow-xl p-5 z-50 animate-slide-up">
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold"
        title="Zatvori"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex gap-4 items-start">
        <div className="bg-primary-green text-white p-3 rounded-xl shrink-0 shadow-sm">
          <Smartphone className="w-6 h-6 text-white/85" />
        </div>
        <div className="pr-4">
          <h4 className="font-bold text-gray-900 text-sm md:text-base leading-tight">Instaliraj aplikaciju na telefon</h4>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Dodajte ovu aplikaciju na pocetni ekran svog telefona za brzi rad u proizvodnji bez otvaranja pretrazivaca.
          </p>

          {/* Platform Specific Guidance */}
          {platform === 'android' && (
            <div className="mt-3.5 space-y-2">
              {deferredPrompt ? (
                <button
                  onClick={handleInstallClick}
                  className="w-full bg-primary-green hover:bg-primary-dark text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95 border border-primary-dark/10"
                >
                  <Download className="w-4 h-4" />
                  Instaliraj odmah
                </button>
              ) : (
                <p className="text-xs text-gray-600 font-bold bg-gray-50 border border-gray-200 p-2.5 rounded-lg">
                  💡 Kliknite na tri tacke (meni) u pretrazivacu i izaberite <b>"Dodaj na pocetni ekran"</b>.
                </p>
              )}
            </div>
          )}

          {platform === 'ios' && (
            <div className="mt-3 bg-gray-50 border border-gray-200 p-3 rounded-xl space-y-1.5 text-xs text-gray-700 font-semibold">
              <div className="flex items-center gap-1">
                <span>1. Tapnite na dugme <b>"Deli"</b> (Share)</span>
                <Share className="w-4 h-4 text-primary-green" />
              </div>
              <p>2. Izaberite <b>"Dodaj na pocetni ekran"</b> (Add to Home Screen).</p>
            </div>
          )}

          {platform === 'other' && (
            <p className="mt-3 text-xs text-gray-600 font-bold bg-gray-50 border border-gray-200 p-2.5 rounded-lg">
              💡 Mozete instalirati ovu PWA aplikaciju u pretrazivacu tako sto cete izabrati opciju <b>"Instaliraj"</b> u meniju pretrazivaca.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
