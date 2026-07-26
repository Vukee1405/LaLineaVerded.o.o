export type VrstaBale = 'cista' | 'primese';

export interface BalaEntry {
  id: string;
  datum: string;       // YYYY-MM-DD
  vrsta: VrstaBale;
  tezina: number;      // kg
  napomena: string;    // "Vlazna bala", "Ostecena folija", "Ostalo", or custom
  korisnik: string;    // operator's name
  vremeUnosa: string;  // ISO timestamp
}

export interface User {
  name: string;
  role: 'operator' | 'admin' | 'director';
}

export interface StatsData {
  totalCista: number;
  totalPrimese: number;
  totalCombined: number;
  count: number;
  averageDaily: number;
  maxDaily: number;
  minDaily: number;
}
