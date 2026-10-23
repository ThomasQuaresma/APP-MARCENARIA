import { useEffect, useState } from 'react';
import type { Ajustes, Ambiente, Extras, Material, Modulo, Parede, Projeto } from './types';

const CHAVE_PROJETO = 'marcenaria:projeto:v1';
const CHAVE_BIBLIOTECA = 'marcenaria:biblioteca:v1';

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
  precoCorredica: 35,
  precoPuxador: 15,
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

/** Completa projetos salvos por versões anteriores do app. */
function migrar(p: Partial<Projeto> & { parede?: { largura: number; altura: number } }): Projeto {
  let proximoX = 0;
  // versões anteriores tinham uma parede só, sem id
  const { parede: antiga, ...resto } = p;
  const paredes = p.paredes?.length ? p.paredes : [{ ...novaParede(1), ...antiga }];
  return {
    ...projetoNovo(),
    ...resto,
    ajustes: { ...ajustesPadrao, ...p.ajustes },
    extras: { ...extrasZerados, ...p.extras },
    ambiente: { ...ambientePadrao, ...p.ambiente },
    paredes,
    materiais: (p.materiais ?? materiaisPadrao).map((m) => ({ ...m, cor: m.cor ?? corPadrao(m.veio) })),
    modulos: (p.modulos ?? []).map((m) => {
      const novo: Modulo = {
        ...m,
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
  useArmazenado<Modulo[]>(CHAVE_BIBLIOTECA, (salvo) => (Array.isArray(salvo) ? (salvo as Modulo[]) : []));

export const novoId = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

export const salvarNaLista = <T extends { id: string }>(lista: T[], item: T) =>
  lista.some((x) => x.id === item.id) ? lista.map((x) => (x.id === item.id ? item : x)) : [...lista, item];

export const removerDaLista = <T extends { id: string }>(lista: T[], id: string) =>
  lista.filter((x) => x.id !== id);
