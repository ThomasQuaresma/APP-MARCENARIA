import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Abertura,
  Ajustes,
  Ambiente,
  Extras,
  Geral,
  ItemKit,
  Material,
  Modulo,
  OrcamentoSalvo,
  Parede,
  Projeto,
  Situacao,
  TipoAbertura,
  Vao,
} from './types';

/** Versões antigas guardavam um projeto só; hoje ele vira o orçamento nº 1. */
const CHAVE_PROJETO = 'marcenaria:projeto:v1';
const CHAVE_BIBLIOTECA = 'marcenaria:biblioteca:v1';
/** Lista com os ids dos orçamentos; cada orçamento fica na sua própria chave. */
const CHAVE_INDICE = 'marcenaria:orcamentos:v1';
const chaveOrcamento = (id: string) => `marcenaria:orcamento:v1:${id}`;
const CHAVE_GERAL = 'marcenaria:geral:v1';
const CHAVE_ABERTO = 'marcenaria:aberto:v1';

export const situacoes: { valor: Situacao; texto: string }[] = [
  { valor: 'rascunho', texto: 'Rascunho' },
  { valor: 'enviado', texto: 'Enviado' },
  { valor: 'aprovado', texto: 'Aprovado' },
  { valor: 'recusado', texto: 'Recusado' },
];

const agora = () => new Date().toISOString();

/** Sugestão do que vai em cada gaveta; o marceneiro ajusta em Ajustes. */
export const kitGavetaPadrao = (precoCorredica: number, precoPuxador: number): ItemKit[] => [
  { nome: 'Par de corrediças telescópicas', qtd: 1, preco: precoCorredica },
  { nome: 'Puxador', qtd: 1, preco: precoPuxador },
  { nome: 'Parafuso 3,5×14 (corrediça)', qtd: 12, preco: 0.1 },
  { nome: 'Parafuso 4×40 (caixa da gaveta)', qtd: 8, preco: 0.15 },
];

/** Sugestão do que vai em cada folha de porta de correr; o trilho é cobrado à parte, por metro. */
export const kitCorrerPadrao = (): ItemKit[] => [
  { nome: 'Kit roldanas de correr (par)', qtd: 1, preco: 45 },
  { nome: 'Guia inferior', qtd: 1, preco: 8 },
  { nome: 'Puxador concha', qtd: 1, preco: 12 },
];

export const ajustesPadrao: Ajustes = {
  unidade: 'cm',
  serra: 4,
  refilo: 10,
  sobraMinima: 100,
  precoFita: 2.5,
  margemFita: 10,
  folgaPorta: 3,
  folgaCorredica: 12.5,
  recuoPrateleira: 20,
  precoDobradica: 8,
  precoPuxador: 15,
  precoCabideiro: 30,
  precoPistao: 25,
  kitGaveta: kitGavetaPadrao(35, 15),
  kitCorrer: kitCorrerPadrao(),
  precoTrilho: 60,
  transpasseCorrer: 40,
  descontoAlturaCorrer: 50,
  fatorVenda: 2.5,
  impostos: 0,
  empresa: '',
  telefone: '',
  condicoes: 'Validade do orçamento: 15 dias.\nPrazo de entrega: a combinar.\nPagamento: 50% na aprovação e 50% na entrega.',
  logo: '',
};

export const extrasZerados: Extras = { maoDeObra: 0, instalacao: 0, frete: 0, outros: 0 };

export const novaParede = (numero: number): Parede => ({
  id: `parede-${numero}`,
  nome: `Parede ${numero}`,
  largura: 3000,
  altura: 2600,
  giro: 90,
  aberturas: [],
});

/** Medidas comuns de porta, janela e passagem; entram no meio da parede. */
export function novaAbertura(tipo: TipoAbertura, parede: Parede): Abertura {
  const [largura, altura, y] = tipo === 'janela' ? [1200, 1000, 1100] : tipo === 'porta' ? [800, 2100, 0] : [900, 2100, 0];
  return { id: novoId(), tipo, x: Math.max(0, Math.round((parede.largura - largura) / 20) * 10), y, largura, altura };
}

export const ambientePadrao: Ambiente = { corParede: '#f2ede6', piso: 'porcelanato' };

const corPadrao = (veio: boolean) => (veio ? '#b98a5a' : '#f4f1ec');

export const materiaisPadrao: Material[] = [
  { id: 'mdf-branco-18', nome: 'MDF Branco 18mm', comprimento: 2750, largura: 1830, espessura: 18, preco: 250, veio: false, cor: '#f4f1ec' },
  { id: 'mdf-madeirado-18', nome: 'MDF Amadeirado 18mm', comprimento: 2750, largura: 1830, espessura: 18, preco: 380, veio: true, cor: '#b98a5a' },
  { id: 'mdf-branco-6', nome: 'MDF Branco 6mm (fundo)', comprimento: 2750, largura: 1830, espessura: 6, preco: 110, veio: false, cor: '#ece7df' },
];

export const projetoNovo = (): Projeto => ({
  id: novoId(),
  codigo: 1,
  situacao: 'rascunho',
  criadoEm: agora(),
  atualizadoEm: agora(),
  enviadoEm: null,
  cliente: '',
  paredes: [novaParede(1)],
  planta: 'simples',
  fechado: false,
  ambiente: ambientePadrao,
  materiais: materiaisPadrao,
  modulos: [],
  ajustes: ajustesPadrao,
  extras: extrasZerados,
  precoFinal: null,
});

export const vaoSimples = (prateleiras = 0, cabideiro = false): Vao => ({ largura: null, prateleiras, cabideiro });

/** Versões anteriores guardavam só a quantidade de prateleiras, sem divisões por dentro. */
export const migrarModulo = (m: Modulo & { prateleiras?: number }): Modulo => {
  const { prateleiras, ...resto } = m;
  return { ...resto, vaos: m.vaos ?? [vaoSimples(prateleiras ?? 0)] };
};

/** Antes do kit da gaveta, a corrediça tinha um preço só; ele vira o preço da corrediça no kit. */
function migrarAjustes(salvos: (Partial<Ajustes> & { precoCorredica?: number }) | undefined): Ajustes {
  const { precoCorredica, ...resto } = salvos ?? {};
  return {
    ...ajustesPadrao,
    ...resto,
    kitGaveta: resto.kitGaveta ?? kitGavetaPadrao(precoCorredica ?? 35, resto.precoPuxador ?? ajustesPadrao.precoPuxador),
  };
}

/** Completa projetos salvos por versões anteriores do app. */
function migrar(p: Partial<Projeto> & { parede?: { largura: number; altura: number } }): Projeto {
  let proximoX = 0;
  // versões anteriores tinham uma parede só, sem id
  const { parede: antiga, ...resto } = p;
  const paredes = (p.paredes?.length ? p.paredes : [{ ...novaParede(1), ...antiga }]).map((x) => ({
    ...x,
    giro: x.giro ?? 90,
    aberturas: x.aberturas ?? [],
  }));
  return {
    ...projetoNovo(),
    ...resto,
    ajustes: migrarAjustes(p.ajustes),
    extras: { ...extrasZerados, ...p.extras },
    ambiente: { ...ambientePadrao, ...p.ambiente },
    paredes,
    materiais: (p.materiais ?? materiaisPadrao).map((m) => ({ ...m, cor: m.cor ?? corPadrao(m.veio) })),
    modulos: (p.modulos ?? []).map((m) => {
      const novo: Modulo = {
        ...migrarModulo(m),
        tipo: m.tipo ?? 'caixa',
        orientacao: m.orientacao ?? 'frente',
        paredeId: paredes.some((x) => x.id === m.paredeId) ? m.paredeId : paredes[0].id,
        x: m.x ?? proximoX,
        y: m.y ?? 0,
      };
      if (m.x === undefined) proximoX += novo.largura;
      return novo;
    }),
  };
}

function useArmazenado<T>(chave: string, carregar: (salvo: unknown) => T) {
  const [valor, setValor] = useState<T>(() => {
    try {
      const salvo = localStorage.getItem(chave);
      return carregar(salvo ? JSON.parse(salvo) : null);
    } catch {
      return carregar(null);
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(chave, JSON.stringify(valor));
    } catch {
      // sem armazenamento, vale só para esta sessão
    }
  }, [chave, valor]);
  return [valor, setValor] as const;
}

function ler<T>(chave: string): T | null {
  try {
    const salvo = localStorage.getItem(chave);
    return salvo ? (JSON.parse(salvo) as T) : null;
  } catch {
    return null;
  }
}

/** Devolve false quando o aparelho não deixou guardar (sem espaço, navegação anônima…). */
function gravar(chave: string, valor: unknown) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

const geralDe = (salvo: Partial<Geral> | null): Geral => ({
  materiais: (salvo?.materiais ?? materiaisPadrao).map((m) => ({ ...m, cor: m.cor ?? corPadrao(m.veio) })),
  ajustes: migrarAjustes(salvo?.ajustes),
  proximoCodigo: salvo?.proximoCodigo ?? 1,
});

/** Nome, telefone, logo e condições são da empresa: valem em todos os orçamentos, mesmo nos enviados. */
const dadosDaEmpresa = ({ empresa, telefone, condicoes, logo }: Ajustes) => ({ empresa, telefone, condicoes, logo });

/** Junta o orçamento guardado com as chapas e os ajustes do Geral, ou com os preços congelados no envio. */
export function abrirOrcamento(o: OrcamentoSalvo, geral: Geral): Projeto {
  const { precos, ...resto } = o;
  return {
    ...migrar(resto),
    materiais: precos?.materiais ?? geral.materiais,
    ajustes: precos ? { ...migrarAjustes(precos.ajustes), ...dadosDaEmpresa(geral.ajustes) } : geral.ajustes,
  };
}

/** Separa o projeto em orçamento guardado e Geral; o Geral só muda (de referência) quando algo dele mudou. */
function guardar(p: Projeto, antes: Projeto, geral: Geral): { orcamento: OrcamentoSalvo; geral: Geral } {
  const { materiais, ajustes, ...orcamento } = p;
  const empresa = dadosDaEmpresa(ajustes);
  const mudouEmpresa = (Object.keys(empresa) as (keyof typeof empresa)[]).some((k) => empresa[k] !== geral.ajustes[k]);
  const soEmpresa = mudouEmpresa ? { ...geral, ajustes: { ...geral.ajustes, ...empresa } } : geral;

  if (p.situacao !== 'rascunho') {
    return { orcamento: { ...orcamento, precos: { materiais, ajustes: { ...ajustes, logo: '' } } }, geral: soEmpresa };
  }
  // voltando para rascunho, os preços congelados não substituem os de hoje
  if (antes.situacao !== 'rascunho') return { orcamento, geral: soEmpresa };
  if (materiais === geral.materiais && ajustes === geral.ajustes) return { orcamento, geral };
  return { orcamento, geral: { ...geral, materiais, ajustes } };
}

interface Estado {
  orcamentos: OrcamentoSalvo[];
  geral: Geral;
  abertoId: string | null;
}

function carregar(): Estado {
  const ids = ler<string[]>(CHAVE_INDICE);
  if (ids) {
    return {
      orcamentos: ids.map((id) => ler<OrcamentoSalvo>(chaveOrcamento(id))).filter((o): o is OrcamentoSalvo => o !== null),
      geral: geralDe(ler<Geral>(CHAVE_GERAL)),
      abertoId: ler<string>(CHAVE_ABERTO),
    };
  }
  // primeira vez com a lista: as chapas e os ajustes do projeto antigo viram os do Geral
  const antigo = ler<Partial<Projeto>>(CHAVE_PROJETO);
  if (!antigo) return { orcamentos: [], geral: geralDe(null), abertoId: null };
  const { materiais, ajustes, ...orcamento } = migrar(antigo);
  const temConteudo = orcamento.cliente !== '' || orcamento.modulos.length > 0;
  return {
    orcamentos: temConteudo ? [orcamento] : [],
    geral: geralDe({ materiais, ajustes, proximoCodigo: temConteudo ? 2 : 1 }),
    abertoId: temConteudo ? orcamento.id : null,
  };
}

/** Novo número para cópia ou orçamento novo; os preços voltam a ser os de hoje. */
function comoNovo(o: OrcamentoSalvo, codigo: number): OrcamentoSalvo {
  const { precos, ...resto } = o;
  return { ...resto, id: novoId(), codigo, situacao: 'rascunho', criadoEm: agora(), atualizadoEm: agora(), enviadoEm: null };
}

/** Todos os orçamentos do aparelho, com o que está aberto já pronto para usar. */
export function useOrcamentos() {
  const [estado, setEstado] = useState(carregar);
  const [semEspaco, setSemEspaco] = useState(false);
  const gravado = useRef<Estado | null>(null);

  // grava só o que mudou: cada orçamento tem sua chave, então mexer em um não regrava os outros
  useEffect(() => {
    const antes = gravado.current;
    gravado.current = estado;
    let ok = true;
    if (antes?.geral !== estado.geral) ok = gravar(CHAVE_GERAL, estado.geral) && ok;
    if (antes?.orcamentos !== estado.orcamentos) {
      const velhos = new Map((antes?.orcamentos ?? []).map((o) => [o.id, o]));
      for (const o of estado.orcamentos) {
        if (velhos.get(o.id) !== o) ok = gravar(chaveOrcamento(o.id), o) && ok;
        velhos.delete(o.id);
      }
      for (const id of velhos.keys()) localStorage.removeItem(chaveOrcamento(id));
      ok = gravar(CHAVE_INDICE, estado.orcamentos.map((o) => o.id)) && ok;
      if (!antes && ok) localStorage.removeItem(CHAVE_PROJETO);
    }
    if (antes?.abertoId !== estado.abertoId) gravar(CHAVE_ABERTO, estado.abertoId);
    setSemEspaco(!ok);
  }, [estado]);

  const aberto = estado.orcamentos.find((o) => o.id === estado.abertoId);
  const { geral } = estado;
  const projeto = useMemo(() => (aberto ? abrirOrcamento(aberto, geral) : null), [aberto, geral]);

  const atualizar = useCallback(
    (parcial: Partial<Projeto>) =>
      setEstado((e) => {
        const atual = e.orcamentos.find((o) => o.id === e.abertoId);
        if (!atual) return e;
        const antes = abrirOrcamento(atual, e.geral);
        const depois: Projeto = { ...antes, ...parcial, atualizadoEm: agora() };
        if (depois.situacao === 'rascunho') depois.enviadoEm = null;
        else if (antes.situacao === 'rascunho') depois.enviadoEm = agora();
        const { orcamento, geral } = guardar(depois, antes, e.geral);
        return { ...e, geral, orcamentos: e.orcamentos.map((o) => (o.id === orcamento.id ? orcamento : o)) };
      }),
    [],
  );

  const abrir = useCallback((id: string | null) => setEstado((e) => ({ ...e, abertoId: id })), []);

  const novo = useCallback(
    () =>
      setEstado((e) => {
        const { materiais, ajustes, ...vazio } = projetoNovo();
        const o = comoNovo(vazio, e.geral.proximoCodigo);
        return { orcamentos: [o, ...e.orcamentos], geral: { ...e.geral, proximoCodigo: o.codigo + 1 }, abertoId: o.id };
      }),
    [],
  );

  const duplicar = useCallback(
    (id: string) =>
      setEstado((e) => {
        const original = e.orcamentos.find((o) => o.id === id);
        if (!original) return e;
        const o = { ...comoNovo(original, e.geral.proximoCodigo), precoFinal: null };
        return { orcamentos: [o, ...e.orcamentos], geral: { ...e.geral, proximoCodigo: o.codigo + 1 }, abertoId: o.id };
      }),
    [],
  );

  const excluir = useCallback(
    (id: string) =>
      setEstado((e) => ({
        ...e,
        orcamentos: e.orcamentos.filter((o) => o.id !== id),
        abertoId: e.abertoId === id ? null : e.abertoId,
      })),
    [],
  );

  return { orcamentos: estado.orcamentos, geral, projeto, semEspaco, atualizar, abrir, novo, duplicar, excluir };
}

/** Modelos de módulos salvos pelo marceneiro, reaproveitados entre projetos. */
export const useBiblioteca = () =>
  useArmazenado<Modulo[]>(CHAVE_BIBLIOTECA, (salvo) => (Array.isArray(salvo) ? (salvo as Modulo[]).map(migrarModulo) : []));

export const novoId = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

export const salvarNaLista = <T extends { id: string }>(lista: T[], item: T) =>
  lista.some((x) => x.id === item.id) ? lista.map((x) => (x.id === item.id ? item : x)) : [...lista, item];

export const removerDaLista = <T extends { id: string }>(lista: T[], id: string) =>
  lista.filter((x) => x.id !== id);
