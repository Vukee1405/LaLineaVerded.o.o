import React from 'react';
import { LogOut, User, Calendar, RefreshCw, Smartphone } from 'lucide-react';

interface HeaderProps {
  operatorName: string;
  onLogout: () => void;
  onRefresh?: () => void;
  onOpenQr?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ operatorName, onLogout, onRefresh, onOpenQr }) => {
  const getFormattedDate = () => {
    const d = new Date();
    const days = ['Nedelja', 'Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota'];
    const months = [
      'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 
      'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
    ];
    return `${days[d.getDay()]}, ${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}.`;
  };

  return (
    <header className="bg-primary-green text-white shadow-md border-b border-primary-dark/20 sticky top-0 z-50 px-4 md:px-6 py-3 md:py-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg text-white font-black flex items-center justify-center text-xl h-10 w-10 md:h-11 md:w-11 shadow-inner border border-white/10">
              LLV
            </div>
            <div>
              <h1 className="text-lg md:text-2xl font-bold tracking-tight text-white uppercase leading-tight">
                La Linea Verde
              </h1>
              <p className="text-white/90 text-[10px] md:text-xs font-semibold uppercase tracking-wider">
                Evidencija potrošnje folije
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:hidden">
            {onOpenQr && (
              <button
                onClick={onOpenQr}
                className="flex items-center justify-center p-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg border border-white/20 active:scale-95 transition-all"
                title="Prikaži QR kod za telefone"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            )}
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="flex items-center justify-center p-2 bg-white/15 hover:bg-white/25 rounded-lg border border-white/20 active:scale-95 transition-all text-white"
                title="Sinhronizuj bazu podataka"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Today's Date */}
          <div className="hidden md:flex items-center gap-2 bg-primary-dark/30 px-3 py-1.5 rounded-full text-xs text-white/90 font-medium border border-white/10">
            <Calendar className="w-3.5 h-3.5 text-white/70" />
            <span>{getFormattedDate()}</span>
          </div>

          {/* QR Code Button */}
          {onOpenQr && (
            <button
              onClick={onOpenQr}
              className="hidden sm:flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-1.5 rounded-full text-xs transition-all active:scale-95 border border-white/20 shadow-sm"
              title="Prikaži QR kod za instalaciju na telefone"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>QR Kod Telefon</span>
            </button>
          )}

          {/* Refresh Button on desktop */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="hidden sm:flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white font-bold px-3 py-1.5 rounded-full text-xs transition-all active:scale-95 border border-white/20"
              title="Sinhronizuj sve podatke sa serverom"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sinhronizuj</span>
            </button>
          )}

          {/* User Profile */}
          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full text-xs text-white font-semibold border border-white/20">
            <User className="w-3.5 h-3.5 text-white/80" />
            <span className="truncate max-w-[100px] md:max-w-[140px]">{operatorName}</span>
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-full text-xs transition-all duration-150 shadow-md active:scale-95 border border-red-500/20"
            id="header-logout-btn"
            title="Odjavi se"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Odjava</span>
          </button>
        </div>
      </div>
    </header>
  );
};
