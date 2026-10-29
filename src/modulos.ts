import type { Retangulo } from './corte';
import { novoId, vaoSimples } from './estado';
import { radianos, vizinhas } from './planta';
import type { Ajustes, ItemKit, LadosTamponamento, Material, Modulo, Parede, PecaBase, Projeto, TipoObjeto, Unidade, Vao } from './types';
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
  const frente =
    m.frente === 'correr' && m.qtdFrente > 0 ? TRILHO_CORRER : m.frente !== 'nenhuma' && m.qtdFrente > 0 ? espessuraDe(m.materialFrenteId, materiais) : 0;
  return m.profundidade + fundo + frente;
}

/** Profundidade do trilho duplo de correr, preso na frente da caixa, em mm. */
export const TRILHO_CORRER = 70;

/** Largura de cada folha de correr: juntas cobrem a caixa e cada uma passa o transpasse por cima da vizinha. */
export const larguraFolhaCorrer = (L: number, n: number, transpasse: number) => (L + (n - 1) * transpasse) / n;

/**
 * Áreas da parede tomadas pelos móveis das paredes vizinhas que vão até o canto (canto cego).
 * O canto direito de uma parede encontra o canto esquerdo da próxima.
 */
export function zonasDeCanto(p: Projeto, paredeId: string): Retangulo[] {
  const i = p.paredes.findIndex((x) => x.id === paredeId);
  if (i < 0) return [];
  const parede = p.paredes[i];
  const v = vizinhas(p.paredes, p.fechado, i);
  const anterior = p.paredes[v.anterior];
  const proxima = p.paredes[v.proxima];
  const zonas: Retangulo[] = [];
  for (const m of p.modulos) {
    const r = retanguloNaTela(m, p.materiais);
    const fundo = profundidadeTotal(m, p.materiais);
    const entrada = ocupaNoCanto(fundo, v.giroEntrada);
    const saida = ocupaNoCanto(fundo, v.giroSaida);
    if (anterior && entrada && m.paredeId === anterior.id && r.x + r.w >= anterior.largura - 1) zonas.push({ x: 0, y: r.y, w: entrada, h: r.h });
    if (proxima && saida && m.paredeId === proxima.id && r.x <= 1) zonas.push({ x: parede.largura - saida, y: r.y, w: saida, h: r.h });
  }
  return zonas;
}

/**
 * Quanto o móvel da parede vizinha toma desta parede, no canto. No canto de 90° é a profundidade dele;
 * com a parede inclinada, mais; na quina para fora ou quase reto, nada.
 */
function ocupaNoCanto(fundo: number, giro: number | null) {
  if (giro === null || giro < 20) return 0;
  return Math.round(fundo / Math.sin(radianos(Math.max(30, 180 - giro))));
}

/** Portas, janelas e passagens da parede, como retângulos para desviar e avisar. */
export const retangulosDasAberturas = (parede: Parede): Retangulo[] =>
  parede.aberturas.map((a) => ({ x: a.x, y: a.y, w: a.largura, h: a.altura }));

export const nomesObjeto: Record<TipoObjeto, string> = {
  cuba: 'Cuba',
  cooktop: 'Cooktop',
  tv: 'TV',
  geladeira: 'Geladeira',
  fogao: 'Fogão',
  micro: 'Micro-ondas',
  forno: 'Forno',
  bancada: 'Pedra (mármore)',
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

  if (m.tipo === 'base') {
    // só o quadro: frente e trás inteiras, travessas entre elas
    add('Base frente/trás', m.materialId, L, A, 2, 1);
    add('Base travessa', m.materialId, P - 2 * e, A, 2);
    return pecas;
  }

  if (m.tipo === 'envelope') {
    // as laterais passam, o tampo fica entre elas e o fundo entre as laterais, embaixo do tampo
    const l = ladosDe(m);
    const entre = L - e * (Number(l.esquerda) + Number(l.direita));
    const laterais = Number(l.esquerda && !l.doVizinho?.esquerda) + Number(l.direita && !l.doVizinho?.direita);
    add('Lateral tamponamento', m.materialId, A, P, laterais, 1);
    if (l.tampo) add('Tampo tamponamento', m.materialId, entre, P, 1, 1);
    if (l.fundo) add('Fundo tamponamento (painel)', m.materialId, A - (l.tampo ? e : 0), entre, 1);
    return pecas;
  }

  if (m.tipo === 'livre') {
    if (m.orientacao === 'frente') add(m.nome, m.materialId, A, L, 1, 2, 2);
    if (m.orientacao === 'deitada') add(m.nome, m.materialId, L, P, 1, 1);
    if (m.orientacao === 'lateral') add(m.nome, m.materialId, A, P, 1, 1);
    return pecas;
  }

  add('Lateral', m.materialId, A, P, 2, 1);
  if (m.travas) {
    // caixa de pia: em cima, só as duas travas; a pia ocupa o resto
    add('Base', m.materialId, vao, P, 1, 1);
    add('Trava', m.materialId, vao, Math.min(a.larguraTrava, P), 2, 1);
  } else add('Base/Tampo', m.materialId, vao, P, 2, 1);
  if (m.materialFundoId) add('Fundo', m.materialFundoId, A - 4, L - 4, 1);
  // com gavetas, a caixa não tem divisão por dentro
  if (m.frente !== 'gavetas') {
    const vaos = vaosNaCaixa(m, materiais);
    add('Divisória', m.materialId, A - 2 * e, P, vaos.length - 1, 1);
    // prateleiras da mesma largura saem numa linha só
    const porLargura = new Map<number, number>();
    for (const v of vaos) porLargura.set(arred(v.w), (porLargura.get(arred(v.w)) ?? 0) + v.vao.prateleiras);
    for (const [w, qtd] of porLargura) add('Prateleira', m.materialId, w - 2, P - a.recuoPrateleira, qtd, 1);
  }

  if (m.frente === 'portas' && n > 0) {
    add('Porta', m.materialFrenteId, A - 2 * f, (L - f * (n + 1)) / n, n, 2, 2);
  }

  if (m.frente === 'basculante' && n > 0) {
    add('Porta basculante', m.materialFrenteId, L - 2 * f, (A - f * (n + 1)) / n, n, 2, 2);
  }

  if (m.frente === 'correr' && n > 0) {
    add('Porta de correr', m.materialFrenteId, A - a.descontoAlturaCorrer, larguraFolhaCorrer(L, n, a.transpasseCorrer), n, 2, 2);
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

/** Ferragens e acessórios do módulo; nas gavetas e nas folhas de correr, entra o kit configurado em Ajustes para cada uma. */
export function ferragensDoModulo(m: Modulo, a: Ajustes): ItemKit[] {
  if (m.tipo !== 'caixa') return [];
  const n = m.qtdFrente;
  const itens: ItemKit[] = [];
  if (n > 0 && m.frente === 'portas') {
    const porPorta = m.altura <= 900 ? 2 : m.altura <= 1600 ? 3 : 4;
    itens.push({ nome: 'Dobradiça', qtd: porPorta * n, preco: a.precoDobradica }, { nome: 'Puxador', qtd: n, preco: a.precoPuxador });
  }
  if (n > 0 && m.frente === 'basculante') {
    itens.push(
      { nome: 'Dobradiça', qtd: 2 * n, preco: a.precoDobradica },
      { nome: 'Pistão a gás', qtd: 2 * n, preco: a.precoPistao },
      { nome: 'Puxador', qtd: n, preco: a.precoPuxador },
    );
  }
  if (n > 0 && m.frente === 'gavetas') {
    for (const k of a.kitGaveta) if (k.qtd > 0) itens.push({ ...k, qtd: k.qtd * n });
  }
  if (n > 0 && m.frente === 'correr') {
    for (const k of a.kitCorrer) if (k.qtd > 0) itens.push({ ...k, qtd: k.qtd * n });
    // o trilho vai de ponta a ponta da caixa, em cima e embaixo
    itens.push({ nome: 'Trilho de correr (m)', qtd: Math.round(m.largura / 10) / 100, preco: a.precoTrilho });
  }
  const cabideiros = m.frente === 'gavetas' ? 0 : m.vaos.filter((v) => v.cabideiro).length;
  if (cabideiros > 0) itens.push({ nome: 'Cabideiro', qtd: cabideiros, preco: a.precoCabideiro });
  return itens;
}

/** Junta os itens de mesmo nome e preço, somando as quantidades. */
export function somarItens(itens: ItemKit[]): ItemKit[] {
  const juntos = new Map<string, ItemKit>();
  for (const i of itens) {
    const chave = `${i.nome}|${i.preco}`;
    const ja = juntos.get(chave);
    juntos.set(chave, ja ? { ...ja, qtd: ja.qtd + i.qtd } : { ...i });
  }
  return [...juntos.values()];
}

/** Vãos da caixa lado a lado, com x a partir da borda esquerda do módulo. */
export function vaosNaCaixa(m: Modulo, materiais: Material[]) {
  const e = espessuraDe(m.materialId, materiais);
  const vaos = m.vaos.length ? m.vaos : [vaoSimples()];
  // sem nenhum vão automático, o último fica com o que sobrar
  const temAuto = vaos.some((v) => v.largura === null);
  const auto = vaos.map((v, i) => v.largura === null || (!temAuto && i === vaos.length - 1));
  const livre = m.largura - 2 * e - (vaos.length - 1) * e;
  const fixos = vaos.reduce((s, v, i) => s + (auto[i] ? 0 : (v.largura ?? 0)), 0);
  const resto = Math.max(0, (livre - fixos) / auto.filter(Boolean).length);
  let x = e;
  return vaos.map((vao, i) => {
    const w = auto[i] ? resto : (vao.largura ?? 0);
    const r = { x, w, vao, auto: auto[i] };
    x += w + e;
    return r;
  });
}

/**
 * Altura da base de cada prateleira e do cabideiro, a partir do chão do módulo.
 * Sem cabideiro, as prateleiras se espalham igualmente; com cabideiro, ficam no alto,
 * de 30 em 30 cm, e o cabide logo abaixo da última.
 */
export function arrumacaoDoVao(v: Vao, A: number, e: number) {
  const vao = A - 2 * e;
  if (!v.cabideiro) {
    return { prateleiras: Array.from({ length: v.prateleiras }, (_, k) => e + ((k + 1) * vao) / (v.prateleiras + 1) - e / 2), cabideiro: null };
  }
  const espaco = Math.min(300, vao / (v.prateleiras + 2));
  const prateleiras = Array.from({ length: v.prateleiras }, (_, k) => A - e - (k + 1) * espaco);
  const teto = prateleiras.length ? prateleiras[prateleiras.length - 1] : A - e;
  return { prateleiras, cabideiro: teto - 60 };
}

export const ladosPadrao: LadosTamponamento = { esquerda: true, direita: true, tampo: true, fundo: false };
export const ladosDe = (m: Modulo) => m.lados ?? ladosPadrao;

/** Onde fica a lateral do tamponamento, na tela; null quando ela não existe. */
export function lateralDoTamponamento(m: Modulo, lado: 'esquerda' | 'direita', materiais: Material[]): Retangulo | null {
  if (m.tipo !== 'envelope' || !ladosDe(m)[lado]) return null;
  const e = espessuraDe(m.materialId, materiais);
  return { x: lado === 'esquerda' ? m.x : m.x + m.largura - e, w: e, y: m.y, h: m.altura };
}

/** As laterais de todos os tamponamentos: os módulos novos desviam delas. */
export const lateraisDosTamponamentos = (modulos: Modulo[], materiais: Material[]) =>
  modulos.flatMap((m) => [lateralDoTamponamento(m, 'esquerda', materiais), lateralDoTamponamento(m, 'direita', materiais)]).filter(
    (r): r is Retangulo => r !== null,
  );

/**
 * Tamponamentos encostados dividem a lateral: onde a lateral direita de um cai em cima da esquerda do outro,
 * só uma fica (a mais alta; na mesma altura, a do tamponamento da esquerda). A outra vira "do vizinho".
 * É calculado a cada vez, então afastar os módulos devolve a lateral de cada um.
 */
export function compartilharLaterais(modulos: Modulo[], materiais: Material[]): Modulo[] {
  const envs = modulos.filter((m) => m.tipo === 'envelope');
  if (envs.length < 2) return modulos;
  const lateral = (m: Modulo, lado: 'esquerda' | 'direita') => lateralDoTamponamento(m, lado, materiais);
  const vizinho = new Map<string, { esquerda?: boolean; direita?: boolean }>();
  const marcar = (m: Modulo, lado: 'esquerda' | 'direita') => vizinho.set(m.id, { ...vizinho.get(m.id), [lado]: true });
  for (const a of envs) {
    for (const b of envs) {
      if (a === b || a.paredeId !== b.paredeId) continue;
      const dir = lateral(a, 'direita');
      const esq = lateral(b, 'esquerda');
      if (!dir || !esq) continue;
      const juntasX = Math.min(dir.x + dir.w, esq.x + esq.w) - Math.max(dir.x, esq.x) > 1;
      const juntasY = Math.min(dir.y + dir.h, esq.y + esq.h) - Math.max(dir.y, esq.y) > 1;
      if (!juntasX || !juntasY) continue;
      if (esq.h > dir.h + 1) marcar(a, 'direita');
      else marcar(b, 'esquerda');
    }
  }
  return modulos.map((m) => {
    const doVizinho = vizinho.get(m.id);
    return doVizinho ? { ...m, lados: { ...ladosDe(m), doVizinho } } : m;
  });
}

/** Bordas em que os outros módulos encaixam; no tamponamento, também o vão de dentro. */
export function retangulosDeEncaixe(m: Modulo, materiais: Material[]): Retangulo[] {
  const r = retanguloNaTela(m, materiais);
  if (m.tipo !== 'envelope') return [r];
  const e = espessuraDe(m.materialId, materiais);
  const l = ladosDe(m);
  const esq = l.esquerda ? e : 0;
  return [r, { x: r.x + esq, y: r.y, w: r.w - esq - (l.direita ? e : 0), h: r.h - (l.tampo ? e : 0) }];
}

type Peca = 'esquerda' | 'direita' | 'tampo' | 'fundo';
const nomesLados: Record<Peca, string> = { esquerda: 'lateral esq.', direita: 'lateral dir.', tampo: 'tampo', fundo: 'fundo' };

function resumoInterior(m: Modulo) {
  if (m.frente === 'gavetas') return '';
  const prat = m.vaos.reduce((s, v) => s + v.prateleiras, 0);
  const cab = m.vaos.filter((v) => v.cabideiro).length;
  return [
    m.vaos.length > 1 && `${m.vaos.length} vãos`,
    prat > 0 && `${prat} prateleira${prat > 1 ? 's' : ''}`,
    cab > 0 && (cab > 1 ? `${cab} cabideiros` : 'cabideiro'),
  ]
    .filter(Boolean)
    .map((t) => ` · ${t}`)
    .join('');
}

export function descricaoFrente(m: Modulo) {
  if (m.frente === 'portas' && m.qtdFrente > 0) return m.qtdFrente === 1 ? '1 porta' : `${m.qtdFrente} portas`;
  if (m.frente === 'gavetas' && m.qtdFrente > 0) return m.qtdFrente === 1 ? '1 gaveta' : `${m.qtdFrente} gavetas`;
  if (m.frente === 'correr' && m.qtdFrente > 0) return `${m.qtdFrente} portas de correr`;
  if (m.frente === 'basculante' && m.qtdFrente > 0) return m.qtdFrente === 1 ? '1 basculante' : `${m.qtdFrente} basculantes`;
  return 'aberto';
}

export function descricao(m: Modulo, materiais: Material[]) {
  if (m.tipo === 'objeto') return `${m.objeto ? nomesObjeto[m.objeto] : 'Equipamento'} · não entra no corte`;
  const material = materiais.find((x) => x.id === m.materialId)?.nome ?? 'chapa removida';
  if (m.tipo === 'prateleira') return `Prateleira de parede · ${material}`;
  if (m.tipo === 'livre') return `${{ frente: 'Painel', deitada: 'Tampo', lateral: 'Lateral' }[m.orientacao]} · ${material}`;
  if (m.tipo === 'base') return `Base (rodapé) · ${material}`;
  if (m.tipo === 'envelope') {
    const l = ladosDe(m);
    const pecas = (Object.keys(nomesLados) as Peca[]).filter((k) => l[k]).map((k) => nomesLados[k]);
    return `Tamponamento (${pecas.join(', ') || 'sem peças'}) · ${material}`;
  }
  return `${material} · ${descricaoFrente(m)}${resumoInterior(m)}`;
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

export type Molde = 'caixa' | 'gaveteiro' | 'prateleira' | 'livre' | 'base' | 'envelope';

export const moldes: { id: Molde; nome: string; icone: string }[] = [
  { id: 'caixa', nome: 'Caixa', icone: '🗄️' },
  { id: 'gaveteiro', nome: 'Gaveteiro', icone: '🧰' },
  { id: 'prateleira', nome: 'Prateleira de parede', icone: '➖' },
  { id: 'livre', nome: 'Peça livre', icone: '▭' },
  { id: 'base', nome: 'Base (rodapé)', icone: '▁' },
  { id: 'envelope', nome: 'Tamponamento', icone: '⊓' },
];

export function moduloDoMolde(molde: Molde, nome: string, materiais: Material[]): Modulo {
  const corpo = materiais.find((m) => m.espessura >= 15) ?? materiais[0];
  const fundo = materiais.find((m) => m.espessura <= 6);
  const padrao: Modulo = {
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
    vaos: [vaoSimples(1)],
    frente: 'portas',
    qtdFrente: 2,
    orientacao: 'frente',
  };
  const semFrente = { frente: 'nenhuma' as const, qtdFrente: 0, vaos: [], materialFundoId: null };
  if (molde === 'gaveteiro') return { ...padrao, largura: 500, vaos: [vaoSimples()], frente: 'gavetas', qtdFrente: 3 };
  if (molde === 'prateleira') return { ...padrao, tipo: 'prateleira', profundidade: 300 };
  if (molde === 'livre') return { ...padrao, tipo: 'livre', largura: 600, altura: 400, profundidade: 300 };
  // a base costuma ter de 10 a 15 cm e fica um pouco recuada da frente dos módulos
  if (molde === 'base') return { ...padrao, ...semFrente, tipo: 'base', largura: 1000, altura: 120, profundidade: 500 };
  if (molde === 'envelope') return { ...padrao, ...semFrente, tipo: 'envelope', largura: 1036, altura: 2418, profundidade: 600 };
  return padrao;
}

/** Dois retângulos se cruzam (encostar não conta); meio milímetro de tolerância para arredondamentos. */
export const sobrepoe = (a: Retangulo, b: Retangulo) =>
  Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1;

/**
 * Onde um bloco novo entra na parede: no primeiro x, da esquerda para a direita, em que ele não bate
 * em nada na mesma altura. Assim o aéreo vai em cima do balcão, e o balcão vai ao lado do outro.
 */
export function posicaoLivre(bloco: Retangulo, obstaculos: Retangulo[], inicio: number) {
  const candidatos = [inicio, ...obstaculos.map((o) => o.x + o.w)].filter((x) => x >= inicio).sort((a, b) => a - b);
  // o último candidato fica depois de todos os obstáculos, então sempre há lugar
  return candidatos.find((x) => !obstaculos.some((o) => sobrepoe({ ...bloco, x }, o))) ?? inicio;
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
