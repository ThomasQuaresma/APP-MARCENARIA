export type Unidade = 'mm' | 'cm';

/** Todas as medidas são guardadas em milímetros. */
export interface Material {
  id: string;
  nome: string;
  comprimento: number;
  largura: number;
  espessura: number;
  preco: number;
  /** Com veio, as peças não podem ser giradas na chapa. */
  veio: boolean;
  /** Cor usada no desenho do móvel. */
  cor: string;
}

export interface PecaBase {
  nome: string;
  materialId: string;
  comprimento: number;
  largura: number;
  qtd: number;
  /** Quantos lados do comprimento (0 a 2) levam fita de borda. */
  fitaC: number;
  /** Quantos lados da largura (0 a 2) levam fita de borda. */
  fitaL: number;
}

/** "correr": folhas que correm num trilho duplo na frente da caixa, sobrepostas no transpasse. */
export type Frente = 'nenhuma' | 'portas' | 'gavetas' | 'correr';

/**
 * "objeto" é um equipamento (cuba, TV…): aparece no desenho, mas não entra no corte nem no custo.
 * "base" é o rodapé em quadro que vai embaixo dos módulos; "envelope" é o tamponamento
 * (duas laterais e o tampo) que veste um conjunto de módulos.
 */
export type TipoModulo = 'caixa' | 'prateleira' | 'livre' | 'objeto' | 'base' | 'envelope';

/** Um vão da caixa, entre as laterais e as divisórias. */
export interface Vao {
  /** Largura livre do vão, em mm; null divide o que sobra igualmente com os outros vãos sem medida. */
  largura: number | null;
  prateleiras: number;
  cabideiro: boolean;
}

export type TipoObjeto = 'cuba' | 'cooktop' | 'tv' | 'geladeira' | 'fogao' | 'micro' | 'forno' | 'bancada';

/** Como a peça livre aparece olhando o móvel de frente. */
export type Orientacao = 'frente' | 'deitada' | 'lateral';

export interface Modulo {
  id: string;
  nome: string;
  tipo: TipoModulo;
  /** Só quando tipo = 'objeto'. */
  objeto?: TipoObjeto;
  /** Parede em que o módulo está. */
  paredeId: string;
  /** Posição na parede, em mm: x a partir do canto esquerdo, y a partir do chão. */
  x: number;
  y: number;
  largura: number;
  altura: number;
  profundidade: number;
  materialId: string;
  materialFundoId: string | null;
  materialFrenteId: string;
  /** Por dentro da caixa: um vão a mais para cada divisória. */
  vaos: Vao[];
  frente: Frente;
  qtdFrente: number;
  orientacao: Orientacao;
}

/** Ferragem ou acessório que entra no orçamento, com a quantidade por unidade (por gaveta, por exemplo). */
export interface ItemKit {
  nome: string;
  qtd: number;
  /** Preço de cada um, em reais. */
  preco: number;
}

export interface Ajustes {
  unidade: Unidade;
  serra: number;
  refilo: number;
  sobraMinima: number;
  precoFita: number;
  margemFita: number;
  folgaPorta: number;
  folgaCorredica: number;
  recuoPrateleira: number;
  precoDobradica: number;
  precoPuxador: number;
  /** O que entra no orçamento para cada gaveta (corrediça, puxador, parafusos…). */
  kitGaveta: ItemKit[];
  /** Tubo de cabide com os dois suportes. */
  precoCabideiro: number;
  /** O que entra no orçamento para cada folha de porta de correr (roldanas, puxador…). */
  kitCorrer: ItemKit[];
  /** Metro do trilho de correr, superior e inferior juntos. */
  precoTrilho: number;
  /** Quanto uma folha de correr passa por cima da outra, em mm. */
  transpasseCorrer: number;
  /** Quanto a folha de correr fica mais baixa que a caixa, para caber nos trilhos, em mm. */
  descontoAlturaCorrer: number;
  /** Preço sugerido = custo dos materiais × fator + custos extras, mais impostos. */
  fatorVenda: number;
  /** Impostos e taxas (nota, maquininha), em % do preço de venda. */
  impostos: number;
  empresa: string;
  telefone: string;
  condicoes: string;
  /** Logo da empresa como imagem (data URL); vazio quando não tem. */
  logo: string;
}

/** Custos do projeto além dos materiais, em reais. */
export interface Extras {
  maoDeObra: number;
  instalacao: number;
  frete: number;
  outros: number;
}

/**
 * Parede do ambiente, em mm. O x = 0 dos módulos é o canto esquerdo dela, olhando de frente.
 * As paredes vêm em sequência: o canto direito de uma encontra o canto esquerdo da próxima (L e U).
 */
export interface Parede {
  id: string;
  nome: string;
  largura: number;
  altura: number;
}

export type Piso = 'madeira' | 'porcelanato' | 'cimento';

export interface Ambiente {
  corParede: string;
  piso: Piso;
}

export interface Projeto {
  cliente: string;
  /** 1 parede = reto, 2 = em L, 3 = em U. */
  paredes: Parede[];
  ambiente: Ambiente;
  materiais: Material[];
  modulos: Modulo[];
  ajustes: Ajustes;
  extras: Extras;
  /** Valor combinado com o cliente; null usa o preço sugerido. */
  precoFinal: number | null;
}
