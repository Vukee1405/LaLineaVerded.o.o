import React from 'react';
import { Smartphone, X, Download, Share2, Check } from 'lucide-react';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QrModal: React.FC<QrModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  // Shared application URL
  const appUrl = window.location.origin;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(appUrl)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors"
          title="Zatvori"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-12 h-12 bg-emerald-100 text-primary-green rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Smartphone className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">QR Kod za Instalaciju</h3>
          <p className="text-xs text-gray-500 mt-1">
            Skenirajte telefonima direktora i kolega u firmi za trenutni pristup i instalaciju
          </p>
        </div>

        {/* QR Code Container */}
        <div className="my-5 p-4 bg-gray-50 border border-gray-200 rounded-2xl flex flex-col items-center justify-center">
          <img
            src={qrCodeUrl}
            alt="QR kod za aplikaciju"
            className="w-52 h-52 object-contain rounded-lg border border-gray-200 shadow-sm bg-white p-2"
          />
          <p className="text-[11px] font-semibold text-gray-500 mt-3 text-center break-all bg-white px-3 py-1.5 rounded-lg border border-gray-200">
            {appUrl}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleCopyLink}
            className="w-full bg-primary-green hover:bg-primary-dark text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Link je kopiran u međuspremnik!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Kopiraj Direktni Link</span>
              </>
            )}
          </button>

          {/* Quick Install Guide */}
          <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-xl p-3 text-xs text-gray-700 space-y-2">
            <p className="font-bold text-primary-green flex items-center gap-1">
              <Download className="w-3.5 h-3.5" />
              Kako da sačuvate kao pravu aplikaciju na telefonu:
            </p>
            <div className="space-y-1.5 text-[11px] text-gray-600">
              <p>
                🍏 <b>iOS (iPhone / Safari):</b> Otvorite link u Safariju, kliknite na ikonicu <b>Share (Deli)</b> <span className="inline-block px-1 bg-gray-200 rounded">⎋</span> pa izaberite <b>"Add to Home Screen"</b> (Dodaj na početni ekran).
              </p>
              <p>
                🤖 <b>Android (Chrome):</b> Otvorite link u Chrome-u, kliknite na <b>3 tačke</b> u uglu i izaberite <b>"Dodaj na početni ekran"</b> ili <b>"Instaliraj aplikaciju"</b>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
