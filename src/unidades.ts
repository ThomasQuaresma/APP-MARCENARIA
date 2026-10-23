import type { Unidade } from './types';

export const paraExibir = (mm: number, u: Unidade) => (u === 'cm' ? mm / 10 : mm);
export const deExibir = (v: number, u: Unidade) => (u === 'cm' ? v * 10 : v);

export const fmtNum = (n: number, casas = 1) =>
  n.toLocaleString('pt-BR', { maximumFractionDigits: casas });

export const fmtMedida = (mm: number, u: Unidade) => fmtNum(paraExibir(mm, u), u === 'cm' ? 2 : 1);

export const fmtDim = (a: number, b: number, u: Unidade) =>
  `${fmtMedida(a, u)} × ${fmtMedida(b, u)} ${u}`;

export const fmtReais = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Aceita vírgula ou ponto como separador decimal. */
export function lerNumero(texto: string): number | null {
  const t = texto.trim().replace(',', '.');
  const n = Number(t);
  return t !== '' && Number.isFinite(n) ? n : null;
}
