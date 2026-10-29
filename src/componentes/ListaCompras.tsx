import { createPortal } from 'react-dom';
import type { ItemCompra, ListaCompras } from '../calculo';
import type { Projeto } from '../types';
import { fmtNum, fmtReais } from '../unidades';

const grupos = (l: ListaCompras): [string, ItemCompra[]][] =>
  (
    [
      ['Chapas', l.chapas],
      ['Fita de borda', l.fitas],
      ['Ferragens', l.ferragens],
    ] as [string, ItemCompra[]][]
  ).filter(([, itens]) => itens.length > 0);

const quantidade = (x: ItemCompra) => (x.unidade === 'm' ? `${fmtNum(x.qtd)} m` : `${fmtNum(x.qtd, 2)}×`);

/** Mensagem para o fornecedor: só o que comprar, sem os preços. */
function textoParaFornecedor(projeto: Projeto, lista: ListaCompras) {
  const linhas = [`*Lista de compras – orçamento nº ${projeto.codigo}${projeto.cliente ? ` (${projeto.cliente})` : ''}*`];
  for (const [titulo, itens] of grupos(lista)) {
    linhas.push('', `*${titulo}*`);
    for (const x of itens) linhas.push(`• ${quantidade(x)} ${x.nome}${x.detalhe ? ` – ${x.detalhe}` : ''}`);
  }
  return linhas.join('\n');
}

interface Props {
  projeto: Projeto;
  lista: ListaCompras;
  aoFechar: () => void;
}

/** O que comprar para o orçamento enviado, com o valor de cada item pelos preços cadastrados. */
export function ListaDeCompras({ projeto, lista, aoFechar }: Props) {
  return createPortal(
    <div className="documento-fundo">
      <div className="documento-barra">
        <button className="btn" onClick={aoFechar}>
          ← Voltar
        </button>
        <button className="btn btn-principal" onClick={() => window.print()}>
          Imprimir
        </button>
      </div>

      <article className="documento">
        <h1>Lista de compras</h1>
        <p className="doc-info">
          <span>
            Orçamento nº {projeto.codigo}
            {projeto.cliente && (
              <>
                {' '}
                · <strong>{projeto.cliente}</strong>
              </>
            )}
          </span>
        </p>

        {grupos(lista).map(([titulo, itens]) => (
          <section key={titulo}>
            <h2>{titulo}</h2>
            <ul className="doc-itens">
              {itens.map((x) => (
                <li key={`${x.nome}|${x.detalhe}|${x.total}`}>
                  <span>
                    <strong>
                      {quantidade(x)} {x.nome}
                    </strong>
                    {x.detalhe && <small>{x.detalhe}</small>}
                  </span>
                  <span>{fmtReais(x.total)}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <div className="doc-total">
          <span>Total estimado</span>
          <strong>{fmtReais(lista.total)}</strong>
        </div>
        <p className="doc-condicoes">Pelos preços cadastrados no app. A fita está arredondada para cima, em metros inteiros.</p>
      </article>

      <div className="documento-barra">
        <a
          className="btn btn-whats largo"
          href={`https://wa.me/?text=${encodeURIComponent(textoParaFornecedor(projeto, lista))}`}
          target="_blank"
          rel="noreferrer"
        >
          Mandar a lista no WhatsApp
        </a>
      </div>
    </div>,
    document.body,
  );
}
