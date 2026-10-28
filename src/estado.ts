import { useEffect, useState } from 'react';
import type { Ajustes, Ambiente, Extras, ItemKit, Material, Modulo, Parede, Projeto, Vao } from './types';

const CHAVE_PROJETO = 'marcenaria:projeto:v1';
const CHAVE_BIBLIOTECA = 'marcenaria:biblioteca:v1';

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

export const novaParede = (numero: number): Parede => ({ id: `parede-${numero}`, nome: `Parede ${numero}`, largura: 3000, altura: 2600 });

export const ambientePadrao: Ambiente = { corParede: '#f2ede6', piso: 'porcelanato' };

const corPadrao = (veio: boolean) => (veio ? '#b98a5a' : '#f4f1ec');

export const materiaisPadrao: Material[] = [
  { id: 'mdf-branco-18', nome: 'MDF Branco 18mm', comprimento: 2750, largura: 1830, espessura: 18, preco: 250, veio: false, cor: '#f4f1ec' },
  { id: 'mdf-madeirado-18', nome: 'MDF Amadeirado 18mm', comprimento: 2750, largura: 1830, espessura: 18, preco: 380, veio: true, cor: '#b98a5a' },
  { id: 'mdf-branco-6', nome: 'MDF Branco 6mm (fundo)', comprimento: 2750, largura: 1830, espessura: 6, preco: 110, veio: false, cor: '#ece7df' },
];

export const projetoNovo = (): Projeto => ({
  cliente: '',
  paredes: [novaParede(1)],
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
  const paredes = p.paredes?.length ? p.paredes : [{ ...novaParede(1), ...antiga }];
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

export const useProjeto = () =>
  useArmazenado<Projeto>(CHAVE_PROJETO, (salvo) => (salvo ? migrar(salvo as Partial<Projeto>) : projetoNovo()));

/** Modelos de módulos salvos pelo marceneiro, reaproveitados entre projetos. */
export const useBiblioteca = () =>
  useArmazenado<Modulo[]>(CHAVE_BIBLIOTECA, (salvo) => (Array.isArray(salvo) ? (salvo as Modulo[]).map(migrarModulo) : []));

export const novoId = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

export const salvarNaLista = <T extends { id: string }>(lista: T[], item: T) =>
  lista.some((x) => x.id === item.id) ? lista.map((x) => (x.id === item.id ? item : x)) : [...lista, item];

export const removerDaLista = <T extends { id: string }>(lista: T[], id: string) =>
  lista.filter((x) => x.id !== id);
