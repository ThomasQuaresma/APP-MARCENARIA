import { vaoSimples } from './estado';
import { moduloDoMolde, moldes, nomesObjeto } from './modulos';
import type { Material, Modulo, TipoObjeto } from './types';

/**
 * Item do catálogo: um módulo só ou um conjunto já encaixado.
 * Nos conjuntos, x e y são relativos ao canto esquerdo do conjunto, no chão.
 */
export interface ItemCatalogo {
  id: string;
  nome: string;
  icone: string;
  criar: (materiais: Material[]) => Modulo[];
}

export interface Categoria {
  id: string;
  nome: string;
  itens: ItemCatalogo[];
}

/** Nas caixas de um vão só, dá para informar só as prateleiras e o cabideiro. */
type Medidas = Partial<Modulo> & Pick<Modulo, 'nome' | 'largura' | 'altura' | 'profundidade'> & { prateleiras?: number; cabideiro?: boolean };

const caixa = (materiais: Material[], { prateleiras, cabideiro, ...m }: Medidas): Modulo => ({
  ...moduloDoMolde('caixa', m.nome, materiais),
  ...(prateleiras !== undefined || cabideiro ? { vaos: [vaoSimples(prateleiras ?? 0, cabideiro)] } : {}),
  ...m,
});

/** Colmeia: caixa aberta dividida em colunas e linhas iguais. */
const colmeia = (materiais: Material[], colunas: number, linhas: number, m: Medidas): Modulo =>
  caixa(materiais, { ...m, frente: 'nenhuma', qtdFrente: 0, vaos: Array.from({ length: colunas }, () => vaoSimples(linhas - 1)) });

/** Prateleiras de parede já espaçadas; dx desloca cada uma para o lado (escalonada). */
const prateleiras = (materiais: Material[], qtd: number, largura: number, y0: number, dy: number, dx = 0): Modulo[] =>
  Array.from({ length: qtd }, (_, i) => ({
    ...moduloDoMolde('prateleira', `Prateleira ${i + 1}`, materiais),
    largura,
    profundidade: 250,
    x: i * dx,
    y: y0 + i * dy,
  }));

/** Chapa com veio (amadeirada) para frentes de destaque; sem ela, usa a chapa do corpo. */
const madeira = (materiais: Material[]) => {
  const id = materiais.find((x) => x.veio)?.id;
  return id ? { materialFrenteId: id } : {};
};

/** TV pela diagonal, em formato 16:9, com 15 mm de borda em volta da tela. */
export function medidasTv(polegadas: number) {
  const d = polegadas * 25.4;
  return { largura: Math.round(d * 0.8716 + 30), altura: Math.round(d * 0.4903 + 30), profundidade: 60 };
}

/** Largura, altura e profundidade padrão de cada equipamento. Na cuba, a altura é a da torneira. */
const medidasObjeto: Record<TipoObjeto, { largura: number; altura: number; profundidade: number }> = {
  cuba: { largura: 500, altura: 250, profundidade: 400 },
  cooktop: { largura: 580, altura: 10, profundidade: 500 },
  tv: medidasTv(55),
  geladeira: { largura: 700, altura: 1850, profundidade: 700 },
  fogao: { largura: 760, altura: 850, profundidade: 650 },
  micro: { largura: 480, altura: 290, profundidade: 380 },
  forno: { largura: 595, altura: 595, profundidade: 550 },
  bancada: { largura: 1200, altura: 30, profundidade: 600 },
};

/** Altura em que cada equipamento costuma ficar, quando entra sozinho. */
const alturaObjeto: Record<TipoObjeto, number> = {
  cuba: 880,
  cooktop: 880,
  tv: 1000,
  geladeira: 0,
  fogao: 0,
  micro: 1400,
  forno: 700,
  bancada: 850,
};

export const objeto = (materiais: Material[], tipo: TipoObjeto, extra: Partial<Modulo> = {}): Modulo => ({
  ...moduloDoMolde('caixa', nomesObjeto[tipo], materiais),
  tipo: 'objeto',
  objeto: tipo,
  ...medidasObjeto[tipo],
  y: alturaObjeto[tipo],
  frente: 'nenhuma',
  qtdFrente: 0,
  vaos: [],
  materialFundoId: null,
  ...extra,
});

const um = (id: string, nome: string, icone: string, m: Medidas): ItemCatalogo => ({
  id,
  nome,
  icone,
  criar: (materiais) => [caixa(materiais, m)],
});

const categorias: Categoria[] = [
  {
    id: 'basicos',
    nome: 'Básicos',
    itens: moldes.map((md) => ({ id: md.id, nome: md.nome, icone: md.icone, criar: (materiais) => [moduloDoMolde(md.id, md.nome, materiais)] })),
  },
  {
    id: 'cozinha',
    nome: 'Cozinha',
    itens: [
      {
        id: 'cozinha-linear',
        nome: 'Cozinha linear 2,40 m',
        icone: '🍳',
        criar: (mt) => [
          caixa(mt, { nome: 'Balcão gaveteiro', largura: 600, altura: 850, profundidade: 550, frente: 'gavetas', qtdFrente: 3, prateleiras: 0 }),
          caixa(mt, { nome: 'Balcão pia', x: 600, largura: 1200, altura: 850, profundidade: 550, frente: 'portas', qtdFrente: 2, prateleiras: 1, travas: true }),
          caixa(mt, { nome: 'Balcão', x: 1800, largura: 600, altura: 850, profundidade: 550, frente: 'portas', qtdFrente: 1, prateleiras: 1 }),
          objeto(mt, 'bancada', { largura: 2400, y: 850 }),
          objeto(mt, 'cooktop', { x: 10 }),
          objeto(mt, 'cuba', { x: 950 }),
          caixa(mt, { nome: 'Aéreo 1', y: 1500, largura: 800, altura: 700, profundidade: 350 }),
          caixa(mt, { nome: 'Aéreo 2', x: 800, y: 1500, largura: 800, altura: 700, profundidade: 350 }),
          caixa(mt, { nome: 'Aéreo 3', x: 1600, y: 1500, largura: 800, altura: 700, profundidade: 350 }),
        ],
      },
      um('balcao-pia', 'Balcão pia', '🚰', { nome: 'Balcão pia', largura: 1200, altura: 850, profundidade: 550, frente: 'portas', qtdFrente: 2, prateleiras: 1, travas: true }),
      um('balcao-gavetas', 'Balcão gaveteiro', '🗃️', { nome: 'Balcão gaveteiro', largura: 600, altura: 850, profundidade: 550, frente: 'gavetas', qtdFrente: 3, prateleiras: 0 }),
      um('balcao', 'Balcão 2 portas', '🚪', { nome: 'Balcão', largura: 800, altura: 850, profundidade: 550, frente: 'portas', qtdFrente: 2, prateleiras: 1 }),
      um('aereo', 'Aéreo', '⬆️', { nome: 'Aéreo', y: 1500, largura: 800, altura: 700, profundidade: 350 }),
      um('aereo-basculante', 'Aéreo basculante', '⤴️', {
        nome: 'Aéreo basculante',
        y: 1500,
        largura: 800,
        altura: 400,
        profundidade: 350,
        frente: 'basculante',
        qtdFrente: 1,
        prateleiras: 0,
      }),
      {
        id: 'nicho-micro',
        nome: 'Nicho de micro-ondas',
        icone: '📦',
        criar: (mt) => [
          caixa(mt, { nome: 'Nicho micro-ondas', y: 1350, largura: 600, altura: 450, profundidade: 400, frente: 'nenhuma', prateleiras: 0 }),
          objeto(mt, 'micro', { x: 60, y: 1368 }),
        ],
      },
      {
        id: 'torre-quente',
        nome: 'Torre de forno e micro',
        icone: '🔥',
        criar: (mt) => [
          caixa(mt, { nome: 'Torre gavetas', largura: 600, altura: 700, profundidade: 550, frente: 'gavetas', qtdFrente: 2, prateleiras: 0 }),
          caixa(mt, { nome: 'Nicho forno', y: 700, largura: 600, altura: 650, profundidade: 550, frente: 'nenhuma', prateleiras: 0 }),
          caixa(mt, { nome: 'Nicho micro', y: 1350, largura: 600, altura: 450, profundidade: 550, frente: 'nenhuma', prateleiras: 0 }),
          caixa(mt, { nome: 'Torre aéreo', y: 1800, largura: 600, altura: 350, profundidade: 550, frente: 'portas', qtdFrente: 1, prateleiras: 0 }),
          objeto(mt, 'forno', { x: 2, y: 718 }),
          objeto(mt, 'micro', { x: 60, y: 1368 }),
        ],
      },
      um('despenseiro', 'Despenseiro', '🥫', { nome: 'Despenseiro', largura: 600, altura: 2100, profundidade: 550, frente: 'portas', qtdFrente: 1, prateleiras: 4 }),
    ],
  },
  {
    id: 'dormitorio',
    nome: 'Quarto',
    itens: [
      um('gr-modulo-portas', 'Módulo guarda-roupa com portas', '🚪', {
        nome: 'Guarda-roupa',
        largura: 900,
        altura: 2300,
        profundidade: 580,
        frente: 'portas',
        qtdFrente: 2,
        prateleiras: 1,
        cabideiro: true,
      }),
      um('gr-modulo-correr', 'Módulo guarda-roupa sem portas (para porta de correr)', '↔️', {
        nome: 'Guarda-roupa',
        largura: 900,
        altura: 2300,
        profundidade: 580,
        frente: 'nenhuma',
        qtdFrente: 0,
        prateleiras: 1,
        cabideiro: true,
      }),
      um('gr-correr-2', 'Guarda-roupa de correr 2 folhas', '🛤️', {
        nome: 'Guarda-roupa de correr',
        largura: 1800,
        altura: 2300,
        profundidade: 580,
        frente: 'correr',
        qtdFrente: 2,
        vaos: [vaoSimples(1, true), { largura: 500, prateleiras: 5, cabideiro: false }, vaoSimples(1, true)],
      }),
      um('gr-correr-3', 'Guarda-roupa de correr 3 folhas', '🧳', {
        nome: 'Guarda-roupa de correr',
        largura: 2400,
        altura: 2300,
        profundidade: 580,
        frente: 'correr',
        qtdFrente: 3,
        vaos: [vaoSimples(1, true), { largura: 600, prateleiras: 5, cabideiro: false }, vaoSimples(1, true)],
      }),
      {
        id: 'gr2',
        nome: 'Guarda-roupa 2 portas',
        icone: '👔',
        criar: (mt) => [
          caixa(mt, { nome: 'Guarda-roupa', largura: 1000, altura: 2200, profundidade: 600, frente: 'portas', qtdFrente: 2, prateleiras: 1, cabideiro: true, ...madeira(mt) }),
          caixa(mt, { nome: 'Maleiro', y: 2200, largura: 1000, altura: 400, profundidade: 600, frente: 'portas', qtdFrente: 2, prateleiras: 0, ...madeira(mt) }),
        ],
      },
      {
        id: 'gr3',
        nome: 'Guarda-roupa 3 portas',
        icone: '👗',
        criar: (mt) => [
          // um vão de cabide e um de prateleiras, com divisória entre eles
          caixa(mt, {
            nome: 'Guarda-roupa',
            largura: 1500,
            altura: 2200,
            profundidade: 600,
            frente: 'portas',
            qtdFrente: 3,
            vaos: [{ largura: 480, prateleiras: 4, cabideiro: false }, vaoSimples(1, true)],
            ...madeira(mt),
          }),
          caixa(mt, { nome: 'Maleiro', y: 2200, largura: 1500, altura: 400, profundidade: 600, frente: 'portas', qtdFrente: 3, prateleiras: 0, ...madeira(mt) }),
        ],
      },
      {
        id: 'gr4',
        nome: 'Guarda-roupa 4 portas com gavetas',
        icone: '🧥',
        criar: (mt) => [
          caixa(mt, { nome: 'Guarda-roupa', largura: 1000, altura: 2200, profundidade: 600, frente: 'portas', qtdFrente: 2, prateleiras: 1, cabideiro: true, ...madeira(mt) }),
          caixa(mt, { nome: 'Gaveteiro', x: 1000, largura: 1000, altura: 800, profundidade: 600, frente: 'gavetas', qtdFrente: 3, prateleiras: 0, ...madeira(mt) }),
          caixa(mt, { nome: 'Guarda-roupa sobre gavetas', x: 1000, y: 800, largura: 1000, altura: 1400, profundidade: 600, frente: 'portas', qtdFrente: 2, prateleiras: 1, ...madeira(mt) }),
          caixa(mt, { nome: 'Maleiro', y: 2200, largura: 2000, altura: 400, profundidade: 600, frente: 'portas', qtdFrente: 4, prateleiras: 0, ...madeira(mt) }),
        ],
      },
      um('comoda', 'Cômoda', '🛏️', { nome: 'Cômoda', largura: 1000, altura: 850, profundidade: 450, frente: 'gavetas', qtdFrente: 4, prateleiras: 0 }),
      um('criado', 'Criado-mudo', '🕯️', { nome: 'Criado-mudo', largura: 450, altura: 500, profundidade: 400, frente: 'gavetas', qtdFrente: 2, prateleiras: 0 }),
    ],
  },
  {
    id: 'prateleiras',
    nome: 'Prateleiras e colmeias',
    itens: [
      { id: 'prat-3', nome: '3 prateleiras de parede', icone: '📚', criar: (mt) => prateleiras(mt, 3, 800, 1200, 300) },
      { id: 'prat-escada', nome: 'Prateleiras escalonadas', icone: '🪜', criar: (mt) => prateleiras(mt, 3, 600, 1200, 250, 300) },
      { id: 'colmeia-3x3', nome: 'Colmeia 3 × 3', icone: '🐝', criar: (mt) => [colmeia(mt, 3, 3, { nome: 'Colmeia', y: 1200, largura: 900, altura: 900, profundidade: 300 })] },
      { id: 'colmeia-2x3', nome: 'Colmeia 2 × 3', icone: '🔲', criar: (mt) => [colmeia(mt, 2, 3, { nome: 'Colmeia', y: 1200, largura: 600, altura: 900, profundidade: 300 })] },
      { id: 'colmeia-4x2', nome: 'Colmeia 4 × 2', icone: '🧱', criar: (mt) => [colmeia(mt, 4, 2, { nome: 'Colmeia', largura: 1200, altura: 600, profundidade: 350 })] },
      um('nicho', 'Nicho', '⬜', { nome: 'Nicho', y: 1400, largura: 400, altura: 400, profundidade: 300, frente: 'nenhuma', qtdFrente: 0, prateleiras: 0 }),
    ],
  },
  {
    id: 'sala',
    nome: 'Sala',
    itens: [
      {
        id: 'painel-tv',
        nome: 'Painel com rack e TV 55"',
        icone: '📺',
        criar: (mt) => [
          caixa(mt, { nome: 'Rack', y: 200, largura: 1800, altura: 450, profundidade: 450, frente: 'portas', qtdFrente: 3, prateleiras: 0, ...madeira(mt) }),
          {
            ...moduloDoMolde('livre', 'Painel TV', mt),
            y: 650,
            largura: 1800,
            altura: 1300,
            orientacao: 'frente',
            materialId: mt.find((x) => x.veio)?.id ?? mt[0].id,
          },
          objeto(mt, 'tv', { x: Math.round((1800 - medidasTv(55).largura) / 2), y: 650 + Math.round((1300 - medidasTv(55).altura) / 2) }),
        ],
      },
      um('estante', 'Estante', '📚', { nome: 'Estante', largura: 900, altura: 1800, profundidade: 350, frente: 'nenhuma', prateleiras: 4 }),
      um('buffet', 'Buffet', '🍽️', { nome: 'Buffet', largura: 1600, altura: 800, profundidade: 450, frente: 'portas', qtdFrente: 4, prateleiras: 1 }),
    ],
  },
  {
    id: 'banheiro',
    nome: 'Banheiro',
    itens: [
      {
        id: 'gabinete',
        nome: 'Gabinete com bancada e cuba',
        icone: '🚿',
        criar: (mt) => [
          caixa(mt, { nome: 'Gabinete', y: 300, largura: 800, altura: 550, profundidade: 450, frente: 'portas', qtdFrente: 2, prateleiras: 0, travas: true }),
          objeto(mt, 'bancada', { largura: 800, profundidade: 480 }),
          objeto(mt, 'cuba', { x: 200, largura: 400, profundidade: 350 }),
        ],
      },
      um('espelheira', 'Armário de espelho', '🪞', { nome: 'Armário de espelho', y: 1200, largura: 600, altura: 700, profundidade: 150, frente: 'portas', qtdFrente: 1, prateleiras: 2 }),
      um('tanque', 'Armário de tanque', '🧺', { nome: 'Armário de tanque', largura: 900, altura: 850, profundidade: 550, frente: 'portas', qtdFrente: 2, prateleiras: 0 }),
    ],
  },
  {
    id: 'equipamentos',
    nome: 'Equipamentos',
    itens: (
      [
        ['cuba', '🚰'],
        ['cooktop', '🔥'],
        ['tv', '📺'],
        ['bancada', '⬛'],
        ['geladeira', '🧊'],
        ['fogao', '🍳'],
        ['micro', '📦'],
        ['forno', '♨️'],
      ] as [TipoObjeto, string][]
    ).map(([tipo, icone]) => ({ id: tipo, nome: nomesObjeto[tipo], icone, criar: (mt: Material[]) => [objeto(mt, tipo)] })),
  },
];

/** A cozinha vem primeiro, que é por onde o marceneiro mais começa; os básicos ficam no fim, para quem monta do zero. */
const ordem = ['cozinha', 'dormitorio', 'prateleiras', 'sala', 'banheiro', 'basicos', 'equipamentos'];

export const catalogo = [...categorias].sort((a, b) => ordem.indexOf(a.id) - ordem.indexOf(b.id));
