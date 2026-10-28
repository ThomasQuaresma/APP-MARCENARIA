import { useState } from 'react';
import { EditorMaterial } from '../componentes/editores';
import { novoId, removerDaLista, salvarNaLista } from '../estado';
import type { Material, Projeto } from '../types';
import { fmtDim, fmtReais } from '../unidades';

interface Props {
  projeto: Projeto;
  atualizar: (parcial: Partial<Projeto>) => void;
}

export function AbaChapas({ projeto, atualizar }: Props) {
  const { materiais, ajustes } = projeto;
  const [edicao, setEdicao] = useState<{ item: Material; novo: boolean } | null>(null);

  return (
    <>
      <div className="secao-topo">
        <h2>Chapas</h2>
        <button
          className="btn btn-principal"
          onClick={() =>
            setEdicao({
              novo: true,
              item: { id: novoId(), nome: 'Nova chapa', comprimento: 2750, largura: 1830, espessura: 18, preco: 0, veio: false, cor: '#f4f1ec' },
            })
          }
        >
          + Chapa
        </button>
      </div>
      <p className="dica">Cadastre as chapas que você usa, com o preço que paga hoje. O app calcula quantas chapas o projeto gasta para o orçamento.</p>
      {materiais.map((m) => (
        <button key={m.id} className="item" onClick={() => setEdicao({ item: m, novo: false })}>
          <strong>{m.nome}</strong>
          <span>{fmtReais(m.preco)}</span>
          <small>
            {fmtDim(m.comprimento, m.largura, ajustes.unidade)} · {m.espessura} mm{m.veio ? ' · com veio' : ''}
          </small>
        </button>
      ))}

      {edicao && (
        <EditorMaterial
          inicial={edicao.item}
          novo={edicao.novo}
          ajustes={ajustes}
          aoFechar={() => setEdicao(null)}
          aoSalvar={(m) => {
            atualizar({ materiais: salvarNaLista(materiais, m) });
            setEdicao(null);
          }}
          aoExcluir={(id) => {
            atualizar({ materiais: removerDaLista(materiais, id) });
            setEdicao(null);
          }}
        />
      )}
    </>
  );
}
