import { useMemo, useState } from 'react';
import { calcular, precoDe } from '../calculo';
import { CampoTexto, Linha } from '../componentes/campos';
import { abrirOrcamento, situacoes } from '../estado';
import type { Geral, OrcamentoSalvo, Situacao } from '../types';
import { fmtData, fmtReais } from '../unidades';

interface Props {
  orcamentos: OrcamentoSalvo[];
  geral: Geral;
  aoAbrir: (id: string) => void;
  aoCriar: () => void;
}

type Ordem = 'recentes' | 'antigos' | 'maior' | 'menor';

const ordens: { valor: Ordem; texto: string }[] = [
  { valor: 'recentes', texto: 'Mais recentes' },
  { valor: 'antigos', texto: 'Mais antigos' },
  { valor: 'maior', texto: 'Maior valor' },
  { valor: 'menor', texto: 'Menor valor' },
];

const semAcento = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Todos os orçamentos guardados, com busca por número, cliente, data ou valor e filtro pela situação. */
export function ListaOrcamentos({ orcamentos, geral, aoAbrir, aoCriar }: Props) {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Situacao | 'todos'>('todos');
  const [ordem, setOrdem] = useState<Ordem>('recentes');

  // o valor sai do mesmo cálculo da aba Orçamento (chapas, fita, ferragens e custos)
  const linhas = useMemo(
    () =>
      orcamentos.map((o) => {
        const p = abrirOrcamento(o, geral);
        const valor = precoDe(p, calcular(p));
        const texto = semAcento([o.codigo, o.cliente, fmtData(o.criadoEm), fmtReais(valor)].join(' '));
        return { o, valor, texto };
      }),
    [orcamentos, geral],
  );

  const termo = semAcento(busca.trim());
  const visiveis = linhas
    .filter((x) => (filtro === 'todos' || x.o.situacao === filtro) && (!termo || x.texto.includes(termo)))
    .sort((a, b) => {
      if (ordem === 'maior') return b.valor - a.valor;
      if (ordem === 'menor') return a.valor - b.valor;
      const porData = a.o.criadoEm.localeCompare(b.o.criadoEm) || a.o.codigo - b.o.codigo;
      return ordem === 'antigos' ? porData : -porData;
    });
  const soma = visiveis.reduce((s, x) => s + x.valor, 0);
  const quantos = (s: Situacao | 'todos') => linhas.filter((x) => s === 'todos' || x.o.situacao === s).length;

  return (
    <>
      <div className="secao-topo">
        <h2>Orçamentos</h2>
        <button className="btn btn-principal" onClick={aoCriar}>
          + Novo
        </button>
      </div>

      {orcamentos.length === 0 ? (
        <p className="vazio">Nenhum orçamento ainda. Toque em "+ Novo" para começar.</p>
      ) : (
        <>
          <Linha>
            <CampoTexto rotulo="Buscar" valor={busca} aoMudar={setBusca} dica="Nº, cliente, data ou valor" />
            <label className="campo">
              <span>Ordenar</span>
              <div className="campo-caixa">
                <select value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)}>
                  {ordens.map((o) => (
                    <option key={o.valor} value={o.valor}>
                      {o.texto}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          </Linha>

          <div className="filtro-situacao">
            {[{ valor: 'todos' as const, texto: 'Todos' }, ...situacoes].map((s) => (
              <button key={s.valor} className={s.valor === filtro ? 'ativo' : ''} onClick={() => setFiltro(s.valor)}>
                {s.texto} ({quantos(s.valor)})
              </button>
            ))}
          </div>

          {visiveis.length === 0 && <p className="vazio">Nenhum orçamento encontrado.</p>}
          {visiveis.map(({ o, valor }) => {
            const itens = o.modulos.filter((m) => m.tipo !== 'objeto').length;
            return (
              <button key={o.id} className="item orcamento-item" onClick={() => aoAbrir(o.id)}>
                <span className="orcamento-linha">
                  <strong>
                    Nº {o.codigo} · {o.cliente || 'Sem nome'}
                  </strong>
                  <span className={`selo situacao-${o.situacao}`}>{situacoes.find((s) => s.valor === o.situacao)?.texto}</span>
                </span>
                <span className="orcamento-linha">
                  <small>
                    {fmtData(o.criadoEm)} · {itens} {itens === 1 ? 'item' : 'itens'}
                  </small>
                  <strong>{fmtReais(valor)}</strong>
                </span>
              </button>
            );
          })}
          {visiveis.length > 1 && (
            <p className="dica">
              {visiveis.length} orçamentos somam {fmtReais(soma)}.
            </p>
          )}
        </>
      )}
    </>
  );
}
