import React, { useState, useEffect } from 'react';
import { ChevronLeft, Save, AlertCircle, Calendar, Weight, MessageSquare } from 'lucide-react';
import { BalaEntry, VrstaBale } from '../types';

interface EntryFormProps {
  editingEntry?: BalaEntry | null;
  operatorName: string;
  onSave: (entryData: {
    id?: string;
    datum: string;
    vrsta: VrstaBale;
    tezina: number;
    napomena: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export const EntryForm: React.FC<EntryFormProps> = ({
  editingEntry = null,
  operatorName,
  onSave,
  onCancel,
}) => {
  // Get today's date formatted as YYYY-MM-DD
  const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [datum, setDatum] = useState(() => {
    if (editingEntry) return editingEntry.datum;
    try {
      const draft = localStorage.getItem('llv_entry_form_draft');
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.datum) return parsed.datum;
      }
    } catch (e) {}
    return getTodayDateString();
  });

  const [vrsta, setVrsta] = useState<VrstaBale>(() => {
    if (editingEntry) return editingEntry.vrsta;
    try {
      const draft = localStorage.getItem('llv_entry_form_draft');
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.vrsta) return parsed.vrsta;
      }
    } catch (e) {}
    return 'cista';
  });

  const [tezina, setTezina] = useState<string>(() => {
    if (editingEntry) return editingEntry.tezina.toString();
    try {
      const draft = localStorage.getItem('llv_entry_form_draft');
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.tezina !== undefined) return parsed.tezina;
      }
    } catch (e) {}
    return '';
  });

  const [napomenaPreset, setNapomenaPreset] = useState<string>(() => {
    if (editingEntry) {
      const presets = ['Standardna bala', 'Vlazna bala', 'Ostecena folija'];
      if (presets.includes(editingEntry.napomena)) return editingEntry.napomena;
      if (!editingEntry.napomena) return 'Standardna bala';
      return 'Ostalo';
    }
    try {
      const draft = localStorage.getItem('llv_entry_form_draft');
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.napomenaPreset) return parsed.napomenaPreset;
      }
    } catch (e) {}
    return 'Standardna bala';
  });

  const [napomenaCustom, setNapomenaCustom] = useState<string>(() => {
    if (editingEntry) {
      const presets = ['Standardna bala', 'Vlazna bala', 'Ostecena folija'];
      if (!presets.includes(editingEntry.napomena) && editingEntry.napomena) {
        return editingEntry.napomena;
      }
      return '';
    }
    try {
      const draft = localStorage.getItem('llv_entry_form_draft');
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.napomenaCustom) return parsed.napomenaCustom;
      }
    } catch (e) {}
    return '';
  });

  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Auto-save draft for new entries whenever inputs change
  useEffect(() => {
    if (!editingEntry) {
      try {
        localStorage.setItem(
          'llv_entry_form_draft',
          JSON.stringify({ datum, vrsta, tezina, napomenaPreset, napomenaCustom })
        );
      } catch (e) {}
    }
  }, [datum, vrsta, tezina, napomenaPreset, napomenaCustom, editingEntry]);

  // If we are editing, populate with existing values
  useEffect(() => {
    if (editingEntry) {
      setDatum(editingEntry.datum);
      setVrsta(editingEntry.vrsta);
      setTezina(editingEntry.tezina.toString());
      
      const presets = ['Standardna bala', 'Vlazna bala', 'Ostecena folija'];
      if (presets.includes(editingEntry.napomena)) {
        setNapomenaPreset(editingEntry.napomena);
        setNapomenaCustom('');
      } else if (!editingEntry.napomena) {
        setNapomenaPreset('Standardna bala');
        setNapomenaCustom('');
      } else {
        setNapomenaPreset('Ostalo');
        setNapomenaCustom(editingEntry.napomena);
      }
    }
  }, [editingEntry]);

  const clearDraft = () => {
    try {
      localStorage.removeItem('llv_entry_form_draft');
    } catch (e) {}
  };

  const handleCancel = () => {
    clearDraft();
    onCancel();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!datum) {
      setError('Datum je obavezan.');
      return;
    }

    const parsedWeight = parseFloat(tezina);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      setError('Molimo Vas unesite ispravnu tezinu bale u kilogramima (vecu od 0).');
      return;
    }

    setSubmitting(true);

    const finalNapomena = napomenaPreset === 'Ostalo' ? napomenaCustom.trim() : napomenaPreset;

    try {
      await onSave({
        id: editingEntry?.id,
        datum,
        vrsta,
        tezina: parsedWeight,
        napomena: finalNapomena || 'Standardna bala',
      });
      clearDraft();
    } catch (err: any) {
      setError(err.message || 'Doslo je do greske pri cuvanju unosa.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWeightKeyPress = (val: string) => {
    // Only allow numbers and one decimal point/comma
    const formatted = val.replace(',', '.');
    setTezina(formatted);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-fade-in">
      
      {/* Back button */}
      <button
        onClick={handleCancel}
        className="flex items-center gap-1 text-gray-500 hover:text-primary-green font-bold text-sm mb-6 transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
        <span>Nazad na pocetak</span>
      </button>

      {/* Main card */}
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        
        {/* Card Header */}
        <div className="bg-primary-green text-white px-6 py-5 border-b border-primary-dark/20 flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight uppercase">
            {editingEntry ? 'Izmena unosa bale' : 'Novi unos bale'}
          </h2>
          <span className="text-sm font-bold bg-white/20 px-3 py-1 rounded-full border border-white/10">
            {operatorName}
          </span>
        </div>

        {/* Card Body */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6" noValidate>
          
          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border-2 border-red-200 p-4 rounded-2xl text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <span className="font-bold leading-normal">{error}</span>
            </div>
          )}

          {/* Datum (Date) Input */}
          <div>
            <label className="block text-sm font-extrabold text-gray-700 uppercase tracking-wider mb-2">
              Datum presovanja
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <Calendar className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="date"
                required
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-base font-bold focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-primary-green transition-colors"
              />
            </div>
          </div>

          {/* Vrsta Bale (Bale Type) Select - BIG TOUCH CHIPS */}
          <div>
            <label className="block text-sm font-extrabold text-gray-700 uppercase tracking-wider mb-3">
              Kategorija folije (Vrsta bale)
            </label>
            <div className="grid grid-cols-2 gap-4">
              
              {/* Čista Folija */}
              <button
                type="button"
                onClick={() => setVrsta('cista')}
                className={`flex flex-col items-center justify-center py-5 px-4 rounded-2xl border-2 transition-all duration-150 ${
                   vrsta === 'cista'
                    ? 'bg-green-50/50 text-primary-green border-primary-green shadow-sm scale-[1.01]'
                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                }`}
              >
                <span className="text-3xl mb-2">♻️</span>
                <span className="text-base font-bold block">Cista folija</span>
                <span className="text-xs font-semibold opacity-70 mt-1">Standardna bela folija</span>
              </button>

              {/* Primese */}
              <button
                type="button"
                onClick={() => setVrsta('primese')}
                className={`flex flex-col items-center justify-center py-5 px-4 rounded-2xl border-2 transition-all duration-150 ${
                  vrsta === 'primese'
                    ? 'bg-red-50 text-orange-700 border-orange-500 shadow-sm scale-[1.01]'
                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                }`}
              >
                <span className="text-3xl mb-2">🗑️</span>
                <span className="text-base font-extrabold block">Primese (&gt;50%)</span>
                <span className="text-xs font-semibold opacity-70 mt-1">Vise od 50% necistoca</span>
              </button>

            </div>
          </div>

          {/* Težina Bale (Bale Weight) Input - LARGE NUMBERS FOR INDUSTRIAL USE */}
          <div>
            <label className="block text-sm font-extrabold text-gray-700 uppercase tracking-wider mb-2">
              Tezina bale (kg)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Weight className="w-6 h-6 text-primary-green" />
              </div>
              <input
                type="number"
                step="any"
                required
                inputMode="decimal"
                id="bale-weight-input"
                value={tezina}
                onChange={(e) => handleWeightKeyPress(e.target.value)}
                placeholder="Unesite tezinu u kg (npr. 185)"
                className="block w-full pl-12 pr-14 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-xl font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-primary-green transition-colors"
              />
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <span className="text-gray-400 font-extrabold text-lg">KG</span>
              </div>
            </div>
          </div>

          {/* Napomena (Notes) - SELECT OR CUSTOM */}
          <div>
            <label className="block text-sm font-extrabold text-gray-700 uppercase tracking-wider mb-2">
              Napomena (Opciono)
            </label>
            <div className="relative mb-3">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <MessageSquare className="w-5 h-5 text-gray-400" />
              </div>
              <select
                value={napomenaPreset}
                onChange={(e) => setNapomenaPreset(e.target.value)}
                className="block w-full pl-12 pr-10 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-base font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-primary-green appearance-none"
              >
                <option value="Standardna bala">Standardna bala</option>
                <option value="Vlazna bala">Vlazna bala</option>
                <option value="Ostecena folija">Ostecena folija</option>
                <option value="Ostalo">Ostalo (Unesi sam...)</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-500">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Custom note field (Visible if "Ostalo" is chosen) */}
            {napomenaPreset === 'Ostalo' && (
              <input
                type="text"
                required
                value={napomenaCustom}
                onChange={(e) => setNapomenaCustom(e.target.value)}
                placeholder="Unesite Vasu napomenu ovde"
                className="block w-full px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-base font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-primary-green transition-colors mt-2 animate-fade-in"
              />
            )}
          </div>

          {/* Submit & Cancel Buttons - LARGE */}
          <div className="pt-4 flex flex-col sm:flex-row gap-4">
            {/* Cancel Button */}
            <button
              type="button"
              onClick={handleCancel}
              className="w-full sm:w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold py-4 px-6 rounded-2xl text-base transition-colors border border-gray-200 flex items-center justify-center gap-2"
            >
              Otkazi
            </button>

            {/* Save Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-2/3 bg-primary-green hover:bg-primary-dark text-white font-bold py-4 px-6 rounded-2xl text-lg shadow-sm transition-all duration-150 flex items-center justify-center gap-2"
              id="entry-save-btn"
            >
              {submitting ? (
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Sacuvaj unose u bazu
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
