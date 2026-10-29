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

/**
 * "correr": folhas que correm num trilho duplo na frente da caixa, sobrepostas no transpasse.
 * "basculante": portas que abrem para cima, uma em cima da outra, presas por pistão a gás.
 */
export type Frente = 'nenhuma' | 'portas' | 'gavetas' | 'correr' | 'basculante';

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

/** Peças do tamponamento: as duas laterais, o tampo de cima e o fundo (painel atrás, para cabeceira e painel de sala). */
export interface LadosTamponamento {
  esquerda: boolean;
  direita: boolean;
  tampo: boolean;
  fundo: boolean;
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
  /** Caixa de pia: em cima, duas travas (frente e fundo) no lugar do tampo inteiro. */
  travas?: boolean;
  /** Só no tamponamento (tipo 'envelope'); sem ele, laterais e tampo. */
  lados?: LadosTamponamento;
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
  /** Pistão a gás da porta basculante; vão dois em cada porta. */
  precoPistao: number;
  /** O que entra no orçamento para cada folha de porta de correr (roldanas, puxador…). */
  kitCorrer: ItemKit[];
  /** Metro do trilho de correr, superior e inferior juntos. */
  precoTrilho: number;
  /** Quanto uma folha de correr passa por cima da outra, em mm. */
  transpasseCorrer: number;
  /** Quanto a folha de correr fica mais baixa que a caixa, para caber nos trilhos, em mm. */
  descontoAlturaCorrer: number;
  /** Quanto o tamponamento fica mais fundo que a caixa que ele veste, para passar na frente das portas, em mm. */
  avancoTamponamento: number;
  /** Largura de cada trava da caixa de pia, em mm (7 cm, ou 5 para quem usa assim). */
  larguraTrava: number;
  /** Preço sugerido = custo dos materiais × fator + custos extras, mais impostos. */
  fatorVenda: number;
  /** Impostos e taxas (nota, maquininha), em % do preço de venda. */
  impostos: number;
  /** Sugestão da mão de obra: R$ por m² de frente dos móveis, mais um valor fixo por orçamento. */
  maoDeObraM2: number;
  maoDeObraFixa: number;
  /** Sugestão da instalação, do mesmo jeito. */
  instalacaoM2: number;
  instalacaoFixa: number;
  empresa: string;
  telefone: string;
  condicoes: string;
  /** Logo da empresa como imagem (data URL); vazio quando não tem. */
  logo: string;
}

/** Custos do projeto além dos materiais, em reais. */
export interface Extras {
  /** null usa a sugestão dos Ajustes; um número é o valor digitado no orçamento. */
  maoDeObra: number | null;
  instalacao: number | null;
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
  /**
   * Quanto se vira, em graus, saindo da parede anterior para esta, olhando a planta de cima:
   * 90 é o canto comum (para dentro do ambiente), −90 é quina para fora (pilar), 45 é parede inclinada.
   * Não vale para a primeira parede.
   */
  giro: number;
  aberturas: Abertura[];
}

export type TipoAbertura = 'porta' | 'janela' | 'passagem';

/** Porta, janela ou vão na parede, em mm: x a partir do canto esquerdo, y a partir do chão. */
export interface Abertura {
  id: string;
  tipo: TipoAbertura;
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export type Piso = 'madeira' | 'porcelanato' | 'cimento';

export interface Ambiente {
  corParede: string;
  piso: Piso;
}

/** Rascunho usa os preços de hoje; nas outras situações, os preços ficam como estavam no envio. */
export type Situacao = 'rascunho' | 'enviado' | 'aprovado' | 'recusado';

export interface Projeto {
  id: string;
  /** Número do orçamento, em sequência: 1, 2, 3… */
  codigo: number;
  situacao: Situacao;
  /** Datas em ISO. */
  criadoEm: string;
  atualizadoEm: string;
  /** Quando saiu de rascunho; null enquanto é rascunho. */
  enviadoEm: string | null;
  cliente: string;
  /** 1 parede = reto, 2 = em L, 3 = em U; fechado, a última encontra a primeira. */
  paredes: Parede[];
  /** Simples: formatos prontos com cantos de 90°. Avançada: planta desenhada, com qualquer ângulo. */
  planta: 'simples' | 'avancada';
  fechado: boolean;
  ambiente: Ambiente;
  materiais: Material[];
  modulos: Modulo[];
  ajustes: Ajustes;
  extras: Extras;
  /** Valor combinado com o cliente; null usa o preço sugerido. */
  precoFinal: number | null;
}

/**
 * Chapas, preços e ajustes do marceneiro: valem para todos os orçamentos em rascunho.
 * O próximo código é o número que o próximo orçamento novo recebe.
 */
export interface Geral {
  materiais: Material[];
  ajustes: Ajustes;
  proximoCodigo: number;
}

/**
 * Como o orçamento fica guardado: sem as chapas e os ajustes, que vêm do Geral.
 * Depois de enviado, leva junto os preços daquele dia (sem a logo, que é sempre a do Geral).
 */
export type OrcamentoSalvo = Omit<Projeto, 'materiais' | 'ajustes'> & {
  precos?: { materiais: Material[]; ajustes: Ajustes };
};
