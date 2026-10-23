import type { Retangulo } from './corte';
import { novoId } from './estado';
import type { Ajustes, Material, Modulo, PecaBase, Projeto, TipoObjeto, Unidade } from './types';
import { fmtMedida } from './unidades';

const arred = (n: number) => Math.round(n * 10) / 10;

export const espessuraDe = (materialId: string, materiais: Material[]) =>
  materiais.find((x) => x.id === materialId)?.espessura ?? 18;

/** Largura e altura que o módulo ocupa olhando o móvel de frente. */
export function tamanhoNaTela(m: Modulo, materiais: Material[]) {
  const e = espessuraDe(m.materialId, materiais);
  if (m.tipo === 'prateleira') return { w: m.largura, h: e };
  if (m.tipo === 'livre') {
    if (m.orientacao === 'deitada') return { w: m.largura, h: e };
    if (m.orientacao === 'lateral') return { w: e, h: m.altura };
  }
  return { w: m.largura, h: m.altura };
}

/** Quais medidas da tela dá para puxar: na prateleira e no tampo a altura é a espessura da chapa, na lateral a largura. */
export function eixosAjustaveis(m: Modulo) {
  return {
    w: !(m.tipo === 'livre' && m.orientacao === 'lateral'),
    h: !(m.tipo === 'prateleira' || (m.tipo === 'livre' && m.orientacao === 'deitada')),
  };
}

export const retanguloNaTela =(m: Modulo, materiais: Material[]): Retangulo => ({ x: m.x, y: m.y, ...tamanhoNaTela(m, materiais) });

/** Quanto o módulo avança a partir da parede, contando fundo sobreposto e frentes. */
export function profundidadeTotal(m: Modulo, materiais: Material[]) {
  if (m.tipo === 'objeto') return m.profundidade;
  if (m.tipo === 'livre' && m.orientacao === 'frente') return espessuraDe(m.materialId, materiais);
  if (m.tipo !== 'caixa') return m.profundidade;
  const fundo = m.materialFundoId ? espessuraDe(m.materialFundoId, materiais) : 0;
  const frente = m.frente !== 'nenhuma' && m.qtdFrente > 0 ? espessuraDe(m.materialFrenteId, materiais) : 0;
  return m.profundidade + fundo + frente;
}

/**
 * Áreas da parede tomadas pelos móveis das paredes vizinhas que vão até o canto (canto cego).
 * O canto direito de uma parede encontra o canto esquerdo da próxima.
 */
export function zonasDeCanto(p: Projeto, paredeId: string): Retangulo[] {
  const i = p.paredes.findIndex((x) => x.id === paredeId);
  if (i < 0) return [];
  const parede = p.paredes[i];
  const anterior = p.paredes[i - 1];
  const proxima = p.paredes[i + 1];
  const zonas: Retangulo[] = [];
  for (const m of p.modulos) {
    const r = retanguloNaTela(m, p.materiais);
    const fundo = profundidadeTotal(m, p.materiais);
    if (anterior && m.paredeId === anterior.id && r.x + r.w >= anterior.largura - 1) zonas.push({ x: 0, y: r.y, w: fundo, h: r.h });
    if (proxima && m.paredeId === proxima.id && r.x <= 1) zonas.push({ x: parede.largura - fundo, y: r.y, w: fundo, h: r.h });
  }
  return zonas;
}

export const nomesObjeto: Record<TipoObjeto, string> = {
  cuba: 'Cuba',
  cooktop: 'Cooktop',
  tv: 'TV',
  geladeira: 'Geladeira',
  fogao: 'Fogão',
  micro: 'Micro-ondas',
  forno: 'Forno',
  bancada: 'Bancada de pedra',
};

/**
 * Transforma um módulo (medidas externas) na lista de peças a cortar.
 * Regras padrão de montagem: laterais inteiras, base e tampo entre as laterais,
 * fundo sobreposto, portas e frentes sobrepostas com folga.
 */
export function pecasDoModulo(m: Modulo, materiais: Material[], a: Ajustes): PecaBase[] {
  if (m.tipo === 'objeto') return [];
  const e = espessuraDe(m.materialId, materiais);
  const { largura: L, altura: A, profundidade: P } = m;
  const vao = L - 2 * e;
  const f = a.folgaPorta;
  const n = m.qtdFrente;
  const pecas: PecaBase[] = [];

  const add = (nome: string, materialId: string, comprimento: number, largura: number, qtd: number, fitaC = 0, fitaL = 0) => {
    if (qtd > 0 && comprimento > 0 && largura > 0) {
      pecas.push({ nome, materialId, comprimento: arred(comprimento), largura: arred(largura), qtd, fitaC, fitaL });
    }
  };

  if (m.tipo === 'prateleira') {
    add('Prateleira', m.materialId, L, P, 1, 1);
    return pecas;
  }

  if (m.tipo === 'livre') {
    if (m.orientacao === 'frente') add(m.nome, m.materialId, A, L, 1, 2, 2);
    if (m.orientacao === 'deitada') add(m.nome, m.materialId, L, P, 1, 1);
    if (m.orientacao === 'lateral') add(m.nome, m.materialId, A, P, 1, 1);
    return pecas;
  }

  add('Lateral', m.materialId, A, P, 2, 1);
  add('Base/Tampo', m.materialId, vao, P, 2, 1);
  if (m.materialFundoId) add('Fundo', m.materialFundoId, A - 4, L - 4, 1);
  add('Prateleira', m.materialId, vao - 2, P - a.recuoPrateleira, m.prateleiras, 1);

  if (m.frente === 'portas' && n > 0) {
    add('Porta', m.materialFrenteId, A - 2 * f, (L - f * (n + 1)) / n, n, 2, 2);
  }

  if (m.frente === 'gavetas' && n > 0) {
    const alturaFrente = (A - f * (n + 1)) / n;
    add('Frente gaveta', m.materialFrenteId, L - 2 * f, alturaFrente, n, 2, 2);

    const caixaL = vao - 2 * a.folgaCorredica;
    const caixaA = Math.max(alturaFrente - 40, 60);
    // corrediças são vendidas de 50 em 50 mm
    const caixaP = Math.floor((P - 30) / 50) * 50;
    add('Lateral gaveta', m.materialId, caixaP, caixaA, 2 * n, 1);
    add('Contra-frente/traseira', m.materialId, caixaL - 2 * e, caixaA, 2 * n, 1);
    add('Fundo gaveta', m.materialFundoId ?? m.materialId, caixaL, caixaP, n);
  }

  return pecas;
}

export function ferragensDoModulo(m: Modulo) {
  const n = m.tipo === 'caixa' ? m.qtdFrente : 0;
  if (n > 0 && m.frente === 'portas') {
    const porPorta = m.altura <= 900 ? 2 : m.altura <= 1600 ? 3 : 4;
    return { dobradicas: porPorta * n, corredicas: 0, puxadores: n };
  }
  if (n > 0 && m.frente === 'gavetas') return { dobradicas: 0, corredicas: n, puxadores: n };
  return { dobradicas: 0, corredicas: 0, puxadores: 0 };
}

export function descricaoFrente(m: Modulo) {
  if (m.frente === 'portas' && m.qtdFrente > 0) return m.qtdFrente === 1 ? '1 porta' : `${m.qtdFrente} portas`;
  if (m.frente === 'gavetas' && m.qtdFrente > 0) return m.qtdFrente === 1 ? '1 gaveta' : `${m.qtdFrente} gavetas`;
  return 'aberto';
}

export function descricao(m: Modulo, materiais: Material[]) {
  if (m.tipo === 'objeto') return `${m.objeto ? nomesObjeto[m.objeto] : 'Equipamento'} · não entra no corte`;
  const material = materiais.find((x) => x.id === m.materialId)?.nome ?? 'chapa removida';
  if (m.tipo === 'prateleira') return `Prateleira de parede · ${material}`;
  if (m.tipo === 'livre') return `${{ frente: 'Painel', deitada: 'Tampo', lateral: 'Lateral' }[m.orientacao]} · ${material}`;
  const prat = m.prateleiras > 0 ? ` · ${m.prateleiras} prateleira${m.prateleiras > 1 ? 's' : ''}` : '';
  return `${material} · ${descricaoFrente(m)}${prat}`;
}

/** Medidas que interessam a cada tipo, no formato "80 × 70 × 55 cm". */
export function medidasTexto(m: Modulo, u: Unidade) {
  const f = (v: number) => fmtMedida(v, u);
  if (m.tipo === 'prateleira') return `${f(m.largura)} × ${f(m.profundidade)} ${u}`;
  if (m.tipo === 'livre') {
    if (m.orientacao === 'deitada') return `${f(m.largura)} × ${f(m.profundidade)} ${u}`;
    if (m.orientacao === 'lateral') return `${f(m.altura)} × ${f(m.profundidade)} ${u}`;
    return `${f(m.largura)} × ${f(m.altura)} ${u}`;
  }
  return `${f(m.largura)} × ${f(m.altura)} × ${f(m.profundidade)} ${u}`;
}

export type Molde = 'caixa' | 'gaveteiro' | 'prateleira' | 'livre';

export const moldes: { id: Molde; nome: string; icone: string }[] = [
  { id: 'caixa', nome: 'Caixa', icone: '🗄️' },
  { id: 'gaveteiro', nome: 'Gaveteiro', icone: '🧰' },
  { id: 'prateleira', nome: 'Prateleira de parede', icone: '➖' },
  { id: 'livre', nome: 'Peça livre', icone: '▭' },
];

export function moduloDoMolde(molde: Molde, nome: string, materiais: Material[]): Modulo {
  const corpo = materiais.find((m) => m.espessura >= 15) ?? materiais[0];
  const fundo = materiais.find((m) => m.espessura <= 6);
  const base: Modulo = {
    id: novoId(),
    nome,
    tipo: 'caixa',
    paredeId: '',
    x: 0,
    y: 0,
    largura: 800,
    altura: 700,
    profundidade: 550,
    materialId: corpo.id,
    materialFundoId: fundo?.id ?? null,
    materialFrenteId: corpo.id,
    prateleiras: 1,
    frente: 'portas',
    qtdFrente: 2,
    orientacao: 'frente',
  };
  if (molde === 'gaveteiro') return { ...base, largura: 500, prateleiras: 0, frente: 'gavetas', qtdFrente: 3 };
  if (molde === 'prateleira') return { ...base, tipo: 'prateleira', profundidade: 300 };
  if (molde === 'livre') return { ...base, tipo: 'livre', largura: 600, altura: 400, profundidade: 300 };
  return base;
}

/** Puxa uma borda solta (ao mudar o tamanho) para a borda mais perto; sem nenhuma perto, arredonda no centímetro. */
export function encaixarBorda(valor: number, alvos: number[], tolerancia: number) {
  let guia: number | null = null;
  for (const a of alvos) {
    if (Math.abs(a - valor) <= tolerancia && (guia === null || Math.abs(a - valor) < Math.abs(guia - valor))) guia = a;
  }
  return { valor: guia ?? Math.round(valor / 10) * 10, guia };
}

/** Puxa as bordas do retângulo para as bordas dos outros módulos e para o chão. */
export function encaixar(r: Retangulo, outros: Retangulo[], tolerancia: number) {
  const maisPerto = (bordas: number[], alvos: number[]) => {
    let melhor: { delta: number; alvo: number } | null = null;
    for (const b of bordas) {
      for (const alvo of alvos) {
        const delta = alvo - b;
        if (Math.abs(delta) <= tolerancia && (!melhor || Math.abs(delta) < Math.abs(melhor.delta))) melhor = { delta, alvo };
      }
    }
    return melhor;
  };
  const gx = maisPerto([r.x, r.x + r.w], outros.flatMap((o) => [o.x, o.x + o.w]));
  const gy = maisPerto([r.y, r.y + r.h], [0, ...outros.flatMap((o) => [o.y, o.y + o.h])]);
  return {
    x: gx ? r.x + gx.delta : Math.round(r.x / 10) * 10,
    y: Math.max(0, gy ? r.y + gy.delta : Math.round(r.y / 10) * 10),
    guias: { x: gx?.alvo ?? null, y: gy?.alvo ?? null },
  };
}
