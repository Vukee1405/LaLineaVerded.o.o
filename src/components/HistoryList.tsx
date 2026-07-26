import React, { useState } from 'react';
import { ChevronLeft, Edit2, Trash2, Search, Calendar, Filter, Trash, Eye } from 'lucide-react';
import { BalaEntry, VrstaBale } from '../types';

interface HistoryListProps {
  entries: BalaEntry[];
  onEdit: (entry: BalaEntry) => void;
  onDelete: (id: string) => Promise<void>;
  onBack: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  entries,
  onEdit,
  onDelete,
  onBack,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'cista' | 'primese'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter entries based on search and selected category
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.korisnik.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.napomena.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.datum.includes(searchTerm);

    const matchesType =
      filterType === 'all' || entry.vrsta === filterType;

    return matchesSearch && matchesType;
  });

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = async (id: string) => {
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  // Format date helper: "2026-07-21" -> "21.07.2026."
  const formatDateSerbian = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}.${parts[1]}.${parts[0]}.`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const formatTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 animate-fade-in">
      
      {/* Navigation & Header */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-gray-500 hover:text-primary-green font-bold text-sm transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Nazad</span>
        </button>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
          Istorija merenja
        </span>
      </div>

      {/* Page Title */}
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
          Istorijat unetih bala
        </h2>
        <p className="text-gray-500 text-sm">
          Pregledajte sva merenja folije. Mozete pretrazivati, izmeniti pogresne podatke ili ih ukloniti.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100 mb-6 flex flex-col md:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Pretrazi po operateru, datumu ili napomeni..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-primary-green transition-colors"
          />
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 self-start md:self-auto overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
              filterType === 'all'
                ? 'bg-primary-green text-white border-primary-green shadow-sm'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            Sve bale ({entries.length})
          </button>
          <button
            onClick={() => setFilterType('cista')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
              filterType === 'cista'
                ? 'bg-primary-green text-white border-primary-green shadow-sm'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            Cista folija
          </button>
          <button
            onClick={() => setFilterType('primese')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
              filterType === 'primese'
                ? 'bg-orange-600 text-white border-orange-700 shadow-sm'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            Primese
          </button>
        </div>
      </div>

      {/* Entries Display */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl shadow-md border border-gray-100 text-center">
          <span className="text-5xl block mb-4">📂</span>
          <h3 className="text-lg font-bold text-gray-700">Nema pronadjenih unosa</h3>
          <p className="text-gray-500 text-sm mt-1 max-w-md mx-auto">
            Nema evidentiranih merenja koja odgovaraju Vasoj pretrazi ili izabranom filteru.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* Mobile Layout (Responsive cards, big tap targets) */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="bg-white rounded-2xl shadow-md border-2 border-gray-100 p-4 relative overflow-hidden"
              >
                {/* Visual Accent indicator left */}
                <div
                  className={`absolute top-0 bottom-0 left-0 w-2.5 ${
                    entry.vrsta === 'cista' ? 'bg-primary-green' : 'bg-orange-600'
                  }`}
                />

                <div className="pl-2.5">
                  {/* Category Chip + Weight */}
                  <div className="flex justify-between items-center mb-3">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        entry.vrsta === 'cista'
                          ? 'bg-green-100 text-primary-green'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {entry.vrsta === 'cista' ? '♻️ Cista' : '🗑️ Primese'}
                    </span>
                    <span className="text-lg font-black text-gray-800">
                      {entry.tezina} kg
                    </span>
                  </div>

                  {/* Date, Time & Operator Info */}
                  <div className="space-y-1 text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{formatDateSerbian(entry.datum)}</span>
                      <span className="text-gray-300">•</span>
                      <span>{formatTime(entry.vremeUnosa)}</span>
                    </div>
                    <div className="text-xs">
                      Uneo/la: <b className="text-gray-700">{entry.korisnik}</b>
                    </div>
                    {entry.napomena && (
                      <div className="bg-gray-50 border border-gray-100 p-2 rounded-lg text-xs italic text-gray-600 mt-2">
                        Napomena: <b>{entry.napomena}</b>
                      </div>
                    )}
                  </div>

                  {/* Actions Block (Big Touch Buttons) */}
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => onEdit(entry)}
                      className="flex-1 bg-gray-50 hover:bg-gray-100 text-primary-green font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-gray-200 transition-colors"
                      title="Izmeni unos"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Izmeni
                    </button>
                    
                    {deletingId === entry.id ? (
                      <div className="flex gap-1 flex-1 animate-pulse">
                        <button
                          onClick={() => confirmDelete(entry.id)}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-extrabold py-2 px-1 rounded-xl text-[10px] uppercase flex items-center justify-center"
                        >
                          Da, obriši
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-extrabold py-2 px-1 rounded-xl text-[10px] uppercase flex items-center justify-center"
                        >
                          Ne
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDeleteClick(entry.id)}
                        className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-extrabold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-red-100 transition-colors"
                        title="Obriši unos"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Obriši
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Layout (Table) */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-primary-green text-white border-b border-primary-dark/20">
                  <th className="p-4 font-extrabold uppercase text-xs tracking-wider">Datum</th>
                  <th className="p-4 font-extrabold uppercase text-xs tracking-wider">Kategorija</th>
                  <th className="p-4 font-extrabold uppercase text-xs tracking-wider text-right">Tezina</th>
                  <th className="p-4 font-extrabold uppercase text-xs tracking-wider">Napomena</th>
                  <th className="p-4 font-extrabold uppercase text-xs tracking-wider">Unos napravio</th>
                  <th className="p-4 font-extrabold uppercase text-xs tracking-wider text-center">Akcije</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50/80 transition-colors font-medium">
                    <td className="p-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {formatDateSerbian(entry.datum)}
                      <span className="block text-gray-400 font-normal text-xs">{formatTime(entry.vremeUnosa)}</span>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1 ${
                          entry.vrsta === 'cista'
                            ? 'bg-green-100 text-primary-green'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {entry.vrsta === 'cista' ? '♻️ Cista folija' : '🗑️ Primese (>50%)'}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap text-right font-black text-primary-green text-base">
                      {entry.tezina} kg
                    </td>
                    <td className="p-4 text-sm max-w-[180px] truncate text-gray-600 italic font-semibold">
                      {entry.napomena || '-'}
                    </td>
                    <td className="p-4 whitespace-nowrap text-xs">
                      <b className="text-gray-800 block text-sm">{entry.korisnik}</b>
                      <span className="text-gray-400 text-[10px] block">Sakupljanje folije</span>
                    </td>
                    <td className="p-4 whitespace-nowrap text-center">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => onEdit(entry)}
                          className="bg-gray-50 hover:bg-gray-100 text-primary-green font-bold p-2 rounded-xl border border-gray-200 transition-all hover:scale-105 active:scale-95"
                          title="Izmeni unos"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                                                {deletingId === entry.id ? (
                          <div className="flex gap-1 animate-pulse items-center">
                            <button
                              onClick={() => confirmDelete(entry.id)}
                              className="bg-red-600 hover:bg-red-700 text-white font-extrabold px-2.5 py-1 rounded-lg text-[10px] uppercase"
                            >
                              Da
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-extrabold px-2.5 py-1 rounded-lg text-[10px] uppercase"
                            >
                              Ne
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDeleteClick(entry.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 font-bold p-2 rounded-xl border border-red-100 transition-all hover:scale-105 active:scale-95"
                            title="Obrisi unos"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

    </div>
  );
};
