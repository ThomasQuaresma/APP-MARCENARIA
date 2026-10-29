import type { Parede } from './types';

/**
 * A planta vista de cima, em mm: a primeira parede começa em (0, 0) e vai para a direita; o y desce
 * na tela. O ambiente fica sempre do lado direito de quem anda pelas paredes, na ordem.
 */
export interface Ponto {
  x: number;
  y: number;
}

export const radianos = (graus: number) => (graus * Math.PI) / 180;

/** Ângulo entre −180 e 180. */
export function normalizarGiro(graus: number) {
  const a = ((((graus + 180) % 360) + 360) % 360) - 180;
  return a === -180 ? 180 : a;
}

/** Cantos onde cada parede começa, mais o fim da última, e a direção de cada parede em graus. */
export function tracado(paredes: Parede[]) {
  const pontos: Ponto[] = [{ x: 0, y: 0 }];
  const direcoes: number[] = [];
  let angulo = 0;
  paredes.forEach((p, i) => {
    if (i > 0) angulo += p.giro;
    direcoes.push(angulo);
    const a = pontos[i];
    pontos.push({ x: a.x + Math.cos(radianos(angulo)) * p.largura, y: a.y + Math.sin(radianos(angulo)) * p.largura });
  });
  return { pontos, direcoes };
}

/** Lado de dentro do ambiente, saindo da parede. */
export const normalDe = (direcao: number): Ponto => ({ x: -Math.sin(radianos(direcao)), y: Math.cos(radianos(direcao)) });

/** No ambiente fechado, a última parede vai do fim da penúltima até o começo da primeira. */
export function fecharPlanta(paredes: Parede[]): Parede[] {
  if (paredes.length < 3) return paredes;
  const { pontos, direcoes } = tracado(paredes.slice(0, -1));
  const fim = pontos[pontos.length - 1];
  const largura = Math.round(Math.hypot(fim.x, fim.y));
  const direcao = (Math.atan2(-fim.y, -fim.x) * 180) / Math.PI;
  const giro = Math.round(normalizarGiro(direcao - direcoes[direcoes.length - 1]) * 10) / 10;
  return paredes.map((p, i) => (i === paredes.length - 1 ? { ...p, largura, giro } : p));
}

/** Paredes vizinhas de cada lado e quanto se vira no canto entre elas. */
export function vizinhas(paredes: Parede[], fechado: boolean, i: number) {
  const n = paredes.length;
  const anterior = i > 0 ? i - 1 : fechado && n > 2 ? n - 1 : -1;
  const proxima = i < n - 1 ? i + 1 : fechado && n > 2 ? 0 : -1;
  const giroEntrada = anterior < 0 ? null : i > 0 ? paredes[i].giro : giroDeFechamento(paredes);
  const giroSaida = proxima < 0 ? null : proxima > 0 ? paredes[proxima].giro : giroDeFechamento(paredes);
  return { anterior, proxima, giroEntrada, giroSaida };
}

/** Canto entre a última parede e a primeira, no ambiente fechado. */
function giroDeFechamento(paredes: Parede[]) {
  const { direcoes } = tracado(paredes);
  return normalizarGiro(-direcoes[direcoes.length - 1]);
}

/**
 * Transforma os pontos tocados na planta em paredes, mantendo o que já existia em cada uma
 * (altura, portas e janelas). Desenhado ao contrário, inverte, para o ambiente ficar do lado de dentro.
 */
export function paredesDosPontos(tocados: Ponto[], fechado: boolean, existentes: Parede[], nova: (n: number) => Parede): Parede[] {
  let pontos = fechado ? [...tocados, tocados[0]] : tocados;
  const direcoesDe = (ps: Ponto[]) => ps.slice(1).map((b, i) => (Math.atan2(b.y - ps[i].y, b.x - ps[i].x) * 180) / Math.PI);
  const giros = (ds: number[]) => ds.slice(1).map((d, i) => normalizarGiro(d - ds[i]));
  if (giros(direcoesDe(pontos)).reduce((s, g) => s + g, 0) < 0) pontos = [...pontos].reverse();
  const direcoes = direcoesDe(pontos);
  const paredes = direcoes.map((d, i) => {
    const base = existentes[i] ?? nova(i + 1);
    const largura = Math.round(Math.hypot(pontos[i + 1].x - pontos[i].x, pontos[i + 1].y - pontos[i].y) / 10) * 10;
    const giro = i === 0 ? 90 : Math.round(normalizarGiro(d - direcoes[i - 1]));
    return { ...base, nome: `Parede ${i + 1}`, largura, giro, aberturas: base.aberturas.filter((a) => a.x + a.largura <= largura) };
  });
  return fechado ? fecharPlanta(paredes) : paredes;
}
