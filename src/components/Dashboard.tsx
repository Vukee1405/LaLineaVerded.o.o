import React from 'react';
import { PlusCircle, History, BarChart3, TrendingUp, HelpCircle, Download, RefreshCw } from 'lucide-react';
import { BalaEntry } from '../types';

interface DashboardProps {
  entries: BalaEntry[];
  onNavigate: (view: 'new-entry' | 'history' | 'monthly') => void;
  onRefresh?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ entries, onNavigate, onRefresh }) => {
  // Get current month info (Serbian name)
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonthNum = today.getMonth(); // 0-11
  
  const monthNamesSerbian = [
    'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
    'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
  ];
  
  const currentMonthLabel = `${monthNamesSerbian[currentMonthNum]} ${currentYear}`;

  // Filter entries for the current month with resilient date parsing
  const isSameMonth = (dateStr: string, year: number, monthIndex: number) => {
    if (!dateStr) return false;
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      const entryYear = parseInt(parts[0], 10);
      const entryMonth = parseInt(parts[1], 10); // 1-12
      return entryYear === year && entryMonth === (monthIndex + 1);
    }
    return false;
  };

  const thisMonthEntries = entries.filter(e => isSameMonth(e.datum, currentYear, currentMonthNum));

  // Compute stats for current month
  const totalCista = thisMonthEntries
    .filter(e => e.vrsta === 'cista')
    .reduce((sum, e) => sum + e.tezina, 0);

  const totalPrimese = thisMonthEntries
    .filter(e => e.vrsta === 'primese')
    .reduce((sum, e) => sum + e.tezina, 0);

  const totalCombined = totalCista + totalPrimese;
  const countBales = thisMonthEntries.length;

  // Formatting helper (with dot for thousands separator)
  const formatKg = (val: number) => {
    return val.toLocaleString('sr-RS') + ' kg';
  };

  return (
    <div className="space-y-8 animate-fade-in px-4 py-6 max-w-7xl mx-auto">
      
      {/* Welcome & Overview Headline */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight">
            Dobrodosli u evidenciju folije
          </h2>
          <p className="text-gray-500 font-medium text-xs md:text-sm">
            Centralna baza podataka i evidencija potrosnje folije za La Linea Verde.
          </p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-primary-green border border-green-200 font-bold px-4 py-2.5 rounded-xl text-xs md:text-sm transition-all active:scale-95 shadow-xs"
            title="Sinhronizuj i osveži podatke sa servera"
          >
            <RefreshCw className="w-4 h-4 text-primary-green" />
            <span>Osveži / Sinhronizuj podatke</span>
          </button>
        )}
      </div>

      {/* Primary Widget: Tekuci Mesec Overview (CRITICAL FOR DIRECTOR) */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
        <div className="bg-primary-green text-white px-6 py-4 flex justify-between items-center border-b border-primary-dark/20">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📅</span>
            <span className="font-bold tracking-tight text-lg md:text-xl uppercase">
              Tekuci mesec: {currentMonthLabel}
            </span>
          </div>
          <span className="bg-white/20 text-white font-bold text-xs px-3 py-1 rounded-full border border-white/10 shadow-sm">
            {countBales} {countBales === 1 ? 'bala' : countBales > 1 && countBales < 5 ? 'bale' : 'bala'}
          </span>
        </div>

        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Cista Folija Card */}
          <div className="bg-green-50/40 border border-green-200/60 rounded-2xl p-5 md:p-6 transition-all hover:scale-[1.01] duration-150 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-3">
              <span className="text-3xl">♻️</span>
              <span className="text-xs font-bold text-primary-green bg-green-100 px-2.5 py-1 rounded-md uppercase tracking-wider">
                Cista folija
              </span>
            </div>
            <div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Ukupno cista</p>
              <h3 className="text-2xl md:text-3xl font-black text-primary-green mt-1 tracking-tight">
                {formatKg(totalCista)}
              </h3>
            </div>
          </div>

          {/* Primese Card */}
          <div className="bg-red-50/40 border border-red-200/50 rounded-2xl p-5 md:p-6 transition-all hover:scale-[1.01] duration-150 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-3">
              <span className="text-3xl">🗑️</span>
              <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2.5 py-1 rounded-md uppercase tracking-wider">
                Primese (&gt;50%)
              </span>
            </div>
            <div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Ukupno primese</p>
              <h3 className="text-2xl md:text-3xl font-black text-orange-600 mt-1 tracking-tight">
                {formatKg(totalPrimese)}
              </h3>
            </div>
          </div>

          {/* Combined Card */}
          <div className="bg-gray-50/40 border border-gray-200 rounded-2xl p-5 md:p-6 transition-all hover:scale-[1.01] duration-150 flex flex-col justify-between col-span-1 md:col-span-1">
            <div className="flex justify-between items-start mb-3">
              <span className="text-3xl">⚖️</span>
              <span className="text-xs font-bold text-gray-700 bg-gray-200 px-2.5 py-1 rounded-md uppercase tracking-wider">
                Ukupno folije
              </span>
            </div>
            <div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Sveukupno sakupljeno</p>
              <h3 className="text-2xl md:text-3xl font-black text-gray-800 mt-1 tracking-tight">
                {formatKg(totalCombined)}
              </h3>
            </div>
          </div>
        </div>

        {/* Progress indicator or Quick tip */}
        <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
            <TrendingUp className="w-5 h-5 text-primary-green" />
            <span>Prosecno ucesce ciste folije: <b>{totalCombined > 0 ? Math.round((totalCista / totalCombined) * 100) : 0}%</b></span>
          </div>
          <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">
            La Linea Verde – Fabricka Evidencija
          </div>
        </div>
      </div>

      {/* Main Action Bento Grid (BIG BUTTONS optimized for manufacturing / gloves / speed) */}
      <div>
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
          Brze Akcije
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          
          {/* New Entry Button - PRIMARY ACCENT */}
          <button
            onClick={() => onNavigate('new-entry')}
            className="group flex flex-col justify-between items-start p-6 md:p-8 bg-primary-green hover:bg-primary-dark text-white rounded-2xl shadow-sm transition-all duration-150 border border-primary-dark/20 hover:scale-[1.01] active:scale-[0.99] text-left"
            id="dash-new-entry-btn"
          >
            <div className="bg-white/20 group-hover:bg-white/30 p-4 rounded-full shadow-inner border border-white/10 transition-colors">
              <PlusCircle className="w-8 h-8 text-white" />
            </div>
            <div className="mt-8">
              <span className="text-xs font-bold text-white/80 uppercase tracking-widest block mb-1">PROCES PRESOVANJA</span>
              <span className="text-2xl md:text-3xl font-black tracking-tight leading-none block">Novi Unos</span>
              <span className="text-sm text-white/90 font-medium block mt-2 opacity-90">Izmerite i evidentirajte novu balu folije (kg)</span>
            </div>
          </button>

          {/* History Button - SECONDARY ACCENT */}
          <button
            onClick={() => onNavigate('history')}
            className="group flex flex-col justify-between items-start p-6 md:p-8 bg-white hover:bg-gray-50 text-gray-800 rounded-2xl shadow-sm transition-all duration-150 border border-gray-200 hover:scale-[1.01] active:scale-[0.99] text-left"
            id="dash-history-btn"
          >
            <div className="bg-gray-100 group-hover:bg-gray-200 p-4 rounded-full shadow-inner border border-gray-200 transition-colors">
              <History className="w-8 h-8 text-primary-green" />
            </div>
            <div className="mt-8">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">ISTORIJAT BALE</span>
              <span className="text-2xl md:text-3xl font-bold tracking-tight leading-none block text-primary-green uppercase">Istorija</span>
              <span className="text-sm text-gray-500 font-medium block mt-2">Pregledajte, izmenite ili obrisite prethodne unose bala</span>
            </div>
          </button>

          {/* Reports / Stats Button - SECONDARY ACCENT */}
          <button
            onClick={() => onNavigate('monthly')}
            className="group flex flex-col justify-between items-start p-6 md:p-8 bg-white hover:bg-gray-50 text-gray-800 rounded-2xl shadow-sm transition-all duration-150 border border-gray-200 hover:scale-[1.01] active:scale-[0.99] text-left"
            id="dash-reports-btn"
          >
            <div className="bg-green-50 group-hover:bg-green-100 p-4 rounded-full shadow-inner border border-green-200/30 transition-colors">
              <BarChart3 className="w-8 h-8 text-primary-green" />
            </div>
            <div className="mt-8">
              <span className="text-xs font-bold text-primary-green/80 uppercase tracking-widest block mb-1">ANALITIKA I PREGLED</span>
              <span className="text-2xl md:text-3xl font-bold tracking-tight leading-none block text-primary-green uppercase">Pregled</span>
              <span className="text-sm text-gray-500 font-medium block mt-2">Grafikoni, statistika, izvoz u Excel i CSV formate</span>
            </div>
          </button>

        </div>
      </div>

      {/* Recent Bales Widget for Immediate Multi-Device & Multi-Operator Live Visibility */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 tracking-tight">
              Poslednja uneta merenja (Uživo)
            </h3>
            <p className="text-xs text-gray-500">
              Prikaz najnovijih bala folije koje su uneli svi operateri.
            </p>
          </div>
          <button
            onClick={() => onNavigate('history')}
            className="text-xs font-bold text-primary-green hover:underline flex items-center gap-1"
          >
            <span>Vidi sve ({entries.length})</span>
            <span>→</span>
          </button>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
            Trenutno nema unetih bala. Kliknite na "Novi Unos" iznad.
          </div>
        ) : (
          <div className="space-y-2">
            {entries.slice(0, 8).map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-gray-50 hover:bg-green-50/50 rounded-xl border border-gray-100 transition-colors gap-2"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase ${
                    item.vrsta === 'cista'
                      ? 'bg-green-100 text-primary-green border border-green-200'
                      : 'bg-orange-100 text-orange-700 border border-orange-200'
                  }`}>
                    {item.vrsta === 'cista' ? 'Čista' : 'Primeše'}
                  </span>
                  <div>
                    <span className="font-black text-gray-900 text-base">
                      {item.tezina.toLocaleString('sr-RS')} kg
                    </span>
                    <span className="text-xs text-gray-500 font-medium ml-3">
                      Operater: <strong className="text-gray-700">{item.korisnik}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500 w-full sm:w-auto justify-between sm:justify-end">
                  <span className="truncate max-w-[200px] text-gray-600 italic">
                    {item.napomena || 'Standardna bala'}
                  </span>
                  <span className="bg-white px-2.5 py-1 rounded-md border border-gray-200 font-semibold text-gray-700 shrink-0">
                    {item.datum}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Industrial Guidance Card */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200 flex items-start gap-4 shadow-sm">
        <div className="bg-primary-green text-white p-2.5 rounded-full shrink-0">
          <HelpCircle className="w-6 h-6 text-white" />
        </div>
        <div>
          <h4 className="font-bold text-gray-900 text-sm">Uputstvo za proizvodne radnike</h4>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Tezinu bala unosite iskljucivo u <b>kilogramima (kg)</b> nakon svakog merenja na vagi. Sve ispostave i telefoni vide unose u realnom vremenu. Za izmenu pogresnog unosa, otvorite sekciju <b>Istorija</b>.
          </p>
        </div>
      </div>

    </div>
  );
};
