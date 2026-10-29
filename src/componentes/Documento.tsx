import { lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { descricao, medidasTexto, zonasDeCanto } from '../modulos';
import type { Projeto } from '../types';
import { fmtData, fmtReais } from '../unidades';
import { DesenhoMovel } from './DesenhoMovel';

// o 3D é pesado: só baixa quando o orçamento é aberto
const Movel3D = lazy(() => import('./Movel3D'));

/** O que entra na lista do cliente: equipamentos (cuba, TV…) só ilustram o desenho. */
const itensVendidos = (p: Projeto) => p.modulos.filter((m) => m.tipo !== 'objeto');

/** Mensagem do orçamento para mandar ao cliente pelo WhatsApp. */
export function textoParaCliente(projeto: Projeto, preco: number) {
  const a = projeto.ajustes;
  const linhas = [`*Orçamento nº ${projeto.codigo}${a.empresa ? ` – ${a.empresa}` : ''}*`];
  if (projeto.cliente) linhas.push(`Cliente: ${projeto.cliente}`);
  linhas.push('');
  for (const m of itensVendidos(projeto)) {
    linhas.push(`• ${m.nome}: ${medidasTexto(m, a.unidade)} (${descricao(m, projeto.materiais)})`);
  }
  linhas.push('', `*Valor total: ${fmtReais(preco)}*`);
  if (a.condicoes.trim()) linhas.push('', a.condicoes.trim());
  return linhas.join('\n');
}

interface Props {
  projeto: Projeto;
  preco: number;
  aoFechar: () => void;
}

/** Orçamento do jeito que o cliente vê. "Imprimir" também salva em PDF. */
export function DocumentoOrcamento({ projeto, preco, aoFechar }: Props) {
  const a = projeto.ajustes;
  // enviado, vale a data do envio (a validade conta dela); rascunho sai com a data de hoje
  const data = fmtData(projeto.enviadoEm ?? new Date().toISOString());

  return createPortal(
    <div className="documento-fundo">
      <div className="documento-barra">
        <button className="btn" onClick={aoFechar}>
          ← Voltar
        </button>
        <button className="btn btn-principal" onClick={() => window.print()}>
          Imprimir / salvar PDF
        </button>
      </div>
      {!a.empresa && <p className="alerta documento-aviso">Coloque o nome e a logo da sua empresa na aba Ajustes.</p>}

      <article className="documento">
        <header>
          {a.logo && <img src={a.logo} alt="" />}
          <div>
            <strong>{a.empresa || 'Sua empresa'}</strong>
            {a.telefone && <span>{a.telefone}</span>}
          </div>
        </header>

        <h1>Orçamento nº {projeto.codigo}</h1>
        <p className="doc-info">
          <span>
            Cliente: <strong>{projeto.cliente || '—'}</strong>
          </span>
          <span>Data: {data}</span>
        </p>

        <Suspense fallback={<p className="dica">Carregando o desenho em 3D…</p>}>
          <Movel3D
            projeto={projeto}
            reserva={projeto.paredes.map((parede) => (
              <DesenhoMovel
                key={parede.id}
                modulos={projeto.modulos.filter((m) => m.paredeId === parede.id)}
                materiais={projeto.materiais}
                parede={parede}
                zonas={zonasDeCanto(projeto, parede.id)}
                unidade={a.unidade}
              />
            ))}
          />
        </Suspense>

        <h2>Itens</h2>
        <ul className="doc-itens">
          {itensVendidos(projeto).map((m) => (
            <li key={m.id}>
              <span>
                <strong>{m.nome}</strong>
                <small>
                  {descricao(m, projeto.materiais)}
                  {projeto.paredes.length > 1 && ` · ${projeto.paredes.find((p) => p.id === m.paredeId)?.nome ?? ''}`}
                </small>
              </span>
              <span>{medidasTexto(m, a.unidade)}</span>
            </li>
          ))}
        </ul>

        <div className="doc-total">
          <span>Valor total</span>
          <strong>{fmtReais(preco)}</strong>
        </div>

        {a.condicoes.trim() && <p className="doc-condicoes">{a.condicoes.trim()}</p>}
      </article>
    </div>,
    document.body,
  );
}
