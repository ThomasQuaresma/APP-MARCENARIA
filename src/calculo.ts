import { empacotar, type ItemCorte, type ResultadoCorte } from './corte';
import { ferragensDoModulo, pecasDoModulo, somarItens } from './modulos';
import type { Ajustes, ItemKit, Material, PecaBase, Projeto } from './types';

export interface PecaLista extends PecaBase {
  origem: string;
}

export interface ResultadoMaterial extends ResultadoCorte {
  material: Material;
  custo: number;
}

export interface Orcamento {
  porMaterial: ResultadoMaterial[];
  semMaterial: PecaLista[];
  totalPecas: number;
  fitaMetros: number;
  custoFita: number;
  custoChapas: number;
  ferragens: ItemKit[];
  custoFerragens: number;
  /** Chapas + fita + ferragens. */
  custoMateriais: number;
  /** Área de frente dos móveis, em m², usada na sugestão de mão de obra e instalação. */
  area: number;
  maoDeObraSugerida: number;
  instalacaoSugerida: number;
  /** O que entra no custo: o valor digitado ou, sem ele, a sugestão. */
  maoDeObra: number;
  instalacao: number;
  /** Mão de obra, instalação, frete e outros. */
  custoExtras: number;
  custoTotal: number;
  precoSugerido: number;
}

export const precoDe = (p: Projeto, o: Orcamento) => p.precoFinal ?? o.precoSugerido;

/** Base e envelope vestem os outros módulos e os equipamentos não são feitos: nenhum entra na área. */
export const areaDeFrente = (p: Projeto) =>
  p.modulos
    .filter((m) => m.tipo !== 'objeto' && m.tipo !== 'base' && m.tipo !== 'envelope')
    .reduce((s, m) => s + m.largura * m.altura, 0) / 1e6;

/** Sem módulos, não sugere nada: o valor fixo só entra quando já tem o que fazer. */
const sugestao = (area: number, porM2: number, fixo: number) => (area > 0 ? Math.round(area * porM2 + fixo) : 0);

export const temSugestaoDeMaoDeObra = (a: Ajustes) => a.maoDeObraM2 + a.maoDeObraFixa + a.instalacaoM2 + a.instalacaoFixa > 0;

export const todasPecas = (p: Projeto): PecaLista[] =>
  p.modulos.flatMap((m) => pecasDoModulo(m, p.materiais, p.ajustes).map((x) => ({ ...x, origem: m.nome })));

export function calcular(p: Projeto): Orcamento {
  const pecas = todasPecas(p);
  const a = p.ajustes;

  const porMaterial: ResultadoMaterial[] = [];
  for (const material of p.materiais) {
    const itens: ItemCorte[] = pecas
      .filter((x) => x.materialId === material.id)
      .flatMap((x) =>
        Array.from({ length: x.qtd }, () => ({
          nome: x.nome,
          origem: x.origem,
          c: x.comprimento,
          l: x.largura,
          podeGirar: !material.veio,
        })),
      );
    if (itens.length === 0) continue;
    const r = empacotar(itens, material.comprimento, material.largura, a.serra, a.refilo);
    porMaterial.push({ ...r, material, custo: r.chapas.length * material.preco });
  }

  const fitaMm = pecas.reduce((s, x) => s + x.qtd * (x.fitaC * x.comprimento + x.fitaL * x.largura), 0);
  const fitaMetros = (fitaMm / 1000) * (1 + a.margemFita / 100);
  const custoFita = fitaMetros * a.precoFita;
  const custoChapas = porMaterial.reduce((s, r) => s + r.custo, 0);

  const ferragens = somarItens(p.modulos.flatMap((m) => ferragensDoModulo(m, a)));
  const custoFerragens = ferragens.reduce((s, f) => s + f.qtd * f.preco, 0);
  const custoMateriais = custoChapas + custoFita + custoFerragens;
  const e = p.extras;
  const area = areaDeFrente(p);
  const maoDeObraSugerida = sugestao(area, a.maoDeObraM2, a.maoDeObraFixa);
  const instalacaoSugerida = sugestao(area, a.instalacaoM2, a.instalacaoFixa);
  const maoDeObra = e.maoDeObra ?? maoDeObraSugerida;
  const instalacao = e.instalacao ?? instalacaoSugerida;
  const custoExtras = maoDeObra + instalacao + e.frete + e.outros;
  // o fator dá a margem sobre o material; os outros custos entram somados,
  // e os impostos saem do preço de venda
  const semImpostos = custoMateriais * a.fatorVenda + custoExtras;
  const impostos = Math.min(Math.max(a.impostos, 0), 90) / 100;

  return {
    porMaterial,
    semMaterial: pecas.filter((x) => !p.materiais.some((m) => m.id === x.materialId)),
    totalPecas: pecas.reduce((s, x) => s + x.qtd, 0),
    fitaMetros,
    custoFita,
    custoChapas,
    ferragens,
    custoFerragens,
    custoMateriais,
    area,
    maoDeObraSugerida,
    instalacaoSugerida,
    maoDeObra,
    instalacao,
    custoExtras,
    custoTotal: custoMateriais + custoExtras,
    // arredonda para cima, de 10 em 10 reais
    precoSugerido: Math.ceil(semImpostos / (1 - impostos) / 10) * 10,
  };
}
