import React, { useState, useMemo } from 'react';
import { ChevronLeft, Download, Calendar, BarChart3, PieChart as PieIcon, TrendingUp, Sparkles, FileSpreadsheet, Table } from 'lucide-react';
import { BalaEntry, VrstaBale } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import * as XLSX from 'xlsx';

interface MonthlyOverviewProps {
  entries: BalaEntry[];
  onBack: () => void;
}

export const MonthlyOverview: React.FC<MonthlyOverviewProps> = ({ entries, onBack }) => {
  // Available months list derived from entries or default to last 6 months
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    
    // Add current month in case there are no entries yet
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    monthsSet.add(currentMonthStr);

    entries.forEach(entry => {
      if (entry.datum && entry.datum.length >= 7) {
        monthsSet.add(entry.datum.substring(0, 7)); // YYYY-MM
      }
    });

    return Array.from(monthsSet).sort().reverse(); // Decending
  }, [entries]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  // Filter entries for selected month
  const monthEntries = useMemo(() => {
    return entries.filter(e => e.datum.startsWith(selectedMonth));
  }, [entries, selectedMonth]);

  // Serbian month names mapping
  const monthNameMap: { [key: string]: string } = {
    '01': 'Januar', '02': 'Februar', '03': 'Mart', '04': 'April',
    '05': 'Maj', '06': 'Jun', '07': 'Jul', '08': 'Avgust',
    '09': 'Septembar', '10': 'Oktobar', '11': 'Novembar', '12': 'Decembar'
  };

  const getMonthLabel = (yyyyMm: string) => {
    try {
      const [year, month] = yyyyMm.split('-');
      return `${monthNameMap[month]} ${year}`;
    } catch {
      return yyyyMm;
    }
  };

  // 1. Stats Calculations
  const stats = useMemo(() => {
    const cistaEntries = monthEntries.filter(e => e.vrsta === 'cista');
    const primeseEntries = monthEntries.filter(e => e.vrsta === 'primese');

    const totalCista = cistaEntries.reduce((sum, e) => sum + e.tezina, 0);
    const totalPrimese = primeseEntries.reduce((sum, e) => sum + e.tezina, 0);
    const totalCombined = totalCista + totalPrimese;
    const count = monthEntries.length;

    // Group entries by exact day to compute average, min, max
    const dailyTotals: { [date: string]: number } = {};
    const dailyCista: { [date: string]: number } = {};
    const dailyPrimese: { [date: string]: number } = {};

    monthEntries.forEach(e => {
      dailyTotals[e.datum] = (dailyTotals[e.datum] || 0) + e.tezina;
      if (e.vrsta === 'cista') {
        dailyCista[e.datum] = (dailyCista[e.datum] || 0) + e.tezina;
      } else {
        dailyPrimese[e.datum] = (dailyPrimese[e.datum] || 0) + e.tezina;
      }
    });

    const activeDays = Object.keys(dailyTotals);
    const activeDaysCount = activeDays.length;

    // 26 working days constraint mentioned: let's calculate average based on real active days or standard 26 days
    const averageDaily = activeDaysCount > 0 ? totalCombined / activeDaysCount : 0;

    const maxDaily = activeDaysCount > 0 ? Math.max(...Object.values(dailyTotals)) : 0;
    const minDaily = activeDaysCount > 0 ? Math.min(...Object.values(dailyTotals)) : 0;

    // Weekly totals: partition month into weeks (e.g. week 1: days 1-7, week 2: 8-14, week 3: 15-21, week 4+: 22-31)
    const weeklyTotals = [0, 0, 0, 0, 0]; // 5 weeks maximum
    monthEntries.forEach(e => {
      try {
        const dayNum = parseInt(e.datum.split('-')[2]);
        if (dayNum <= 7) weeklyTotals[0] += e.tezina;
        else if (dayNum <= 14) weeklyTotals[1] += e.tezina;
        else if (dayNum <= 21) weeklyTotals[2] += e.tezina;
        else if (dayNum <= 28) weeklyTotals[3] += e.tezina;
        else weeklyTotals[4] += e.tezina;
      } catch (err) {}
    });

    return {
      totalCista,
      totalPrimese,
      totalCombined,
      count,
      activeDaysCount,
      averageDaily,
      maxDaily,
      minDaily,
      weeklyTotals,
      dailyTotals,
      dailyCista,
      dailyPrimese
    };
  }, [monthEntries]);

  // Format daily quantities for bar chart
  const barChartData = useMemo(() => {
    // Collect all unique days sorted chronologically
    const dates = Object.keys(stats.dailyTotals).sort();
    return dates.map(date => {
      // Format to just day number for cleaner X axis, e.g. "2026-07-21" -> "21."
      const day = date.split('-')[2] + '.';
      return {
        name: day,
        'Cista folija': stats.dailyCista[date] || 0,
        Primese: stats.dailyPrimese[date] || 0,
        Ukupno: stats.dailyTotals[date] || 0,
      };
    });
  }, [stats]);

  // Donut chart data
  const pieChartData = useMemo(() => {
    return [
      { name: 'Cista folija (kg)', value: stats.totalCista, color: '#1B5E20' },
      { name: 'Primese (kg)', value: stats.totalPrimese, color: '#ea580c' }
    ];
  }, [stats]);

  // Formatting helper
  const formatKg = (val: number) => {
    return Math.round(val).toLocaleString('sr-RS') + ' kg';
  };

  // EXPORT 1: CSV (Clean tabular export with detailed monthly totals at the top)
  const exportToCSV = () => {
    let csvContent = '\uFEFF'; // UTF-8 BOM to guarantee proper character encoding (like Č, Š, Ž) in Excel

    // Clear and highly-visible summary section at the very top of the CSV file
    csvContent += `IZVESTAJ O POTROSNJI FOLIJE ZA MESEC: ${getMonthLabel(selectedMonth).toUpperCase()}\n`;
    csvContent += `--------------------------------------------------\n`;
    csvContent += `UKUPNA POTROSNJA FOLIJE (SVEUKUPNO),${stats.totalCombined} kg\n`;
    csvContent += `Ukupno Cista folija,${stats.totalCista} kg\n`;
    csvContent += `Ukupno Primese (>50%),${stats.totalPrimese} kg\n`;
    csvContent += `--------------------------------------------------\n`;
    csvContent += `Ukupan broj evidentiranih bala,${stats.count} kom\n`;
    csvContent += `Broj aktivnih dana u proizvodnji,${stats.activeDaysCount} dana\n`;
    csvContent += `Prosecna dnevna kolicina,${Math.round(stats.averageDaily)} kg/dan\n`;
    csvContent += `Najveca dnevna kolicina,${stats.maxDaily} kg\n`;
    csvContent += `Najmanja dnevna kolicina,${stats.minDaily} kg\n`;
    csvContent += `\n\n`;

    // Tabular history header
    csvContent += 'DETALJNA ISTORIJA MERENJA ZA IZABRANI MESEC\n';
    csvContent += 'Datum,Vrsta bale,Tezina (kg),Uneo operater,Vreme Unosa,Napomena\n';

    // Sort entries newest first
    const sortedEntries = [...monthEntries].sort((a, b) => b.datum.localeCompare(a.datum));

    sortedEntries.forEach(e => {
      let formattedTime = '';
      try {
        if (e.vremeUnosa) {
          formattedTime = new Date(e.vremeUnosa).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(e.vremeUnosa).toLocaleDateString('sr-RS');
        }
      } catch (err) {
        formattedTime = String(e.vremeUnosa || '');
      }

      const safeOperator = String(e.korisnik || 'Sistem');
      const safeNote = String(e.napomena || '');

      const row = [
        e.datum,
        e.vrsta === 'cista' ? 'Cista folija' : 'Primese (>50%)',
        e.tezina,
        `"${safeOperator.replace(/"/g, '""')}"`,
        `"${formattedTime}"`,
        `"${safeNote.replace(/"/g, '""')}"`
      ].join(',');
      csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `potrosnja-folije-izvestaj-${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // EXPORT 2: EXCEL (Generates a clean workbook with summary as the 1st page)
  const exportToExcel = () => {
    // Sheet 1: Monthly Summary (What the user wants to see first!)
    const summaryData = [
      { 'MESECNI IZVESTAJ': 'IZVESTAJ O POTROSNJI FOLIJE ZA MESEC DANA', 'VREDNOST': getMonthLabel(selectedMonth).toUpperCase() },
      { 'MESECNI IZVESTAJ': '--------------------------------------------------', 'VREDNOST': '------------' },
      { 'MESECNI IZVESTAJ': 'UKUPNO POTROSENO FOLIJE (SVEUKUPNO)', 'VREDNOST': `${stats.totalCombined.toLocaleString('sr-RS')} kg` },
      { 'MESECNI IZVESTAJ': 'Od toga Cista folija', 'VREDNOST': `${stats.totalCista.toLocaleString('sr-RS')} kg` },
      { 'MESECNI IZVESTAJ': 'Od toga Primese (>50%)', 'VREDNOST': `${stats.totalPrimese.toLocaleString('sr-RS')} kg` },
      { 'MESECNI IZVESTAJ': '--------------------------------------------------', 'VREDNOST': '------------' },
      { 'MESECNI IZVESTAJ': 'Ukupan broj evidentiranih bala', 'VREDNOST': `${stats.count} kom` },
      { 'MESECNI IZVESTAJ': 'Broj aktivnih dana u proizvodnji', 'VREDNOST': `${stats.activeDaysCount} dana` },
      { 'MESECNI IZVESTAJ': 'Prosecna dnevna kolicina', 'VREDNOST': `${Math.round(stats.averageDaily).toLocaleString('sr-RS')} kg/dan` },
      { 'MESECNI IZVESTAJ': 'Najveca dnevna kolicina', 'VREDNOST': `${stats.maxDaily.toLocaleString('sr-RS')} kg` },
      { 'MESECNI IZVESTAJ': 'Najmanja dnevna kolicina', 'VREDNOST': `${stats.minDaily.toLocaleString('sr-RS')} kg` },
    ];

    // Sheet 2: Individual entries
    const entriesData = monthEntries.map(e => {
      let formattedTime = '';
      try {
        if (e.vremeUnosa) {
          formattedTime = new Date(e.vremeUnosa).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(e.vremeUnosa).toLocaleDateString('sr-RS');
        }
      } catch (err) {
        formattedTime = String(e.vremeUnosa || '');
      }

      return {
        'Datum': e.datum,
        'Vrsta bale': e.vrsta === 'cista' ? 'Cista folija' : 'Primese (>50%)',
        'Tezina (kg)': e.tezina,
        'Uneo operater': e.korisnik || 'Sistem',
        'Vreme unosa': formattedTime,
        'Napomena': e.napomena || 'Standardna bala',
      };
    });

    const wb = XLSX.utils.book_new();
    
    // Mesecni Pregled is appended first so Excel automatically opens it by default
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Mesecni Pregled');

    // Dnevni Unosi is the second sheet
    const wsEntries = XLSX.utils.json_to_sheet(entriesData);
    XLSX.utils.book_append_sheet(wb, wsEntries, 'Dnevni Unosi');

    // Robust purely client-side write to avoid Node fs errors in browser bundle
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
    
    const s2ab = (s: string) => {
      const buf = new ArrayBuffer(s.length);
      const view = new Uint8Array(buf);
      for (let i = 0; i < s.length; i++) {
        view[i] = s.charCodeAt(i) & 0xFF;
      }
      return buf;
    };

    const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `potrosnja-folije-izvestaj-${selectedMonth}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-fade-in space-y-8">
      
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-gray-500 hover:text-primary-green font-bold text-sm transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Nazad na pocetak</span>
        </button>

        {/* Month Selector dropdown */}
        <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-gray-200 w-full sm:w-auto">
          <Calendar className="w-5 h-5 text-primary-green" />
          <span className="text-sm font-bold text-gray-500 whitespace-nowrap">Izbor meseca:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-primary-green font-bold focus:outline-none text-base cursor-pointer"
          >
            {availableMonths.map(m => (
              <option key={m} value={m}>
                {getMonthLabel(m)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Title */}
      <div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none">
          Mesecni pregled i analitika
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Rezultati i vizuelni izvestaji za izabrani mesec: <b>{getMonthLabel(selectedMonth)}</b>.
        </p>
      </div>

      {/* Export Section (Big Buttons) */}
      <div className="bg-green-50/55 rounded-2xl p-6 border border-green-200/40 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
        <div className="flex items-center gap-3 text-primary-green">
          <div className="bg-primary-green text-white p-2.5 rounded-full shadow-inner border border-white/10">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-base leading-tight">Preuzmite izvestaj</h4>
            <p className="text-xs text-gray-600 font-semibold mt-0.5">
              {monthEntries.length === 0
                ? "⚠️ Nema zabeleženih merenja za ovaj mesec, ali možete preuzeti prazan izveštaj."
                : `Izvezite podatke za mesec ${getMonthLabel(selectedMonth)} u zvanični fajl format.`}
            </p>
          </div>
        </div>

        {/* Buttons Group */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {/* Excel */}
          <button
            onClick={exportToExcel}
            className="flex-1 sm:flex-initial bg-primary-green hover:bg-primary-dark text-white font-bold px-5 py-3 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 border border-primary-dark/20"
          >
            <FileSpreadsheet className="w-5 h-5 text-white/95" />
            Excel Izvestaj (.xlsx)
          </button>

          {/* CSV */}
          <button
            onClick={exportToCSV}
            className="flex-1 sm:flex-initial bg-white hover:bg-gray-50 text-gray-700 font-bold px-5 py-3 rounded-2xl text-sm flex items-center justify-center gap-2 border border-gray-200 shadow-sm transition-all active:scale-95"
          >
            <Table className="w-5 h-5 text-gray-500" />
            CSV Format
          </button>
        </div>
      </div>

      {/* Grid: 3 Quick Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        
        {/* Total Cista */}
        <div className="bg-white rounded-2xl p-6 border border-green-200/40 shadow-sm relative overflow-hidden">
          <div className="bg-green-100 text-primary-green font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider absolute top-6 right-6">
            ♻️ Cista folija
          </div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Ukupno Cista folija</span>
          <h3 className="text-3xl font-black text-primary-green mt-1.5">{formatKg(stats.totalCista)}</h3>
          <p className="text-xs text-gray-500 font-bold mt-2">Visokokvalitetna presovana folija</p>
        </div>

        {/* Total Primese */}
        <div className="bg-white rounded-2xl p-6 border border-red-200/40 shadow-sm relative overflow-hidden">
          <div className="bg-red-50 text-red-800 font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider absolute top-6 right-6">
            🗑️ Primese (&gt;50%)
          </div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Ukupno Primese</span>
          <h3 className="text-3xl font-black text-orange-600 mt-1.5">{formatKg(stats.totalPrimese)}</h3>
          <p className="text-xs text-gray-500 font-bold mt-2">Folija sa vise od 50% primesa</p>
        </div>

        {/* Combined & Count */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex justify-between items-center">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Ukupna Kolicina</span>
            <h3 className="text-3xl font-black text-gray-800 mt-1.5">{formatKg(stats.totalCombined)}</h3>
            <p className="text-xs text-gray-500 font-bold mt-2">Sakupljeno u fabrici</p>
          </div>
          <div className="bg-gray-100 text-gray-800 font-black text-xl px-5 py-4 rounded-2xl shadow-inner border border-gray-200">
            {stats.count}
            <span className="block text-[10px] font-bold text-gray-400 uppercase text-center mt-0.5">Bala</span>
          </div>
        </div>

      </div>

      {/* Grid: 2 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 1. Bar Chart by Day */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-primary-green" />
            <h3 className="font-bold text-gray-800 text-lg uppercase tracking-wider">Potrosnja folije po danima (kg)</h3>
          </div>

          <div className="h-80 w-full">
            {barChartData.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-gray-400 italic">
                Nema podataka za prikaz grafikona.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 'bold' }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: any) => [`${value} kg`]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, fontWeight: 'bold' }} />
                  <Bar dataKey="Cista folija" fill="#1B5E20" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Primese" fill="#ea580c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 2. Relation Pie Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <PieIcon className="w-5 h-5 text-primary-green" />
              <h3 className="font-bold text-gray-800 text-lg uppercase tracking-wider">Odnos kategorija folije</h3>
            </div>

            <div className="h-64 w-full relative flex items-center justify-center">
              {stats.totalCombined === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-gray-400 italic">
                  Nema podataka za analizu odnosa.
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [`${value} kg`]} />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Central Text with percentages */}
                  <div className="absolute text-center flex flex-col">
                    <span className="text-3xl font-black text-gray-800">
                      {stats.totalCombined > 0 ? Math.round((stats.totalCista / stats.totalCombined) * 100) : 0}%
                    </span>
                    <span className="text-[10px] font-bold uppercase text-primary-green tracking-widest">Cista Folija</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Pie Chart Legend List */}
          <div className="border-t border-gray-100 pt-4 flex justify-around">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-primary-green" />
              <div className="text-xs">
                <span className="font-bold block text-primary-green">Cista folija</span>
                <span className="text-gray-400 font-semibold">{stats.totalCombined > 0 ? Math.round((stats.totalCista / stats.totalCombined) * 100) : 0}% ({formatKg(stats.totalCista)})</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-orange-600" />
              <div className="text-xs">
                <span className="font-bold block text-orange-700">Primese (&gt;50%)</span>
                <span className="text-gray-400 font-semibold">{stats.totalCombined > 0 ? Math.round((stats.totalPrimese / stats.totalCombined) * 100) : 0}% ({formatKg(stats.totalPrimese)})</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* SECTION: STATISTIKA */}
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-6 h-6 text-primary-green" />
          <h3 className="font-bold text-gray-900 text-xl uppercase tracking-wider">Statistika i Analiticki Uvidi</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Prosečna Dnevna Količina */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Prosecna dnevna kolicina</span>
            <h4 className="text-2xl font-black text-primary-green mt-2">{formatKg(stats.averageDaily)}</h4>
            <span className="text-xs font-semibold text-gray-500 block mt-1">Sracunato po aktivnim danima ({stats.activeDaysCount})</span>
          </div>

          {/* Najveća Dnevna Količina */}
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Najveca dnevna kolicina</span>
            <h4 className="text-2xl font-black text-emerald-800 mt-2">{formatKg(stats.maxDaily)}</h4>
            <span className="text-xs font-semibold text-gray-500 block mt-1">Maksimalno sakupljeno u 1 danu</span>
          </div>

          {/* Najmanja Dnevna Količina */}
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Najmanja dnevna kolicina</span>
            <h4 className="text-2xl font-black text-orange-700 mt-2">{formatKg(stats.minDaily)}</h4>
            <span className="text-xs font-semibold text-gray-500 block mt-1">Minimalno sakupljeno u 1 danu</span>
          </div>

          {/* Broj Radnih Dana (Kapacitet) */}
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Radni Dani (Kapacitet)</span>
              <h4 className="text-2xl font-black text-gray-800 mt-2">26 dana</h4>
            </div>
            <span className="text-[10px] font-black uppercase text-emerald-700 mt-2 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md w-max">Standardni kapacitet</span>
          </div>
        </div>

        {/* Nedeljna Količina Breakdown */}
        <div className="mt-8 border-t border-gray-100 pt-6">
          <h4 className="font-extrabold text-gray-800 text-sm uppercase tracking-wider mb-4">Nedeljna potrosnja u mesecu</h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {stats.weeklyTotals.map((weeklySum, idx) => (
              <div key={idx} className="bg-gradient-to-b from-white to-gray-50 p-4 rounded-xl border border-gray-200">
                <span className="text-xs font-bold text-gray-400 block uppercase">Nedelja {idx + 1}</span>
                <span className="text-lg font-black text-gray-700 block mt-1">{formatKg(weeklySum)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};
